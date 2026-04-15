import io
import os
from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
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
from sqlalchemy.orm import Session

from background_services.gemini import translate_analysis_insights
from models.model import ApiResponses


# ── Brand palette (mirrors the web app) ──────────────────────────────────
class Brand:
    # Amber primary (web app's theme.palette.primary.main)
    AMBER       = colors.HexColor("#E8A045")
    AMBER_LIGHT = colors.HexColor("#FEF3C7")   # amber-100
    AMBER_MID   = colors.HexColor("#FDE68A")   # amber-200
    AMBER_DARK  = colors.HexColor("#92500A")   # amber-900 (text on light amber)
    AMBER_BADGE = colors.HexColor("#FFFBEB")   # amber-50

    # Cover / dark surface
    COVER_BG    = colors.HexColor("#0B1739")
    COVER_SUB   = colors.HexColor("#CBD5E1")

    # Page surface
    PAGE_BG     = colors.HexColor("#FAFAF8")   # warm off-white
    CARD_BG     = colors.HexColor("#FFFFFF")
    HEADER_BG   = colors.HexColor("#F5F0E8")   # warm cream table header
    ROW_BG      = colors.HexColor("#FAF8F4")   # subtle alternating

    # Borders
    BORDER      = colors.HexColor("#E8DCC8")   # warm divider
    BORDER_SOFT = colors.HexColor("#F0E8D8")

    # Text
    TEXT_DARK   = colors.HexColor("#0F172A")
    TEXT_MID    = colors.HexColor("#475569")
    TEXT_MUTED  = colors.HexColor("#94A3B8")
    TEXT_WHITE  = colors.white

    # Semantic (keep readable)
    POSITIVE_BG = colors.HexColor("#DCFCE7")
    POSITIVE_FG = colors.HexColor("#15803D")
    NEGATIVE_BG = colors.HexColor("#FEE2E2")
    NEGATIVE_FG = colors.HexColor("#B91C1C")
    NEUTRAL_BG  = colors.HexColor("#F1F5F9")
    NEUTRAL_FG  = colors.HexColor("#475569")

    # Chart palette (amber-first)
    CHART = [
        "#E8A045", "#2CB67D", "#5B9CF6", "#E05252",
        "#A855F7", "#EC4899", "#14B8A6", "#F97316",
        "#8B5CF6", "#0E7490",
    ]


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

    def _existing(paths: list[str]) -> str | None:
        return next((p for p in paths if os.path.exists(p)), None)

    def _register_font_with_fallback(font_name: str, path: str) -> bool:
        try:
            pdfmetrics.getFont(font_name)
            return True
        except KeyError:
            pass
        if str(path).lower().endswith(".ttc"):
            for idx in range(0, 8):
                try:
                    pdfmetrics.registerFont(TTFont(font_name, path, subfontIndex=idx))
                    return True
                except Exception:
                    continue
            return False
        try:
            pdfmetrics.registerFont(TTFont(font_name, path))
            return True
        except Exception:
            return False

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
            os.path.join("assets", "fonts", "NotoSansSymbols-Regular.ttf"),
            os.path.join("assets", "fonts", "DejaVuSans.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
            r"C:\Windows\Fonts\segoeui.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
            r"C:\Windows\Fonts\Nirmala.ttc",
        ],
        "bold": [
            os.path.join("assets", "fonts", "NotoSans-Bold.ttf"),
            os.path.join("assets", "fonts", "DejaVuSans-Bold.ttf"),
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\segoeuib.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
        ],
        "arabic": [
            os.path.join("assets", "fonts", "NotoNaskhArabic-Regular.ttf"),
            os.path.join("assets", "fonts", "NotoSansArabic-Regular.ttf"),
            os.path.join("assets", "fonts", "DejaVuSans.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ],
        "hebrew": [
            os.path.join("assets", "fonts", "NotoSansHebrew-Regular.ttf"),
            os.path.join("assets", "fonts", "DejaVuSans.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ],
        "devanagari": [
            os.path.join("assets", "fonts", "NotoSansDevanagari-Regular.ttf"),
            os.path.join("assets", "fonts", "NotoSerifDevanagari-Regular.ttf"),
            r"C:\Windows\Fonts\Nirmala.ttc",
            r"C:\Windows\Fonts\mangal.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
        ],
        "gujarati": [
            os.path.join("assets", "fonts", "NotoSansGujarati-Regular.ttf"),
            r"C:\Windows\Fonts\Nirmala.ttc",
            r"C:\Windows\Fonts\shruti.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansGujarati-Regular.ttf",
        ],
        "tamil": [
            os.path.join("assets", "fonts", "NotoSansTamil-Regular.ttf"),
            r"C:\Windows\Fonts\Nirmala.ttc",
            r"C:\Windows\Fonts\latha.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansTamil-Regular.ttf",
        ],
    }

    for key in ("regular", "bold"):
        found = _existing(candidates[key])
        if not found:
            continue
        font_name = f"Report_{key}"
        if _register_font_with_fallback(font_name, found):
            fonts[key] = font_name

    for key, paths in candidates.items():
        if key in {"regular", "bold"}:
            continue
        found = _existing(paths)
        if not found:
            continue
        font_name = f"Report_{key}"
        if _register_font_with_fallback(font_name, found):
            fonts[key] = font_name

    for script_key in ("arabic", "hebrew", "devanagari", "gujarati", "tamil"):
        if fonts[script_key] == "Helvetica" and fonts["regular"] != "Helvetica":
            fonts[script_key] = fonts["regular"]
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


def _chunk_text(text: str, max_chars: int = 240) -> list[str]:
    raw = str(text or "").replace("\r\n", "\n").replace("\r", "\n")
    if not raw.strip():
        return [""]
    lines: list[str] = []
    for part in raw.split("\n"):
        part = part.strip()
        if not part:
            continue
        if len(part) <= max_chars:
            lines.append(part)
            continue
        start = 0
        n = len(part)
        while start < n:
            end = min(start + max_chars, n)
            if end < n:
                split_at = part.rfind(" ", start, end)
                if split_at > start + int(max_chars * 0.6):
                    end = split_at
            piece = part[start:end].strip()
            if piece:
                lines.append(piece)
            start = end + 1 if end < n and part[end:end + 1] == " " else end
    return lines or [raw.strip()]


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
    styles.add(ParagraphStyle(
        name="TitleX",
        parent=styles["Title"],
        fontName=bold_font,
        fontSize=28,
        leading=34,
        textColor=Brand.TEXT_WHITE,
        alignment=0,
    ))
    # Amber accent title line (report type label above main title)
    styles.add(ParagraphStyle(
        name="TitleLabel",
        parent=styles["Normal"],
        fontName=bold_font,
        fontSize=9,
        leading=13,
        textColor=Brand.AMBER,
        letterSpacing=1.5,
    ))
    styles.add(ParagraphStyle(
        name="Subtle",
        parent=styles["Normal"],
        fontName=regular_font,
        fontSize=10,
        leading=14,
        textColor=Brand.TEXT_MUTED,
    ))
    styles.add(ParagraphStyle(
        name="CoverMeta",
        parent=styles["Normal"],
        fontName=regular_font,
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#94A3B8"),
    ))
    styles.add(ParagraphStyle(
        name="CoverSub",
        parent=styles["Normal"],
        fontName=regular_font,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#CBD5E1"),
    ))
    styles.add(ParagraphStyle(
        name="H2",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=14,
        leading=18,
        textColor=Brand.TEXT_DARK,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BodyX",
        parent=styles["BodyText"],
        fontName=regular_font,
        fontSize=10.5,
        leading=14,
        textColor=Brand.TEXT_DARK,
    ))
    styles.add(ParagraphStyle(
        name="BodyBold",
        parent=styles["BodyText"],
        fontName=bold_font,
        fontSize=10.5,
        leading=14,
        textColor=Brand.TEXT_DARK,
    ))
    # Section pill label — amber background, dark text
    styles.add(ParagraphStyle(
        name="Pill",
        parent=styles["BodyText"],
        fontName=bold_font,
        fontSize=9,
        leading=12,
        textColor=Brand.TEXT_DARK,
        alignment=0,
        letterSpacing=0.8,
    ))
    return styles


def _section_header(title: str, styles) -> Table:
    """Amber pill matching the web app's section label style."""
    t = Table([[Paragraph(title.upper(), styles["Pill"])]], colWidths=[170])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), Brand.AMBER),
        ("BOX",        (0, 0), (0, 0), 0, Brand.AMBER),
        ("ALIGN",      (0, 0), (0, 0), "LEFT"),
        ("VALIGN",     (0, 0), (0, 0), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (0, 0), 12),
        ("RIGHTPADDING", (0, 0), (0, 0), 12),
        ("TOPPADDING",   (0, 0), (0, 0), 5),
        ("BOTTOMPADDING",(0, 0), (0, 0), 5),
    ]))
    return t


def _cover_block(title: str, subtitle: str, meta_lines: list[str], styles) -> Table:
    """
    Cover block: dark navy background, amber accent label above the title,
    matches the web app's dark header bar feel.
    """
    rows = [
        # Amber label e.g. "TRANSCRIPT REPORT"
        [Paragraph(title.upper(), styles["TitleLabel"])],
        # Thick white title
        [Paragraph(title, styles["TitleX"])],
    ]
    if subtitle and subtitle.strip():
        rows.append([Paragraph(subtitle, styles["CoverSub"])])
    for line in meta_lines:
        rows.append([Paragraph(line, styles["CoverMeta"])])

    t = Table(rows, colWidths=[170 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), Brand.COVER_BG),
        ("BOX",           (0, 0), (-1, -1), 0, Brand.COVER_BG),
        ("LEFTPADDING",   (0, 0), (-1, -1), 18),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 18),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        # Extra top padding on title row
        ("TOPPADDING",    (0, 1), (0, 1), 4),
        ("BOTTOMPADDING", (0, 1), (0, 1), 10),
    ]))
    return t


def _amber_rule() -> Table:
    """A thin amber horizontal rule used between the cover and content."""
    t = Table([[""]], colWidths=[170 * mm], rowHeights=[3])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), Brand.AMBER),
        ("LINEABOVE",     (0, 0), (-1, -1), 0, Brand.AMBER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _participants_data(utterances: list[dict]) -> list[dict]:
    by_speaker: dict[str, dict] = {}
    for u in utterances:
        sid = str(u.get("speaker_id") or "unknown")
        role = str(u.get("role") or "N/A")
        item = by_speaker.setdefault(sid, {"speaker_id": sid, "role": role})
        if item.get("role") == "N/A" and role != "N/A":
            item["role"] = role
    return list(by_speaker.values())


def _format_sentiment_timeline(rows: list[dict], styles, fonts: dict[str, str]):
    out = []
    color_map = {
        "positive": Brand.POSITIVE_BG,
        "negative": Brand.NEGATIVE_BG,
        "neutral":  Brand.NEUTRAL_BG,
    }
    border_map = {
        "positive": Brand.POSITIVE_FG,
        "negative": Brand.NEGATIVE_FG,
        "neutral":  Brand.NEUTRAL_FG,
    }
    for row in rows:
        sent   = str(row.get("sentiment", "neutral")).lower()
        text   = str(row.get("text", ""))
        bg     = color_map.get(sent, Brand.NEUTRAL_BG)
        border = border_map.get(sent, Brand.NEUTRAL_FG)
        label  = sent.capitalize()
        body_rows = [[Paragraph(f"<b>{label}</b>", styles["BodyBold"])]]
        for piece in _chunk_text(text, max_chars=260):
            body_rows.append([_p(piece, styles, "BodyX", fonts)])
        box = Table(body_rows, colWidths=[168 * mm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX",        (0, 0), (-1, -1), 1, border),
            ("LEFTPADDING",  (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING",   (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ]))
        out.extend([box, Spacer(1, 4)])
    return out


def _talktime_chart(talk_map: dict):
    if not talk_map:
        return None, []
    labels = [str(k) for k in talk_map.keys()]
    values = [max(1, int(v / 1000)) for v in talk_map.values()]
    drawing = Drawing(250, 190)
    pie = Pie()
    pie.x      = 30
    pie.y      = 30
    pie.width  = 120
    pie.height = 120
    pie.data   = values
    pie.labels = [f"S{i+1}" for i in range(len(labels))]
    pie.sideLabels = True
    legend = []
    for i, (label, val) in enumerate(zip(labels, values)):
        pie.slices[i].fillColor = colors.HexColor(Brand.CHART[i % len(Brand.CHART)])
        legend.append((f"S{i+1} ({label})", _seconds_to_hms(val)))
    drawing.add(pie)
    return drawing, legend


def _keyword_chart(keyword_counts: dict, fonts: dict[str, str]):
    items = sorted(keyword_counts.items(), key=lambda kv: kv[1], reverse=True)[:8] if keyword_counts else []
    if not items:
        return None
    label_font = _pick_font(" ".join(str(k) for k, _ in items), fonts)
    drawing = Drawing(300, 210)
    chart = VerticalBarChart()
    chart.x      = 35
    chart.y      = 45
    chart.height = 130
    chart.width  = 240
    chart.data   = [[int(v) for _, v in items]]
    chart.valueAxis.valueMin  = 0
    chart.valueAxis.valueStep = max(1, int(max(v for _, v in items) / 5) or 1)
    chart.categoryAxis.categoryNames = [str(k)[:14] for k, _ in items]
    chart.categoryAxis.labels.angle     = 25
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.categoryAxis.labels.fontName  = label_font
    chart.valueAxis.labels.fontName     = label_font
    # Amber bar
    chart.bars[0].fillColor  = Brand.AMBER
    chart.barLabelFormat     = "%d"
    chart.barLabels.nudge    = 6
    chart.barLabels.fontSize = 8
    chart.barLabels.fillColor   = Brand.TEXT_DARK
    chart.barLabels.boxAnchor   = "s"
    chart.barLabels.fontName    = label_font
    chart.barLabels.visible     = True
    drawing.add(chart)
    return drawing


# ─────────────────────────────────────────────────────────────────────────────
# Shared table style helpers
# ─────────────────────────────────────────────────────────────────────────────

def _meta_table_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), Brand.ROW_BG),
        ("BOX",           (0, 0), (-1, -1), 0.8, Brand.BORDER),
        ("INNERGRID",     (0, 0), (-1, -1), 0.4, Brand.BORDER_SOFT),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])


def _participants_table_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  Brand.HEADER_BG),   # warm cream header
        ("BACKGROUND",    (0, 1), (-1, -1), Brand.CARD_BG),
        ("BOX",           (0, 0), (-1, -1), 0.8, Brand.BORDER),
        ("INNERGRID",     (0, 0), (-1, -1), 0.4, Brand.BORDER_SOFT),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])


def _insight_card_style(header_bg: colors.Color, border: colors.Color) -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  header_bg),
        ("BACKGROUND",    (0, 1), (-1, -1), Brand.CARD_BG),
        ("BOX",           (0, 0), (-1, -1), 0.8, border),
        ("LINEBELOW",     (0, 0), (-1, 0),  0.6, border),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ])


# ─────────────────────────────────────────────────────────────────────────────
# Transcript PDF
# ─────────────────────────────────────────────────────────────────────────────

def _transcript_pdf(asset, response_obj, user) -> bytes:
    fonts  = _register_pdf_fonts()
    styles = _styles(fonts["regular"], fonts["bold"])
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=14 * mm,  bottomMargin=14 * mm,
        title="Transcript Report",
        author=_display_name(user),
    )

    nt       = response_obj.normalized_transcript or {}
    variants = nt.get("variants", {})
    original_utterances = (variants.get("original") or {}).get("utterances", nt.get("utterances", []))
    english_utterances  = (variants.get("en") or {}).get("utterances", [])
    utterances          = original_utterances

    insights     = response_obj.normalized_insights or {}
    participants = _participants_data(utterances)
    speaker_palette  = _speaker_color_map(utterances)
    generated_ist    = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S IST")

    story = []
    story.append(_cover_block("Transcript Report", "", [f"Generated: {generated_ist}"], styles))
    story.append(_amber_rule())
    story.extend([Spacer(1, 10), _section_header("Call Metadata", styles), Spacer(1, 6)])

    meta_rows = [
        ["User",              _display_name(user)],
        ["Asset ID",          str(asset.id)],
        ["Filename",          str(asset.filename)],
        ["Language",          str(asset.language)],
        ["Call Length",       _seconds_to_hms(asset.call_length)],
        ["Overall Sentiment", str(insights.get("OverallSentiment", "N/A"))],
    ]
    meta_table = Table(
        [[Paragraph(f"<b>{k}</b>", styles["BodyX"]), _p(v, styles, "BodyX", fonts)] for k, v in meta_rows],
        colWidths=[38 * mm, 130 * mm],
    )
    meta_table.setStyle(_meta_table_style())
    story.append(meta_table)

    story.extend([Spacer(1, 10), _section_header("Participants", styles), Spacer(1, 6)])
    if participants:
        p_rows = [[Paragraph("<b>Speaker</b>", styles["BodyX"]), Paragraph("<b>Role</b>", styles["BodyX"])]]
        for p in participants:
            p_rows.append([
                Paragraph(str(p["speaker_id"]), styles["BodyX"]),
                Paragraph(str(p["role"]),       styles["BodyX"]),
            ])
        p_table = Table(p_rows, colWidths=[84 * mm, 84 * mm])
        p_table.setStyle(_participants_table_style())
        story.append(p_table)
    else:
        story.append(Paragraph("No participants data found.", styles["Subtle"]))

    story.extend([Spacer(1, 10), _section_header("Transcript", styles), Spacer(1, 6)])
    if not utterances:
        story.append(Paragraph("No transcript utterances available.", styles["Subtle"]))
    else:
        for idx, u in enumerate(utterances):
            sid  = str(u.get("speaker_id") or "unknown")
            role = str(u.get("role") or "N/A")
            start = _ms_to_hms(u.get("start"))
            end   = _ms_to_hms(u.get("end"))
            text  = str(u.get("text") or "")
            bg, fg = speaker_palette.get(sid, speaker_palette["unknown"])

            head = Paragraph(
                f"<b>{sid}</b> ({role}) &nbsp;&nbsp; <font color='#334155'>{start} - {end}</font>",
                styles["BodyX"],
            )
            body_rows = []
            for piece in _chunk_text(text, max_chars=220):
                body_style = _make_para_style("BodyX", styles, piece, fonts)
                body_style.textColor  = fg
                body_style.leftIndent  = 8
                body_style.rightIndent = 8
                body_style.spaceBefore = 2
                body_style.spaceAfter  = 2
                body_rows.append([Paragraph(escape(piece).replace("\n", "<br/>"), body_style)])

            header_table = Table([[head]], colWidths=[168 * mm])
            header_table.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), bg),
                ("BOX",           (0, 0), (-1, -1), 0.9, fg),
                ("LEFTPADDING",   (0, 0), (-1, -1), 8),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))

            en_text = ""
            if idx < len(english_utterances):
                en_text = str(english_utterances[idx].get("text") or "")
            if en_text:
                for piece in _chunk_text(en_text, max_chars=220):
                    en_style = _make_para_style("BodyX", styles, piece, fonts)
                    en_style.textColor  = Brand.TEXT_MID
                    en_style.fontSize   = 9.5
                    en_style.leading    = 13
                    en_style.fontName   = "Helvetica-Oblique"
                    en_style.leftIndent  = 8
                    en_style.rightIndent = 8
                    en_style.spaceBefore = 1
                    en_style.spaceAfter  = 3
                    body_rows.append([Paragraph(f"<i>{escape(piece).replace(chr(10), '<br/>')}</i>", en_style)])

            body_table = Table(body_rows or [[Paragraph("", styles["BodyX"])]], colWidths=[168 * mm])
            body_table.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), bg),
                ("LINEBEFORE",    (0, 0), (-1, -1), 0.9, fg),
                ("LINEAFTER",     (0, 0), (-1, -1), 0.9, fg),
                ("LINEBELOW",     (0, -1), (-1, -1), 0.9, fg),
                ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
                ("TOPPADDING",    (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            story.append(header_table)
            story.append(body_table)
            story.append(Spacer(1, 5))

    _trim_story(story)
    doc.build(story)
    buffer.seek(0)
    return buffer.read()


# ─────────────────────────────────────────────────────────────────────────────
# Analysis PDF
# ─────────────────────────────────────────────────────────────────────────────

def _analysis_pdf(asset, response_obj, user, insights_override=None) -> bytes:
    fonts  = _register_pdf_fonts()
    styles = _styles(fonts["regular"], fonts["bold"])
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm, rightMargin=16 * mm,
        topMargin=14 * mm,  bottomMargin=14 * mm,
        title="Analysis Report",
        author=_display_name(user),
    )

    insights        = insights_override or response_obj.normalized_insights or {}
    perf            = response_obj.performance_metrics or {}
    utterances      = (response_obj.normalized_transcript or {}).get("utterances", [])
    sentiment_rows  = response_obj.sentence_sentiment or []
    master          = response_obj.master_json or {}
    talk_map        = perf.get("RawTalkTimeMs", {}) if isinstance(perf, dict) else {}
    participants    = _participants_data(utterances)
    generated_ist   = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d %H:%M:%S IST")

    llm_usage       = master.get("usage", {}).get("llm", {}) if isinstance(master, dict) else {}
    processing      = master.get("processing_metrics", {}) if isinstance(master, dict) else {}
    keyword_counts  = insights.get("KeywordCounts") if isinstance(insights.get("KeywordCounts"), dict) else {}
    topics          = insights.get("Topics") or []
    technical_terms = insights.get("TechnicalTerms") or []
    tasks           = insights.get("Tasks") or []
    extracted       = insights.get("ExtractedInformation")
    strengths       = insights.get("KeyStrengths") or []
    improvements    = insights.get("AreasOfImprovement") or []
    call_type       = insights.get("CallType", "Unknown")

    story = []
    story.append(_cover_block("Analysis Report", "", [f"Generated: {generated_ist}"], styles))
    story.append(_amber_rule())
    story.append(Spacer(1, 10))

    # ── Call Summary ──────────────────────────────────────────────────────
    story.extend([_section_header("Call Summary", styles), Spacer(1, 6)])
    summary_rows = [
        ("User",               _display_name(user)),
        ("Asset ID",           str(asset.id)),
        ("Filename",           str(asset.filename)),
        ("Language",           str(asset.language)),
        ("Call Length",        _seconds_to_hms(asset.call_length)),
        ("Call Type",          str(call_type)),
        ("Audio Environment",  str(insights.get("AudioEnvironment", "N/A"))),
        ("Overall Sentiment",  str(insights.get("OverallSentiment", "N/A"))),
    ]
    summary_table = Table(
        [[Paragraph(f"<b>{k}</b>", styles["BodyX"]), _p(v, styles, "BodyX", fonts)] for k, v in summary_rows],
        colWidths=[48 * mm, 120 * mm],
    )
    summary_table.setStyle(_meta_table_style())
    story.append(summary_table)

    call_summary = insights.get("CallSummary") or insights.get("Summary")
    if call_summary:
        if isinstance(call_summary, str):
            summary_text = call_summary.strip()
        else:
            flattened    = [str(line).strip() for _, line in _structured_bullet_lines(call_summary)[:60]]
            summary_text = " ".join(line for line in flattened if line)
        summary_html = escape(summary_text).replace("\n", " ")
        summary_card_rows = [
            [Paragraph("<b>Summary</b>", styles["BodyBold"])],
            [Paragraph(summary_html, _make_para_style("BodyX", styles, summary_text, fonts))],
        ]
        summary_card = Table(summary_card_rows, colWidths=[168 * mm])
        # Amber-tinted summary card
        summary_card.setStyle(_insight_card_style(Brand.AMBER_LIGHT, Brand.AMBER_MID))
        story.extend([Spacer(1, 6), summary_card])

    # ── Participants ──────────────────────────────────────────────────────
    story.extend([Spacer(1, 10), _section_header("Participants", styles), Spacer(1, 6)])
    if participants:
        p_rows = [[Paragraph("<b>Speaker</b>", styles["BodyX"]), Paragraph("<b>Role</b>", styles["BodyX"])]]
        for p in participants:
            p_rows.append([
                Paragraph(str(p["speaker_id"]), styles["BodyX"]),
                Paragraph(str(p["role"]),       styles["BodyX"]),
            ])
        p_table = Table(p_rows, colWidths=[84 * mm, 84 * mm])
        p_table.setStyle(_participants_table_style())
        story.append(p_table)
    else:
        story.append(Paragraph("No participants data found.", styles["Subtle"]))

    # ── Insights ──────────────────────────────────────────────────────────
    story.extend([Spacer(1, 10), _section_header("Insights", styles), Spacer(1, 6)])
    keyword_items  = [f"{k}: {v}" for k, v in sorted(keyword_counts.items(), key=lambda kv: kv[1], reverse=True)[:30]]
    strengths_items    = [str(s) for s in strengths[:12]]
    improvements_items = [str(s) for s in improvements[:12]]

    for title, items, empty_label in [
        ("Key Strengths",        strengths_items,    "No strengths identified"),
        ("Areas of Improvement", improvements_items, "No improvement areas identified"),
        ("Keywords",             keyword_items,      "No keyword data"),
    ]:
        body_rows = []
        if items:
            for item in items:
                for piece in _chunk_text(item, max_chars=240):
                    body_rows.append([_p(piece, styles, "BodyX", fonts)])
        else:
            body_rows.append([Paragraph(f"<font color='#94A3B8'>{escape(empty_label)}</font>", styles["BodyX"])])
        card = Table(
            [[Paragraph(f"<b>{title}</b>", styles["BodyBold"])], *body_rows],
            colWidths=[168 * mm],
        )
        # Warm amber-tinted insight cards
        card.setStyle(_insight_card_style(Brand.AMBER_BADGE, Brand.AMBER_MID))
        story.append(card)
        story.append(Spacer(1, 5))

    # ── General Info ──────────────────────────────────────────────────────
    story.extend([Spacer(1, 10), _section_header("General Info", styles), Spacer(1, 6)])
    for heading, data in [("Topics", topics), ("Technical Terms", technical_terms), ("Tasks", tasks)]:
        rows = []
        if not data:
            rows.append([Paragraph("N/A", styles["Subtle"])])
        else:
            for item in data[:20]:
                pairs = _normalize_structured_item(item)
                if len(pairs) == 1 and pairs[0][0] == "Details":
                    for chunk in _chunk_text(str(pairs[0][1]), max_chars=240):
                        rows.append([_p(chunk, styles, "BodyX", fonts)])
                else:
                    for k, v in pairs:
                        for chunk in _chunk_text(str(v), max_chars=220):
                            kv = f"<b>{escape(str(k))}</b>: {escape(chunk)}"
                            rows.append([Paragraph(kv, _make_para_style("BodyX", styles, chunk, fonts))])
        gi_card = Table(
            [[Paragraph(f"<b>{heading}</b>", styles["BodyBold"])], *rows],
            colWidths=[168 * mm],
        )
        gi_card.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  Brand.HEADER_BG),
            ("BACKGROUND",    (0, 1), (-1, -1), Brand.CARD_BG),
            ("BOX",           (0, 0), (-1, -1), 0.8, Brand.BORDER),
            ("INNERGRID",     (0, 1), (-1, -1), 0.3, Brand.BORDER_SOFT),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.extend([gi_card, Spacer(1, 5)])

    if extracted:
        e_rows = []
        for depth, line in _structured_bullet_lines(extracted)[:120]:
            for i, chunk in enumerate(_chunk_text(str(line), max_chars=240)):
                indent = "&nbsp;" * (depth * 6)
                bullet = "&#8226; " if i == 0 else ""
                html   = f"{indent}{bullet}{escape(chunk)}"
                e_rows.append([Paragraph(html, _make_para_style("BodyX", styles, chunk, fonts))])
    else:
        e_rows = [[Paragraph("N/A", styles["Subtle"])]]
    extracted_card = Table(
        [[Paragraph("<b>Extracted Information</b>", styles["BodyBold"])], *e_rows],
        colWidths=[168 * mm],
    )
    extracted_card.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  Brand.AMBER_LIGHT),
        ("BACKGROUND",    (0, 1), (-1, -1), Brand.CARD_BG),
        ("BOX",           (0, 0), (-1, -1), 0.8, Brand.AMBER_MID),
        ("INNERGRID",     (0, 1), (-1, -1), 0.3, Brand.BORDER_SOFT),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(extracted_card)

    # ── Sentiment ─────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.extend([_section_header("Sentiment Analysis", styles), Spacer(1, 6)])
    if sentiment_rows:
        story.extend(_format_sentiment_timeline(sentiment_rows[:150], styles, fonts))
    else:
        story.append(Paragraph("No sentence-level sentiment data.", styles["Subtle"]))

    # ── Analytics ─────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.extend([_section_header("Analytics", styles), Spacer(1, 6)])
    metrics_rows = [
        ("Total Call Duration",          str(perf.get("TotalCallDuration", "N/A"))),
        ("Silence Time",                 str(perf.get("SilenceTime", "N/A"))),
        ("Total Processing Time (sec)",  str(processing.get("total_processing_time_sec", "N/A"))),
        ("Transcription Time (sec)",     str(processing.get("transcription_time_sec", "N/A"))),
        ("Analysis Time (sec)",          str(processing.get("analysis_time_sec", "N/A"))),
        ("LLM Total Tokens",             str(llm_usage.get("total_tokens", "N/A"))),
        ("LLM Prompt Tokens",            str(llm_usage.get("prompt_tokens", "N/A"))),
        ("LLM Output Tokens",            str(llm_usage.get("candidate_tokens", "N/A"))),
    ]
    metrics = Table(
        [[Paragraph(f"<b>{k}</b>", styles["BodyX"]), Paragraph(v, styles["BodyX"])] for k, v in metrics_rows],
        colWidths=[62 * mm, 106 * mm],
    )
    metrics.setStyle(_meta_table_style())
    story.append(KeepTogether([Paragraph("<b>Processing Metrics</b>", styles["BodyBold"]), metrics]))
    story.append(Spacer(1, 8))

    talk_drawing, talk_legend = _talktime_chart(talk_map)
    keywords_drawing = _keyword_chart(keyword_counts, fonts)

    talk_block = [Paragraph("<b>Talk-Time Distribution</b>", styles["BodyBold"])]
    if talk_drawing:
        talk_block.append(talk_drawing)
        if talk_legend:
            legend_tbl = Table(
                [[Paragraph(f"<b>{name}</b>", styles["BodyX"]), Paragraph(val, styles["BodyX"])] for name, val in talk_legend],
                colWidths=[90 * mm, 78 * mm],
            )
            legend_tbl.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), Brand.CARD_BG),
                ("BOX",           (0, 0), (-1, -1), 0.6, Brand.BORDER),
                ("INNERGRID",     (0, 0), (-1, -1), 0.3, Brand.BORDER_SOFT),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                ("TOPPADDING",    (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            talk_block.append(legend_tbl)
    else:
        talk_block.append(Paragraph("No talk-time data available.", styles["Subtle"]))
    story.append(KeepTogether(talk_block))
    story.append(Spacer(1, 8))

    keyword_block = [Paragraph("<b>Top Keywords</b>", styles["BodyBold"])]
    if keywords_drawing:
        keyword_block.append(keywords_drawing)
    else:
        keyword_block.append(Paragraph("No keyword chart data available.", styles["Subtle"]))
    story.append(KeepTogether(keyword_block))

    _trim_story(story)
    doc.build(story)
    buffer.seek(0)
    return buffer.read()


# ─────────────────────────────────────────────────────────────────────────────
# Unchanged helper functions below (language selection, key normalisation, etc.)
# ─────────────────────────────────────────────────────────────────────────────

def _source_lang_code_from_response(response_obj: ApiResponses) -> str:
    variants = (response_obj.normalized_transcript or {}).get("variants", {})
    return ((variants.get("original") or {}).get("language") or "en").lower()


def _normalize_insights_keys(insights: dict) -> dict:
    if not isinstance(insights, dict):
        return insights

    def _canon_sentiment(value):
        v = str(value or "").strip().lower()
        if v == "positive": 
            return "Positive"
        if v == "negative": 
            return "Negative"
        if v == "neutral":  
            return "Neutral"
        return "Unknown"

    def _canon_resolution(value):
        v = str(value or "").strip().lower()
        if v == "resolved":  
            return "Resolved"
        if v == "unresolved":
            return "Unresolved"
        if v == "pending":   
            return "Pending"
        if v in {"not applicable","not-applicable","non applicable","n/a","na"}: 
            return "Not Applicable"
        return "Unknown"

    def _canon_churn(value):
        v = str(value or "").strip().lower()
        if v == "high":  
            return "High"
        if v == "medium": 
            return "Medium"
        if v == "low":   
            return "Low"
        if v in {"not applicable","not-applicable","non applicable","n/a","na"}:
            return "Not Applicable"
        return "Unknown"

    if "OverallSentiment" not in insights and "Sentiment" in insights:
        insights["OverallSentiment"] = insights.get("Sentiment")
    insights.pop("Sentiment", None)
    if "OverallSentiment" in insights:
        insights["OverallSentiment"] = _canon_sentiment(insights.get("OverallSentiment"))

    resolution = insights.get("ResolutionData")
    if isinstance(resolution, dict):
        resolution["Status"] = _canon_resolution(resolution.get("Status"))
        insights["ResolutionData"] = resolution

    churn = insights.get("ChurnRisk")
    if isinstance(churn, dict):
        churn["Level"] = _canon_churn(churn.get("Level"))
        insights["ChurnRisk"] = churn

    return insights


def _merge_canonical_enums(translated: dict, canonical: dict) -> dict:
    if not isinstance(translated, dict):
        return translated
    if not isinstance(canonical, dict): 
        return translated
    out = dict(translated)
    if "OverallSentiment" in canonical:
        out["OverallSentiment"] = canonical.get("OverallSentiment")
    translated_resolution = out.get("ResolutionData")
    canonical_resolution  = canonical.get("ResolutionData")
    if isinstance(canonical_resolution, dict):
        if not isinstance(translated_resolution, dict):
            translated_resolution = {}
        translated_resolution["Status"] = canonical_resolution.get("Status")
        out["ResolutionData"] = translated_resolution
    translated_churn = out.get("ChurnRisk")
    canonical_churn  = canonical.get("ChurnRisk")
    if isinstance(canonical_churn, dict):
        if not isinstance(translated_churn, dict):
            translated_churn = {}
        translated_churn["Level"] = canonical_churn.get("Level")
        out["ChurnRisk"] = translated_churn
    return out


def _select_insights_view(response_obj: ApiResponses, analysis_language: str, db: Session):
    canonical   = _normalize_insights_keys(response_obj.normalized_insights or {})
    source_lang = _source_lang_code_from_response(response_obj)

    if analysis_language == "en" or source_lang == "en":
        return canonical, canonical, source_lang, ["en"] if source_lang == "en" else ["en", "original"]

    cache      = response_obj.analysis_translations or {}
    translated = _normalize_insights_keys(cache.get(source_lang))
    if translated:
        translated = _merge_canonical_enums(translated, canonical)
    translated_changed = translated != cache.get(source_lang)
    if not translated:
        translated = translate_analysis_insights(canonical, source_lang)
        translated = _normalize_insights_keys(translated)
        translated = _merge_canonical_enums(translated, canonical)
        cache[source_lang] = translated
        response_obj.analysis_translations = cache
        db.commit()
        db.refresh(response_obj)
    elif translated_changed:
        cache[source_lang] = translated
        response_obj.analysis_translations = cache
        db.commit()
        db.refresh(response_obj)

    return _normalize_insights_keys(translated), canonical, source_lang, ["en", "original"]