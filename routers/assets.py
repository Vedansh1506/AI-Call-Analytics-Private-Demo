import mimetypes
import os, io, uuid, filetype
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from html import escape
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from rapidfuzz import fuzz
from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session
from background_services.tasks import process_asset_task
from models.model import ApiResponses, AssetFile
from routers.auth import _require_csrf, get_current_user
from utils.config import SUPPORTED_LANGUAGES
from utils.database import get_db
from utils.logger import get_logger
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_FILES_PER_REQUEST = 10
ALLOWED_MIME_TYPES = {"audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg","audio/mp4", "audio/webm", "video/mp4", "video/webm",}
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".webm"}

logger = get_logger(__name__)

UPLOAD_DIR = "uploads/audio"

router = APIRouter(prefix="/assets", tags=["Assets"])

def _seconds_to_hms(seconds: int | None) -> str:
    if seconds is None:
        return "N/A"
    sec = max(0, int(seconds))
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def _ms_to_hms(ms: int | None) -> str:
    if ms is None:
        return "N/A"
    total = max(0, int(ms))
    h = total // 3600000
    m = (total % 3600000) // 60000
    s = (total % 60000) // 1000
    return f"{h:02d}:{m:02d}:{s:02d}"


def _display_name(user) -> str:
    first = (getattr(user, "first_name", "") or "").strip()
    last = (getattr(user, "last_name", "") or "").strip()
    full = f"{first} {last}".strip()
    return full or "N/A"


def _register_pdf_fonts() -> dict[str, str]:
    fonts = {
        "regular": "Helvetica",
        "bold": "Helvetica-Bold",
        "arabic": "Helvetica",
        "hebrew": "Helvetica",
        "devanagari": "Helvetica",
        "gujarati": "Helvetica",
        "tamil": "Helvetica",
        "cjk_sc": "STSong-Light",
        "cjk_jp": "HeiseiMin-W3",
        "cjk_kr": "HYSMyeongJo-Medium",
    }

    for cid in ("STSong-Light", "HeiseiMin-W3", "HYSMyeongJo-Medium"):
        try:
            pdfmetrics.getFont(cid)
        except KeyError:
            try:
                pdfmetrics.registerFont(UnicodeCIDFont(cid))
            except Exception:
                pass

    candidates = {
        "regular": [
            os.path.join("assets", "fonts", "NotoSans-Regular.ttf"),
            os.path.join("assets", "fonts", "DejaVuSans.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
        ],
        "bold": [
            os.path.join("assets", "fonts", "NotoSans-Bold.ttf"),
            os.path.join("assets", "fonts", "DejaVuSans-Bold.ttf"),
            r"C:\Windows\Fonts\arialbd.ttf",
        ],
        "arabic": [
            os.path.join("assets", "fonts", "NotoSansArabic-Regular.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
        ],
        "hebrew": [
            os.path.join("assets", "fonts", "NotoSansHebrew-Regular.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
        ],
        "devanagari": [
            os.path.join("assets", "fonts", "NotoSansDevanagari-Regular.ttf"),
            r"C:\Windows\Fonts\mangal.ttf",
        ],
        "gujarati": [
            os.path.join("assets", "fonts", "NotoSansGujarati-Regular.ttf"),
            r"C:\Windows\Fonts\shruti.ttf",
        ],
        "tamil": [
            os.path.join("assets", "fonts", "NotoSansTamil-Regular.ttf"),
            r"C:\Windows\Fonts\latha.ttf",
        ],
    }

    for key, paths in candidates.items():
        found = next((p for p in paths if os.path.exists(p)), None)
        if not found:
            continue
        font_name = f"Report_{key}"
        try:
            pdfmetrics.getFont(font_name)
            fonts[key] = font_name
        except KeyError:
            try:
                pdfmetrics.registerFont(TTFont(font_name, found))
                fonts[key] = font_name
            except Exception:
                pass
    return fonts


def _flatten_pairs(data, prefix: str = "") -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    if isinstance(data, dict):
        for k, v in data.items():
            key = f"{prefix}.{k}" if prefix else str(k)
            rows.extend(_flatten_pairs(v, key))
    elif isinstance(data, list):
        for item in data:
            rows.extend(_flatten_pairs(item, prefix))
    else:
        rows.append((prefix or "Details", str(data)))
    return rows


def _normalize_structured_item(item) -> list[tuple[str, str]]:
    if isinstance(item, dict) and "Key" in item and "Value" in item:
        return [(str(item["Key"]), str(item["Value"]))]
    if isinstance(item, dict):
        out: list[tuple[str, str]] = []
        for k, v in item.items():
            if isinstance(v, (dict, list)):
                out.extend(_flatten_pairs(v, str(k)))
            else:
                out.append((str(k), str(v)))
        return out
    return [("Details", str(item))]


def _structured_bullet_lines(data, depth: int = 0) -> list[tuple[int, str]]:
    lines: list[tuple[int, str]] = []
    if isinstance(data, dict):
        if "Key" in data and "Value" in data:
            key = str(data.get("Key", "")).strip() or "Details"
            value = data.get("Value")
            if isinstance(value, (dict, list)):
                lines.append((depth, key))
                lines.extend(_structured_bullet_lines(value, depth + 1))
            else:
                lines.append((depth, f"{key} - {value}"))
            return lines

        for k, v in data.items():
            k_text = str(k)
            if isinstance(v, (dict, list)):
                lines.append((depth, k_text))
                lines.extend(_structured_bullet_lines(v, depth + 1))
            else:
                lines.append((depth, f"{k_text} - {v}"))
        return lines

    if isinstance(data, list):
        for item in data:
            lines.extend(_structured_bullet_lines(item, depth))
        return lines

    lines.append((depth, str(data)))
    return lines


def _pick_font(text: str, fonts: dict[str, str]) -> str:
    for ch in (text or ""):
        cp = ord(ch)
        if 0x0600 <= cp <= 0x06FF:
            return fonts["arabic"]
        if 0x0590 <= cp <= 0x05FF:
            return fonts["hebrew"]
        if 0x0900 <= cp <= 0x097F:
            return fonts["devanagari"]
        if 0x0A80 <= cp <= 0x0AFF:
            return fonts["gujarati"]
        if 0x0B80 <= cp <= 0x0BFF:
            return fonts["tamil"]
        if 0x4E00 <= cp <= 0x9FFF:
            return fonts["cjk_sc"]
        if 0x3040 <= cp <= 0x30FF:
            return fonts["cjk_jp"]
        if 0xAC00 <= cp <= 0xD7AF:
            return fonts["cjk_kr"]
    return fonts["regular"]


def _make_para_style(base_name: str, styles, text: str, fonts: dict[str, str]) -> ParagraphStyle:
    return ParagraphStyle(
        f"{base_name}_{_pick_font(text, fonts)}",
        parent=styles[base_name],
        fontName=_pick_font(text, fonts),
    )


def _p(text: str, styles, base_name: str, fonts: dict[str, str]) -> Paragraph:
    raw = str(text or "")
    style = _make_para_style(base_name, styles, raw, fonts)
    return Paragraph(escape(raw).replace("\n", "<br/>"), style)


def _trim_story(story: list) -> None:
    while story and isinstance(story[-1], (Spacer, PageBreak)):
        story.pop()


def _speaker_color_map(utterances: list[dict]) -> dict[str, tuple[colors.Color, colors.Color]]:
    palette = [
        (colors.HexColor("#DBEAFE"), colors.HexColor("#1D4ED8")),
        (colors.HexColor("#DCFCE7"), colors.HexColor("#15803D")),
        (colors.HexColor("#FEF3C7"), colors.HexColor("#B45309")),
        (colors.HexColor("#FEE2E2"), colors.HexColor("#B91C1C")),
        (colors.HexColor("#F3E8FF"), colors.HexColor("#7E22CE")),
        (colors.HexColor("#FCE7F3"), colors.HexColor("#BE185D")),
    ]
    seen: dict[str, tuple[colors.Color, colors.Color]] = {}
    idx = 0
    for u in utterances:
        sid = str(u.get("speaker_id") or "unknown")
        if sid not in seen:
            seen[sid] = palette[idx % len(palette)]
            idx += 1
    if "unknown" not in seen:
        seen["unknown"] = (colors.HexColor("#E5E7EB"), colors.HexColor("#374151"))
    return seen


def _styles(regular_font: str, bold_font: str):
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleX",
            parent=styles["Title"],
            fontName=bold_font,
            fontSize=26,
            leading=30,
            textColor=colors.white,
            alignment=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Subtle",
            parent=styles["Normal"],
            fontName=regular_font,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748B"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverMeta",
            parent=styles["Normal"],
            fontName=regular_font,
            fontSize=11,
            leading=15,
            textColor=colors.white,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSub",
            parent=styles["Normal"],
            fontName=regular_font,
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#CBD5E1"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="H2",
            parent=styles["Heading2"],
            fontName=bold_font,
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#111827"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyX",
            parent=styles["BodyText"],
            fontName=regular_font,
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#0F172A"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyBold",
            parent=styles["BodyText"],
            fontName=bold_font,
            fontSize=10.5,
            leading=14,
            textColor=colors.HexColor("#111827"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Pill",
            parent=styles["BodyText"],
            fontName=bold_font,
            fontSize=10,
            leading=13,
            textColor=colors.white,
            alignment=1,
        )
    )
    return styles


def _section_header(title: str, styles) -> Table:
    t = Table([[Paragraph(title, styles["Pill"])]], colWidths=[170])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#4F46E5")),
                ("BOX", (0, 0), (0, 0), 0, colors.HexColor("#4F46E5")),
                ("ALIGN", (0, 0), (0, 0), "CENTER"),
                ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 10),
                ("RIGHTPADDING", (0, 0), (0, 0), 10),
                ("TOPPADDING", (0, 0), (0, 0), 6),
                ("BOTTOMPADDING", (0, 0), (0, 0), 6),
            ]
        )
    )
    return t


def _cover_block(title: str, subtitle: str, meta_lines: list[str], styles) -> Table:
    rows = [[Paragraph(title, styles["TitleX"])]]
    if subtitle and subtitle.strip():
        rows.append([Paragraph(subtitle, styles["CoverSub"])])
    for line in meta_lines:
        rows.append([Paragraph(line, styles["CoverMeta"])])
    t = Table(rows, colWidths=[170 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0B1739")),
                ("BOX", (0, 0), (-1, -1), 0, colors.HexColor("#0B1739")),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def _participants_data(utterances: list[dict]) -> list[dict]:
    by_speaker: dict[str, dict] = {}
    for u in utterances:
        sid = str(u.get("speaker_id") or "unknown")
        role = str(u.get("role") or "N/A")
        item = by_speaker.setdefault(sid, {"speaker_id": sid, "role": role})
        if (item.get("role") == "N/A") and role != "N/A":
            item["role"] = role
    return list(by_speaker.values())


def _format_sentiment_timeline(rows: list[dict], styles):
    out = []
    color_map = {
        "positive": colors.HexColor("#DCFCE7"),
        "negative": colors.HexColor("#FEE2E2"),
        "neutral": colors.HexColor("#E5E7EB"),
    }
    border_map = {
        "positive": colors.HexColor("#16A34A"),
        "negative": colors.HexColor("#DC2626"),
        "neutral": colors.HexColor("#6B7280"),
    }
    for row in rows:
        sent = str(row.get("sentiment", "neutral")).lower()
        text = str(row.get("text", ""))
        bg = color_map.get(sent, colors.HexColor("#E5E7EB"))
        border = border_map.get(sent, colors.HexColor("#6B7280"))
        label = sent.capitalize()
        box = Table(
            [
                [Paragraph(f"<b>{label}</b>", styles["BodyBold"])],
                [Paragraph(text, styles["BodyX"])],
            ],
            colWidths=[168 * mm],
        )
        box.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), bg),
                    ("BOX", (0, 0), (-1, -1), 1, border),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        out.extend([box, Spacer(1, 4)])
    return out


def _talktime_chart(talk_map: dict):
    if not talk_map:
        return None, []
    labels = [str(k) for k in talk_map.keys()]
    values = [max(1, int(v / 1000)) for v in talk_map.values()]
    drawing = Drawing(250, 190)
    pie = Pie()
    pie.x = 30
    pie.y = 30
    pie.width = 120
    pie.height = 120
    pie.data = values
    pie.labels = [f"S{i+1}" for i in range(len(labels))]
    pie.sideLabels = True
    palette = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#0891B2"]
    legend = []
    for i, (label, val) in enumerate(zip(labels, values)):
        pie.slices[i].fillColor = colors.HexColor(palette[i % len(palette)])
        legend.append((f"S{i+1} ({label})", _seconds_to_hms(val)))
    drawing.add(pie)
    return drawing, legend


def _keyword_chart(keyword_counts: dict, label_font: str):
    items = sorted(keyword_counts.items(), key=lambda kv: kv[1], reverse=True)[:8] if keyword_counts else []
    if not items:
        return None
    drawing = Drawing(300, 210)
    chart = VerticalBarChart()
    chart.x = 35
    chart.y = 45
    chart.height = 130
    chart.width = 240
    chart.data = [[int(v) for _, v in items]]
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueStep = max(1, int(max(v for _, v in items) / 5) or 1)
    chart.categoryAxis.categoryNames = [str(k)[:14] for k, _ in items]
    chart.categoryAxis.labels.angle = 25
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.categoryAxis.labels.fontName = label_font
    chart.valueAxis.labels.fontName = label_font
    chart.bars[0].fillColor = colors.HexColor("#4F46E5")
    chart.barLabelFormat = "%d"
    chart.barLabels.nudge = 6
    chart.barLabels.fontSize = 8
    chart.barLabels.fillColor = colors.HexColor("#111827")
    chart.barLabels.boxAnchor = "s"
    chart.barLabels.fontName = label_font
    chart.barLabels.visible = True
    drawing.add(chart)
    return drawing


def _transcript_pdf(asset, response_obj, user) -> bytes:
    fonts = _register_pdf_fonts()
    styles = _styles(fonts["regular"], fonts["bold"])
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="Transcript Report",
        author=_display_name(user),
    )

    utterances = (response_obj.normalized_transcript or {}).get("utterances", [])
    insights = response_obj.normalized_insights or {}
    participants = _participants_data(utterances)
    speaker_palette = _speaker_color_map(utterances)
    generated_ist = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S IST")

    story = []
    story.append(
        _cover_block(
            "Transcript Report",
            "",
            [
                f"Generated Time: {generated_ist}",
            ],
            styles,
        )
    )
    story.extend([Spacer(1, 8), _section_header("Call Metadata", styles), Spacer(1, 6)])

    meta_rows = [
        ["User", _display_name(user)],
        ["Asset ID", str(asset.id)],
        ["Filename", str(asset.filename)],
        ["Language", str(asset.language)],
        ["Call Length", _seconds_to_hms(asset.call_length)],
        ["Overall Sentiment", str(insights.get("OverallSentiment", "N/A"))],
    ]
    meta_table = Table(
        [[Paragraph(f"<b>{k}</b>", styles["BodyX"]), _p(v, styles, "BodyX", fonts)] for k, v in meta_rows],
        colWidths=[38 * mm, 130 * mm],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(meta_table)
    story.extend([Spacer(1, 8), _section_header("Participants", styles), Spacer(1, 6)])

    if participants:
        p_rows = [[Paragraph("<b>Speaker</b>", styles["BodyX"]), Paragraph("<b>Role</b>", styles["BodyX"])]]
        for p in participants:
            p_rows.append(
                [
                    Paragraph(str(p["speaker_id"]), styles["BodyX"]),
                    Paragraph(str(p["role"]), styles["BodyX"]),
                ]
            )
        p_table = Table(p_rows, colWidths=[84 * mm, 84 * mm])
        p_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(p_table)
    else:
        story.append(Paragraph("No participants data found.", styles["Subtle"]))

    story.extend([Spacer(1, 10), _section_header("Transcript", styles), Spacer(1, 6)])
    if not utterances:
        story.append(Paragraph("No transcript utterances available.", styles["Subtle"]))
    else:
        for u in utterances:
            sid = str(u.get("speaker_id") or "unknown")
            role = str(u.get("role") or "N/A")
            start = _ms_to_hms(u.get("start"))
            end = _ms_to_hms(u.get("end"))
            text = str(u.get("text") or "")
            bg, fg = speaker_palette.get(sid, speaker_palette["unknown"])
            head = Paragraph(
                f"<b>{sid}</b> ({role}) &nbsp;&nbsp; <font color='#334155'>{start} - {end}</font>",
                styles["BodyX"],
            )
            body_style = _make_para_style("BodyX", styles, text, fonts)
            body_style.textColor = fg
            body = Paragraph(escape(text).replace("\n", "<br/>"), body_style)
            card = Table([[head], [body]], colWidths=[168 * mm])
            card.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), bg),
                        ("BOX", (0, 0), (-1, -1), 0.9, fg),
                        ("LINEBELOW", (0, 0), (0, 0), 0.6, fg),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ]
                )
            )
            story.extend([KeepTogether([card]), Spacer(1, 5)])

    _trim_story(story)
    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def _analysis_pdf(asset, response_obj, user) -> bytes:
    fonts = _register_pdf_fonts()
    styles = _styles(fonts["regular"], fonts["bold"])
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="Analysis Report",
        author=_display_name(user),
    )

    insights = response_obj.normalized_insights or {}
    perf = response_obj.performance_metrics or {}
    utterances = (response_obj.normalized_transcript or {}).get("utterances", [])
    sentiment_rows = response_obj.sentence_sentiment or []
    master = response_obj.master_json or {}
    talk_map = perf.get("RawTalkTimeMs", {}) if isinstance(perf, dict) else {}
    participants = _participants_data(utterances)
    generated_ist = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S IST")

    llm_usage = master.get("usage", {}).get("llm", {}) if isinstance(master, dict) else {}
    processing = master.get("processing_metrics", {}) if isinstance(master, dict) else {}
    keyword_counts = insights.get("KeywordCounts") if isinstance(insights.get("KeywordCounts"), dict) else {}
    topics = insights.get("Topics") or []
    technical_terms = insights.get("TechnicalTerms") or []
    tasks = insights.get("Tasks") or []
    extracted = insights.get("ExtractedInformation")
    strengths = insights.get("KeyStrengths") or []
    improvements = insights.get("AreasOfImprovement") or []
    call_type = insights.get("CallType", "Unknown")

    story = []
    story.append(
        _cover_block(
            "Analysis Report",
            "",
            [
                f"Generated time: {generated_ist}",
            ],
            styles,
        )
    )
    story.append(Spacer(1, 8))

    # Call Summary
    story.extend([_section_header("Call Summary", styles), Spacer(1, 6)])
    summary_rows = [
        ("User", _display_name(user)),
        ("Asset ID", str(asset.id)),
        ("Filename", str(asset.filename)),
        ("Language", str(asset.language)),
        ("Call Length", _seconds_to_hms(asset.call_length)),
        ("Call Type", str(call_type)),
        ("Audio Environment", str(insights.get("AudioEnvironment", "N/A"))),
        ("Overall Sentiment", str(insights.get("OverallSentiment", "N/A"))),
    ]
    summary_table = Table(
        [[Paragraph(f"<b>{k}</b>", styles["BodyX"]), _p(v, styles, "BodyX", fonts)] for k, v in summary_rows],
        colWidths=[48 * mm, 120 * mm],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(summary_table)
    call_summary = insights.get("CallSummary") or insights.get("Summary")
    if call_summary:
        summary_rows_data = [[Paragraph("<b>Summary</b>", styles["BodyBold"])]]
        for depth, line in _structured_bullet_lines(call_summary)[:60]:
            indent = "&nbsp;" * (depth * 6)
            html = f"{indent}&#8226; {escape(str(line))}"
            summary_rows_data.append([Paragraph(html, _make_para_style("BodyX", styles, str(line), fonts))])
        summary_card = Table(summary_rows_data, colWidths=[168 * mm])
        summary_card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#93C5FD")),
                    ("INNERGRID", (0, 1), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.extend(
            [
                Spacer(1, 6),
                summary_card,
            ]
        )
    story.extend([Spacer(1, 6), Paragraph("<b>Participants</b>", styles["BodyBold"]), Spacer(1, 4)])
    if participants:
        p_rows = [[Paragraph("<b>Speaker</b>", styles["BodyX"]), Paragraph("<b>Role</b>", styles["BodyX"])]]
        for p in participants:
            p_rows.append(
                [
                    Paragraph(str(p["speaker_id"]), styles["BodyX"]),
                    Paragraph(str(p["role"]), styles["BodyX"]),
                ]
            )
        p_table = Table(p_rows, colWidths=[84 * mm, 84 * mm])
        p_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(p_table)
    else:
        story.append(Paragraph("No participants data found.", styles["Subtle"]))

    # Insights
    story.extend([Spacer(1, 10), _section_header("Insights", styles), Spacer(1, 6)])
    insights_blocks: list[KeepTogether] = []
    strengths_text = "<br/>".join(str(s) for s in strengths[:12]) if strengths else "<font color='#64748B'>No strengths identified</font>"
    improvements_text = "<br/>".join(str(s) for s in improvements[:12]) if improvements else "<font color='#64748B'>No improvement areas identified</font>"
    kw_text = "<br/>".join(f"{k}: {v}" for k, v in sorted(keyword_counts.items(), key=lambda kv: kv[1], reverse=True)[:15]) if keyword_counts else "<font color='#64748B'>No keyword data</font>"
    for title, body in [
        ("Key Strengths", strengths_text),
        ("Areas of Improvement", improvements_text),
        ("Top Keywords", kw_text),
    ]:
        card = Table(
            [
                [Paragraph(f"<b>{title}</b>", styles["BodyBold"])],
                [Paragraph(body, styles["BodyX"])],
            ],
            colWidths=[168 * mm],
        )
        card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF2FF")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#C7D2FE")),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#C7D2FE")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        insights_blocks.append(KeepTogether([card, Spacer(1, 5)]))
    story.extend(insights_blocks)

    # General Info
    story.extend([Spacer(1, 10), _section_header("General Info", styles), Spacer(1, 6)])
    for heading, data in [("Topics", topics), ("Technical Terms", technical_terms), ("Tasks", tasks)]:
        rows = []
        if not data:
            rows.append([Paragraph("N/A", styles["Subtle"])])
        else:
            for item in data[:20]:
                pairs = _normalize_structured_item(item)
                if len(pairs) == 1 and pairs[0][0] == "Details":
                    rows.append([_p(str(pairs[0][1]), styles, "BodyX", fonts)])
                else:
                    kv = "<br/>".join(f"<b>{k}</b>: {v}" for k, v in pairs)
                    rows.append([Paragraph(kv, _make_para_style("BodyX", styles, kv, fonts))])
        gi_card = Table(
            [
                [Paragraph(f"<b>{heading}</b>", styles["BodyBold"])],
                *rows,
            ],
            colWidths=[168 * mm],
        )
        gi_card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ECFEFF")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#BAE6FD")),
                    ("INNERGRID", (0, 1), (-1, -1), 0.3, colors.HexColor("#E0F2FE")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.extend([KeepTogether([gi_card]), Spacer(1, 5)])
    if extracted:
        e_rows = []
        for depth, line in _structured_bullet_lines(extracted)[:120]:
            indent = "&nbsp;" * (depth * 6)
            html = f"{indent}&#8226; {escape(str(line))}"
            e_rows.append([Paragraph(html, _make_para_style("BodyX", styles, str(line), fonts))])
    else:
        e_rows = [[Paragraph("N/A", styles["Subtle"])]]
    extracted_card = Table(
        [[Paragraph("<b>Extracted Information</b>", styles["BodyBold"])], *e_rows],
        colWidths=[168 * mm],
    )
    extracted_card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FEF9C3")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFFFF")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#FDE68A")),
                ("INNERGRID", (0, 1), (-1, -1), 0.3, colors.HexColor("#FEF3C7")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([KeepTogether([extracted_card])])

    # Sentiment section
    story.append(PageBreak())
    story.extend([_section_header("Sentiment Analysis", styles), Spacer(1, 6)])
    if sentiment_rows:
        story.extend(_format_sentiment_timeline(sentiment_rows[:150], styles))
    else:
        story.append(Paragraph("No sentence-level sentiment data.", styles["Subtle"]))

    # Analytics
    story.append(PageBreak())
    story.extend([_section_header("Analytics", styles), Spacer(1, 6)])
    story.append(Paragraph("<b>Processing Metrics</b>", styles["BodyBold"]))

    metrics_rows = [
        ("Total Call Duration", str(perf.get("TotalCallDuration", "N/A"))),
        ("Silence Time", str(perf.get("SilenceTime", "N/A"))),
        ("Total Processing Time (sec)", str(processing.get("total_processing_time_sec", "N/A"))),
        ("Transcription Time (sec)", str(processing.get("transcription_time_sec", "N/A"))),
        ("Analysis Time (sec)", str(processing.get("analysis_time_sec", "N/A"))),
        ("LLM Total Tokens", str(llm_usage.get("total_tokens", "N/A"))),
        ("LLM Prompt Tokens", str(llm_usage.get("prompt_tokens", "N/A"))),
        ("LLM Output Tokens", str(llm_usage.get("candidate_tokens", "N/A"))),
    ]
    metrics = Table(
        [[Paragraph(f"<b>{k}</b>", styles["BodyX"]), Paragraph(v, styles["BodyX"])] for k, v in metrics_rows],
        colWidths=[62 * mm, 106 * mm],
    )
    metrics.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(metrics)
    story.append(Spacer(1, 8))

    talk_drawing, talk_legend = _talktime_chart(talk_map)
    keywords_drawing = _keyword_chart(keyword_counts, fonts["regular"])

    story.append(Paragraph("<b>Talk-Time Distribution</b>", styles["BodyBold"]))
    if talk_drawing:
        story.append(talk_drawing)
        if talk_legend:
            legend_tbl = Table(
                [[Paragraph(f"<b>{name}</b>", styles["BodyX"]), Paragraph(val, styles["BodyX"])] for name, val in talk_legend],
                colWidths=[90 * mm, 78 * mm],
            )
            legend_tbl.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
                        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(legend_tbl)
    else:
        story.append(Paragraph("No talk-time data available.", styles["Subtle"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Top Keywords </b>", styles["BodyBold"]))
    if keywords_drawing:
        story.append(keywords_drawing)
    else:
        story.append(Paragraph("No keyword chart data available.", styles["Subtle"]))
    _trim_story(story)
    doc.build(story)
    buffer.seek(0)
    return buffer.read()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_audio(
  file: list[UploadFile] = File(...),
  language: str | None = None,
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user),
  csrf_ok: None = Depends(_require_csrf)
):
    if not file:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    if len(file) > MAX_FILES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES_PER_REQUEST} files per upload")

    request_id = str(uuid.uuid4())[:8]

    logger.info(f"[request_id={request_id}] Upload request received")  

    asset_ids = []

    for x in file:
        
        header = await x.read(261)
        await x.seek(0)

        kind = filetype.guess(header)
        detected_mime = kind.mime if kind else None
        ext = os.path.splitext(x.filename)[1].lower()

        if detected_mime not in ALLOWED_MIME_TYPES:
            if not (
                ext in ALLOWED_EXTENSIONS and
                x.content_type in ALLOWED_MIME_TYPES.union({"audio/mp3", "application/octet-stream"})
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported audio format for file: {x.filename}",
                )


        # Validate file type
        logger.info(f"[request_id={request_id}] Received file: {x.filename}, content_type={x.content_type}")

        # Create unique filename
        file_ext = os.path.splitext(x.filename)[1]
        unique_name = f"{uuid.uuid4()}{file_ext}"
        save_path = os.path.join(UPLOAD_DIR, unique_name)

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Save file locally
        logger.info(f"[request_id={request_id}] Saving file to disk: {save_path}")

        x.file.seek(0, 2)  # move cursor to end
        file_size = x.file.tell()
        x.file.seek(0)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large. Max allowed size is 100 MB"
            )

        # Save file locally
        with open(save_path, "wb") as buffer:
            while chunk := x.file.read(1024 * 1024):
                buffer.write(chunk)

    # Save metadata in DB
        asset = AssetFile(
            filename=x.filename,
            filepath=save_path,
            language=language or "unknown",
            call_length=0,
            user_auth_id=current_user.id,
            status="uploaded"
        )

        try:
            db.add(asset)
            db.commit()
            db.refresh(asset)
        except Exception:
            db.rollback()
            raise

        logger.info(f"[request_id={request_id}] Asset created with id={asset.id}")

        try: 
            process_asset_task.delay(asset.id)
        except Exception as e:
            try:
                asset.status = "failed"
                asset.processing_stage = "queue_error"
                asset.error_reason = f"Queue enqueue failed: {type(e).__name__}"
                db.commit()
            except Exception:
                db.rollback()
            raise HTTPException(status_code=503, detail="Processing queue unavailable")
        
        asset_ids.append(asset.id)

    return {
        "success": True,
        "asset_file_id": asset_ids,
        "files_uploaded": len(asset_ids),
        "status": "processing"
    }

@router.get("/upload-constraints", status_code=status.HTTP_200_OK)
def get_upload_constraints():
    return {
        "max_files_per_request": MAX_FILES_PER_REQUEST,
        "max_file_size_bytes": MAX_FILE_SIZE,
        "max_file_size_mb": round(MAX_FILE_SIZE / (1024 * 1024), 2),
        "allowed_mime_types": sorted(list(ALLOWED_MIME_TYPES)),
        "allowed_extensions": sorted(list(ALLOWED_EXTENSIONS)),
    }

@router.get("/supported-languages")
def get_supported_languages():
    return{
        "supported_languages": SUPPORTED_LANGUAGES
    }

@router.get("/batch/status", status_code=status.HTTP_200_OK)
def get_batch_status(
    asset_ids: list[int] = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    assets = (
        db.query(AssetFile)
        .filter(
            AssetFile.id.in_(asset_ids),
            AssetFile.user_auth_id == current_user.id
        )
        .all()
    )

    if not assets:
        raise HTTPException(status_code=404, detail="No assets found")

    summary = {
        "total": len(assets),
        "uploaded": 0,
        "processing": 0,
        "completed": 0,
        "failed": 0
    }

    details = []

    for asset in assets:
        if asset.status in summary:
            summary[asset.status] += 1

        details.append({
            "asset_id": asset.id,
            "filename": asset.filename,
            "status": asset.status
        })

    return {
        "summary": summary,
        "assets": details
    }

@router.get("/stats", status_code=status.HTTP_200_OK)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Total calls
    total_calls = db.query(func.count(AssetFile.id)).filter(
        AssetFile.user_auth_id == current_user.id
    ).scalar()

    # Completed calls
    completed_calls = db.query(func.count(AssetFile.id)).filter(
        AssetFile.user_auth_id == current_user.id,
        AssetFile.status == "completed"
    ).scalar()

    # Failed calls
    failed_calls = db.query(func.count(AssetFile.id)).filter(
        AssetFile.user_auth_id == current_user.id,
        AssetFile.status == "failed"
    ).scalar()

    # Recent Calls
    recent_calls = db.query(AssetFile).filter(
        AssetFile.user_auth_id == current_user.id
    ).order_by(
        AssetFile.created_date_time.desc()
    ).limit(5).all()

    # Average call duration
    avg_duration = db.query(func.avg(AssetFile.call_length)).filter(
        AssetFile.user_auth_id == current_user.id,
        AssetFile.status == "completed"
    ).scalar()

    # Sentiment distribution
    sentiments = db.query(
        ApiResponses.normalized_insights["OverallSentiment"].as_string(),
        func.count(ApiResponses.id)
    ).join(
        AssetFile, ApiResponses.asset_file_id == AssetFile.id
    ).filter(
        AssetFile.user_auth_id == current_user.id
    ).group_by(
        ApiResponses.normalized_insights["OverallSentiment"].as_string()
    ).all()

    sentiment_distribution = {
        sentiment if sentiment else "Unknown": count
        for sentiment, count in sentiments
    }
    responses = db.query(ApiResponses).join(
        AssetFile, ApiResponses.asset_file_id == AssetFile.id
    ).filter(
        AssetFile.user_auth_id == current_user.id
    ).all()

    calls_per_day_map = defaultdict(int)
    all_assets = db.query(AssetFile).filter(
        AssetFile.user_auth_id == current_user.id
    ).all()

    for asset in all_assets:
        if asset.created_date_time:
            day = asset.created_date_time.date().isoformat()
            calls_per_day_map[day] += 1

    calls_per_day = [
        {"date": k, "count": v}
        for k, v in sorted(calls_per_day_map.items())
    ]

    keyword_counter = Counter()

    for r in responses:
        if not r.normalized_insights:
            continue

        keywords = r.normalized_insights.get("KeywordCounts")

        if not keywords:
            continue

        if isinstance(keywords, dict):
            for k, v in keywords.items():
                if isinstance(v, int):
                    keyword_counter[k] += v

        elif isinstance(keywords, list):
            for item in keywords:
                if isinstance(item, dict):
                    key = item.get("keyword") or item.get("term")
                    count = item.get("count", 1)
                    if key:
                        keyword_counter[key] += count

    top_keywords = dict(keyword_counter.most_common(10))


    type_counter = {}
    groups = []

    def normalize_label(label: str):
        return label.lower().strip()

    def find_group(label):
        label_norm = normalize_label(label)

        for existing in groups:
            existing_norm = normalize_label(existing)

            # similarity threshold
            score = fuzz.token_set_ratio(label_norm, existing_norm)

            if score >= 60:
                return existing

        return None


    for r in responses:
        if not r.normalized_insights:
            continue

        call_type = r.normalized_insights.get("CallType")

        if not call_type:
            continue

        existing_group = find_group(call_type)

        if existing_group:
            type_counter[existing_group] += 1
        else:
            groups.append(call_type)
            type_counter[call_type] = 1


    call_types = [
        {"name": k, "value": v}
        for k, v in type_counter.items()
    ]


    return {
        "total_calls": total_calls or 0,
        "completed_calls": completed_calls or 0,
        "failed_calls": failed_calls or 0,
        "average_call_duration_sec": round(avg_duration or 0, 2),
        "sentiment_distribution": sentiment_distribution,
        "recent_calls": [
            {
                "asset_id": c.id,
                "filename": c.filename,
                "status": c.status,
                "call_length": c.call_length
            } for c in recent_calls
        ],
        "calls_per_day": calls_per_day,
        "top_keywords": top_keywords,
        "call_types": call_types,
        "user": {
            "first_name": current_user.first_name,
            "last_name": current_user.last_name
        },
    }

@router.get("/{asset_id}/audio")
def get_audio(asset_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Audio not found")
    
    if not asset.filepath or not os.path.exists(asset.filepath):
        raise HTTPException(status_code=404, detail="Audio file missing")

    media_type, _ = mimetypes.guess_type(asset.filepath)

    return FileResponse(
        asset.filepath,
        media_type=media_type or "audio/mpeg"
    )


@router.get("", status_code=status.HTTP_200_OK)
def list_assets(
    status_filter: str | None = Query(None),
    language: list[str] | None = Query(None),
    sentiment: list[str] | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    min_duration: int | None = Query(None),
    max_duration: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str | None = Query("created_date_time"),
    order: str | None = Query("desc"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = (
        db.query(AssetFile)
        .outerjoin(ApiResponses, ApiResponses.asset_file_id == AssetFile.id)
        .filter(AssetFile.user_auth_id == current_user.id)
    )

    # Filter: status
    if status_filter:
        query = query.filter(AssetFile.status == status_filter)

    # Filter: language
    if language:
        query = query.filter(AssetFile.language.in_(language))

    # Filter: date range
    if from_date:
        query = query.filter(AssetFile.created_date_time >= from_date)

    if to_date:
        to_date = to_date + timedelta(days=1)
        query = query.filter(AssetFile.created_date_time < to_date)

    # Filter: duration range
    if min_duration is not None:
        query = query.filter(AssetFile.call_length >= min_duration)

    if max_duration is not None:
        query = query.filter(AssetFile.call_length <= max_duration)

    # Filter: overall sentiment (inside JSON)
    if sentiment:
        query = query.filter(
            ApiResponses.normalized_insights["OverallSentiment"].as_string().in_(sentiment)
        )

    # Search: filename OR transcript text
    if search:
        query = query.filter(
            or_(
                AssetFile.filename.ilike(f"%{search}%"),
                ApiResponses.normalized_transcript.cast(String).ilike(f"%{search}%")
            )
        )

    # Safe sorting
    allowed_sorts = {
        "created_date_time": AssetFile.created_date_time,
        "call_length": AssetFile.call_length,
        "status": AssetFile.status,
        "language": AssetFile.language
    }

    sort_column = allowed_sorts.get(sort_by, AssetFile.created_date_time)


    if order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    total = query.count()

    assets = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": [
            {
                "asset_id": asset.id,
                "filename": asset.filename,
                "status": asset.status,
                "language": asset.language,
                "call_length": asset.call_length,
                "created_date_time": asset.created_date_time,
                "processing_stage": asset.processing_stage,
                "error_reason": asset.error_reason,
            }
            for asset in assets
        ]
    }


@router.get("/{asset_id}/analysis", status_code=status.HTTP_200_OK)
def get_asset_analysis(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    if asset.status != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Asset not ready. Current status: {asset.status}"
        )

    response = (
        db.query(ApiResponses)
        .filter(ApiResponses.asset_file_id == asset.id)
        .first()
    )

    if not response:
        raise HTTPException(
            status_code=404,
            detail="Analysis not available"
        )

    return {
        "asset_id": asset.id,
        "filename": asset.filename,
        "language": asset.language,
        "call_length": asset.call_length,
        "normalized_insights": response.normalized_insights,
        "normalized_transcript": response.normalized_transcript,
        "sentence_sentiment": response.sentence_sentiment,
        "performance_metrics": response.performance_metrics,
        "llm_usage": response.llm_usage,
        "transcription_usage": response.transcription_usage,
        "master_json": response.master_json,
    }

@router.get("/{asset_id}/transcript", status_code=status.HTTP_200_OK)
def get_transcript(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    response = (
        db.query(ApiResponses)
        .filter(ApiResponses.asset_file_id == asset.id)
        .first()
    )

    if not response:
        raise HTTPException(status_code=404, detail="Transcript not ready")

    return {
        "utterances": response.normalized_transcript.get("utterances", [])
    }

@router.get("/{asset_id}", status_code=status.HTTP_200_OK)
def get_asset_metadata(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return {
        "asset_id": asset.id,
        "filename": asset.filename,
        "status": asset.status,
        "language": asset.language,
        "call_length": asset.call_length,
        "created_date_time": asset.created_date_time,
        "started_at": asset.started_at,
        "completed_at": asset.completed_at,
        "processing_stage": asset.processing_stage,
        "error_reason": asset.error_reason,
    }

@router.get("/{asset_id}/status", status_code=status.HTTP_200_OK)
def get_asset_status(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    asset = (
        db.query(AssetFile)
        .filter(
            AssetFile.id == asset_id,
            AssetFile.user_auth_id == current_user.id
        )
        .first()
    )

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return {
        "asset_id": asset.id,
        "status": asset.status
    }

@router.get("/{asset_id}/export/transcript")
def export_transcript(
    asset_id: int,
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset = (
        db.query(AssetFile)
        .filter(AssetFile.id == asset_id, AssetFile.user_auth_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status != "completed":
        raise HTTPException(status_code=409, detail=f"Asset not ready. Current status: {asset.status}")

    response_obj = db.query(ApiResponses).filter(ApiResponses.asset_file_id == asset.id).first()
    if not response_obj:
        raise HTTPException(status_code=404, detail="Transcript not available")

    fmt = format.lower().strip()
    if fmt != "pdf":
        raise HTTPException(status_code=400, detail="Invalid format. Use pdf")

    pdf_bytes = _transcript_pdf(asset, response_obj, current_user)
    filename = f"transcript_asset_{asset.id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{asset_id}/export/analysis")
def export_analysis(
    asset_id: int,
    format: str = Query("pdf"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    asset = (
        db.query(AssetFile)
        .filter(AssetFile.id == asset_id, AssetFile.user_auth_id == current_user.id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status != "completed":
        raise HTTPException(status_code=409, detail=f"Asset not ready. Current status: {asset.status}")

    response_obj = db.query(ApiResponses).filter(ApiResponses.asset_file_id == asset.id).first()
    if not response_obj:
        raise HTTPException(status_code=404, detail="Analysis not available")

    fmt = format.lower().strip()

    if fmt != "pdf":
        raise HTTPException(status_code=400, detail="Invalid format. Use pdf")

    pdf_bytes = _analysis_pdf(asset, response_obj, current_user)
    filename = f"analysis_asset_{asset.id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
