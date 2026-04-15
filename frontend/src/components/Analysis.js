import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Chip,
  Alert,
  Select,
  Menu,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  TextField,
  InputAdornment,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material/styles";
import { useParams, useNavigate } from "react-router-dom";
import { assetsAPI } from "../services/api";
import api from "../services/api";
import AskAI from "./AskAI";
import WaveformPlayer from "./WaveformPlayer";

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER UTILITIES
───────────────────────────────────────────────────────────────────────────── */

const isEmpty = (val) => {
  if (val === null || val === undefined || val === "" || val === "-") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true;
  return false;
};

const normalizeSentiment = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "positive") return "Positive";
  if (v === "negative") return "Negative";
  if (v === "neutral")  return "Neutral";
  return "Unknown";
};

const normalizeResolutionStatus = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "resolved")   return "Resolved";
  if (v === "unresolved") return "Unresolved";
  if (v === "pending")    return "Pending";
  if (["not applicable","not-applicable","non applicable","n/a","na"].includes(v)) return "Not Applicable";
  return "Unknown";
};

const normalizeChurnLevel = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "high")   return "High";
  if (v === "medium") return "Medium";
  if (v === "low")    return "Low";
  if (["not applicable","not-applicable","non applicable","n/a","na"].includes(v)) return "Not Applicable";
  return "Unknown";
};

const sentimentColor = (value) => {
  const n = normalizeSentiment(value);
  if (n === "Positive") return "success";
  if (n === "Negative") return "error";
  if (n === "Neutral")  return "info";
  return "default";
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

/** Inline italic placeholder when a field has no data */
const FieldEmpty = ({ message = "No data available", compact = false }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: compact ? 0 : 0.5,
        py: compact ? 0 : 0.25,
      }}
    >
      <Typography
        sx={{
          fontSize: compact ? "0.75rem" : "0.8125rem",
          color: theme.palette.text.disabled,
          fontStyle: "italic",
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

/** Section heading label */
const SectionLabel = ({ children, mt = 3 }) => {
  const theme = useTheme();
  return (
    <Typography
      sx={{
        mt,
        mb: 1.25,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: theme.palette.text.disabled,
      }}
    >
      {children}
    </Typography>
  );
};

/** Bordered info surface */
const InfoSurface = ({ children, noPad = false }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: "6px",
        backgroundColor: theme.palette.background.paper,
        ...(noPad ? {} : { px: 2, py: 1.75 }),
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
};

/** Key–value row inside a metrics block */
const MetricRow = ({ label, value, indent = false }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: indent ? 3.5 : 2,
        py: 1.4,
        borderBottom: `1px solid ${theme.palette.divider}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography
        sx={{
          fontSize: "0.8125rem",
          color: indent ? theme.palette.text.secondary : theme.palette.text.primary,
          fontWeight: indent ? 400 : 500,
        }}
      >
        {indent ? `\u2022 ${label}` : label}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"DM Mono", "Fira Code", monospace',
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: theme.palette.text.primary,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */

const Analysis = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const amber = theme.palette.primary.main;

  /* ── State ── */
  const [analysis,         setAnalysis]         = useState(null);
  const [analysisLoading,  setAnalysisLoading]  = useState(false);
  const [transcript,       setTranscript]       = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [tabValue,         setTabValue]         = useState(0);
  const [currentTime,      setCurrentTime]      = useState(0);
  const [audioSrc,         setAudioSrc]         = useState(null);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [searchMatchPointer, setSearchMatchPointer] = useState(-1);
  const [exportAnchorEl,   setExportAnchorEl]   = useState(null);
  const [selectedTranscriptVariant, setSelectedTranscriptVariant] = useState("original");
  const [analysisLanguage, setAnalysisLanguage] = useState("en");

  const activeRef           = React.useRef(null);
  const lastActiveIndexRef  = React.useRef(null);
  const analysisCacheRef    = React.useRef({});
  const waveformPlayerRef   = React.useRef(null);

  /* ── Data fetching ── */
  const fetchAnalysis = useCallback(async () => {
    const cacheKey = `${assetId}:${analysisLanguage}`;
    const cached   = analysisCacheRef.current[cacheKey];
    if (cached) { setAnalysis(cached); return; }
    setAnalysisLoading(true);
    try {
      const response = await assetsAPI.getAnalysis(assetId, analysisLanguage);
      analysisCacheRef.current[cacheKey] = response.data;
      setAnalysis(response.data);
    } catch {
      setError("Failed to load analysis.");
    } finally {
      setAnalysisLoading(false);
    }
  }, [assetId, analysisLanguage]);

  const fetchTranscript = useCallback(async () => {
    try {
      const response = await assetsAPI.getTranscript(assetId);
      setTranscript(response.data);
    } catch {}
    finally { setLoading(false); }
  }, [assetId]);

  useEffect(() => { fetchAnalysis();  }, [fetchAnalysis]);
  useEffect(() => { fetchTranscript(); }, [fetchTranscript]);

  /* Prefetch original-language analysis */
  useEffect(() => {
    const canPrefetch =
      analysisLanguage === "en" &&
      analysis?.available_analysis_languages?.includes("original");
    if (!canPrefetch) return;
    const cacheKey = `${assetId}:original`;
    if (analysisCacheRef.current[cacheKey]) return;
    let active = true;
    assetsAPI.getAnalysis(assetId, "original")
      .then((res) => { if (active) analysisCacheRef.current[cacheKey] = res.data; })
      .catch(() => {});
    return () => { active = false; };
  }, [analysis, analysisLanguage, assetId]);

  /* Audio blob */
  useEffect(() => {
    let objectUrl = null;
    const loadAudio = async () => {
      try {
        const response = await api.get(`/assets/${assetId}/audio`, { responseType: "blob" });
        objectUrl = URL.createObjectURL(response.data);
        setAudioSrc(objectUrl);
      } catch {}
    };
    loadAudio();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);

  const handleTimeUpdate = useCallback((ms) => setCurrentTime(ms), []);

  /* ── Derived data ── */
  const performanceMetrics = analysis?.performance_metrics || {};
  const talkRaw            = performanceMetrics?.RawTalkTimeMs     || {};
  const callDuration       = performanceMetrics?.TotalCallDuration;
  const silenceTime        = performanceMetrics?.SilenceTime;
  const talkRatio          = performanceMetrics?.TalkListenRatio   || {};
  const master             = analysis?.master_json                  || {};
  const proc               = master?.processing_metrics             || {};
  const llmUsage           = master?.usage?.llm                    || {};
  const displayInsights    = analysis?.normalized_insights          || {};
  const canonicalInsights  = analysis?.normalized_insights_en || analysis?.normalized_insights || {};
  const insights           = displayInsights;

  /* Export helpers */
  const openExportMenu  = (e) => setExportAnchorEl(e.currentTarget);
  const closeExportMenu = ()  => setExportAnchorEl(null);
  const downloadTranscript = (format) => {
    window.open(assetsAPI.getTranscriptExportUrl(assetId, format), "_blank");
    closeExportMenu();
  };
  const downloadAnalysis = (format, lang = analysisLanguage) => {
    window.open(assetsAPI.getAnalysisExportUrl(assetId, format, lang), "_blank");
    closeExportMenu();
  };
  const formatTalkRatioValue = (value) =>
    (value === null || value === undefined || value === "") ? "Not Applicable" : String(value);

  /* Talk-time chart data */
  const talkData = Object.entries(talkRaw).map(([name, value]) => ({
    name,
    value: Math.round(value / 1000),
  }));

  /* Keyword chart data */
  const keywordObj      = canonicalInsights?.KeywordCounts || {};
  const sortedKeywords  = Object.entries(keywordObj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, value]) => ({ text, value }));

  /* ── ECharts options ── */
  const CHART_COLORS = [
    amber, "#2CB67D", "#5B9CF6", "#E05252", "#9B6A1F",
    "#A855F7", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6",
    "#D4CD06", "#48E4EC", "#852D54", "#634B21", "#5F5A5A",
  ];

  const legendScrollable =
    talkData.length > 12 ||
    talkData.some((d) => String(d.name || "").length > 24);

  const talkTimeOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}s ({d}%)",
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.divider,
      borderWidth: 1,
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 12,
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 600,
      },
    },
    legend: {
      type: legendScrollable ? "scroll" : "plain",
      orient: "vertical",
      right: 12,
      top: 28,
      bottom: 28,
      itemWidth: 10,
      itemHeight: 8,
      itemGap: 10,
      pageIconColor: theme.palette.text.primary,
      pageTextStyle: { color: theme.palette.text.secondary },
      textStyle: {
        color: theme.palette.text.primary,
        fontSize: 12,
        fontFamily: '"DM Sans", sans-serif',
        width: 160,
        overflow: "truncate",
      },
      formatter: (name) => {
        const s = String(name || "");
        return s.length > 28 ? `${s.slice(0, 27)}\u2026` : s;
      },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "68%"],
        center: ["32%", "50%"],
        minAngle: 3,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: talkData.map((d, i) => ({
          value: d.value,
          name:  d.name,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  };

  const keywordBarOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.divider,
      borderWidth: 1,
      textStyle: {
        color: theme.palette.text.secondary,
        fontSize: 12,
        fontFamily: '"DM Sans", sans-serif',
      },
    },
    grid: { left: 80, right: 24, top: 12, bottom: 32 },
    xAxis: {
      type: "value",
      axisLine:  { lineStyle: { color: theme.palette.divider } },
      splitLine: { lineStyle: { color: theme.palette.divider, opacity: 0.5 } },
      axisLabel: { color: theme.palette.text.secondary, fontSize: 11, fontFamily: '"DM Sans", sans-serif' },
    },
    yAxis: {
      type: "category",
      inverse: true,
      axisLabel: {
        color: theme.palette.text.primary,
        fontWeight: 500,
        fontSize: 12,
        fontFamily: '"DM Sans", sans-serif',
      },
      axisLine: { lineStyle: { color: theme.palette.divider } },
      data: sortedKeywords.map((k) => k.text),
    },
    series: [
      {
        type: "bar",
        data: sortedKeywords.map((k) => k.value),
        itemStyle: {
          color: amber,
          borderRadius: [0, 4, 4, 0],
          opacity: 0.85,
        },
        emphasis: {
          itemStyle: { color: theme.palette.primary.light, opacity: 1 },
        },
      },
    ],
  };

  /* ── Transcript state ── */
  const sentenceSentiment = useMemo(
    () => analysis?.sentence_sentiment ?? [],
    [analysis?.sentence_sentiment]
  );

  const transcriptVariants = useMemo(
    () => transcript?.variants ?? {},
    [transcript?.variants]
  );

  const availableTranscriptVariants = useMemo(() => {
    return Object.keys(transcriptVariants);
  }, [transcriptVariants]);

  const utterances = useMemo(() => {
    if (selectedTranscriptVariant === "en") {
      return transcriptVariants?.en?.utterances ?? transcript?.utterances ?? [];
    }
    return transcriptVariants?.original?.utterances ?? transcript?.utterances ?? [];
  }, [selectedTranscriptVariant, transcriptVariants, transcript?.utterances]);

  useEffect(() => {
    if (!availableTranscriptVariants.length) return;
    if (!availableTranscriptVariants.includes(selectedTranscriptVariant)) {
      setSelectedTranscriptVariant(
        availableTranscriptVariants.includes("original")
          ? "original"
          : availableTranscriptVariants[0]
      );
    }
  }, [availableTranscriptVariants, selectedTranscriptVariant]);

  /* ── Transcript search ── */
  const transcriptMatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    utterances.forEach((u, idx) => {
      if (String(u?.text || "").toLowerCase().includes(q)) hits.push(idx);
    });
    return hits;
  }, [utterances, searchTerm]);

  const activeSearchUtteranceIndex =
    searchMatchPointer >= 0 && transcriptMatches.length > 0
      ? transcriptMatches[searchMatchPointer]
      : -1;

  useEffect(() => {
    if (!searchTerm.trim() || transcriptMatches.length === 0) {
      setSearchMatchPointer(-1);
      return;
    }
    setSearchMatchPointer(0);
  }, [searchTerm, transcriptMatches.length]);

  useEffect(() => {
    if (tabValue !== 4 || activeSearchUtteranceIndex < 0) return;
    document
      .getElementById(`utt-${activeSearchUtteranceIndex}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tabValue, activeSearchUtteranceIndex]);

  const gotoPrevSearchMatch = () => {
    if (!transcriptMatches.length) return;
    setSearchMatchPointer((p) => (p <= 0 ? transcriptMatches.length - 1 : p - 1));
  };
  const gotoNextSearchMatch = () => {
    if (!transcriptMatches.length) return;
    setSearchMatchPointer((p) => (p >= transcriptMatches.length - 1 ? 0 : p + 1));
  };

  /* Auto-scroll active utterance */
  const activeIndex = utterances.findIndex(
    (u) => currentTime >= u.start && currentTime <= u.end
  );
  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== lastActiveIndexRef.current) {
      lastActiveIndexRef.current = activeIndex;
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  /* ── Format helpers ── */
  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (ms) => {
    if (ms === undefined || ms === null) return "-";
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatSpeakerLabel = (speakerId, role) => {
    if (!speakerId) return role || "Speaker";
    const number = speakerId.split("_")[1];
    const name   = number ? `Speaker ${parseInt(number) + 1}` : speakerId;
    return role ? `${name} (${role})` : name;
  };

  const speakerColors = [
    "#6366F1", "#2CB67D", "#F59E0B", "#E05252", "#A855F7",
    amber,     "#EC4899", "#0C4B21", "#48E4EC", "#4F2846",
  ];
  const getSpeakerColor = (speakerId) => {
    if (!speakerId) return "#64748B";
    return speakerColors[parseInt(speakerId.split("_")[1] || 0) % speakerColors.length];
  };

  /* Highlight search matches */
  const highlightText = (text) => {
    if (!searchTerm) return text;
    const esc   = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${esc(searchTerm)})`, "gi");
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark
          key={i}
          style={{
            background: isDark ? "rgba(232,160,69,0.38)" : "rgba(232,160,69,0.32)",
            color:      isDark ? "#F0C070" : "#7A4E00",
            padding:    "0 2px",
            borderRadius: 2,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  /* Recursive extracted info renderer */
  const renderExtractedInfo = (data, level = 0) => {
    if (!data) return null;

    if (typeof data === "string" || typeof data === "number") {
      return (
        <Typography sx={{ ml: level * 2, fontSize: "0.8125rem", color: theme.palette.text.primary, mb: 0.25 }}>
          {"• "}{String(data)}
        </Typography>
      );
    }

    if (Array.isArray(data)) {
      return data.map((item, i) => <Box key={i}>{renderExtractedInfo(item, level)}</Box>);
    }

    if (data.Key !== undefined && data.Value !== undefined) {
      if (Array.isArray(data.Value)) {
        return (
          <Box sx={{ ml: level * 2 }}>
            <Typography sx={{ fontSize: "0.8125rem", mb: 0.25 }}>{"• "}{data.Key}</Typography>
            {data.Value.map((child, idx) => (
              <Box key={idx}>{renderExtractedInfo(child, level + 1)}</Box>
            ))}
          </Box>
        );
      }
      if (typeof data.Value === "object" && data.Value !== null) {
        return (
          <Box sx={{ ml: level * 2 }}>
            <Typography sx={{ fontSize: "0.8125rem", mb: 0.25 }}>{"• "}{data.Key}</Typography>
            {renderExtractedInfo(data.Value, level + 1)}
          </Box>
        );
      }
      return (
        <Typography sx={{ ml: level * 2, fontSize: "0.8125rem", mb: 0.25 }}>
          {"• "}
          <Box component="span" sx={{ color: theme.palette.text.secondary }}>{data.Key}</Box>
          {" \u2014 "}{String(data.Value)}
        </Typography>
      );
    }

    return Object.entries(data).map(([key, value]) => (
      <Box key={key} sx={{ ml: level * 2 }}>
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: theme.palette.text.secondary, mb: 0.25 }}>
          {"• "}{key}
        </Typography>
        {renderExtractedInfo(value, level + 1)}
      </Box>
    ));
  };

  /* ── Loading skeleton ── */
  if (loading || (analysisLoading && !analysis)) {
    return (
      <Box>
        <Skeleton variant="text" width={100} height={32} sx={{ mb: 3 }} />
        <Skeleton variant="text" width="38%" height={42} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="58%" height={20} sx={{ mb: 3 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: "6px" }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={44} sx={{ borderRadius: "6px", mb: 0.5 }} />
        <Skeleton variant="rectangular" height={440} sx={{ borderRadius: "6px" }} />
      </Box>
    );
  }

  /* ── Error state ── */
  if (error || !analysis) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
          onClick={() => navigate("/assets")}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Alert severity="error">{error || "Analysis not available"}</Alert>
      </Box>
    );
  }

  /* ── Computed display values ── */
  const durationFormatted = formatDuration(analysis.call_length);
  const resolutionStatus  = normalizeResolutionStatus(insights?.ResolutionData?.Status);
  const churnLevel        = normalizeChurnLevel(insights?.ChurnRisk?.Level);
  const statusColor = { Resolved: "success", Unresolved: "error", Pending: "warning" };
  const churnColor  = { High: "error",       Medium: "warning",   Low: "success"     };

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <Box>

      {/* ── Top action bar ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
          onClick={() => navigate("/assets")}
          variant="outlined"
          size="small"
          sx={{
            fontSize: "0.8125rem",
            py: 0.5, px: 1.5,
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            "&:hover": { borderColor: amber + "60", color: amber },
          }}
        >
          Back to assets
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          {/* Analysis language switcher */}
          {analysis?.available_analysis_languages?.includes("original") && (
            <Box>
              <Select
                size="small"
                value={analysisLanguage}
                onChange={(e) => setAnalysisLanguage(e.target.value)}
                disabled={analysisLoading}
                sx={{ fontSize: "0.8125rem", height: 34, minWidth: 180 }}
              >
                <MenuItem value="en">Analysis: English</MenuItem>
                <MenuItem value="original">Analysis: Original</MenuItem>
              </Select>
              {analysisLoading && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                >
                  Updating&hellip;
                </Typography>
              )}
            </Box>
          )}

          {/* Export menu */}
          <Button
            variant="outlined"
            size="small"
            endIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
            onClick={openExportMenu}
            sx={{
              fontSize: "0.8125rem",
              py: 0.5, px: 1.5, height: 34,
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              "&:hover": { borderColor: amber + "60", color: amber },
            }}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportAnchorEl}
            open={Boolean(exportAnchorEl)}
            onClose={closeExportMenu}
          >
            <MenuItem
              onClick={() => downloadTranscript("pdf")}
              sx={{ fontSize: "0.8125rem" }}
            >
              Download Transcript PDF
            </MenuItem>
            <MenuItem
              onClick={() => downloadAnalysis("pdf", "en")}
              sx={{ fontSize: "0.8125rem" }}
            >
              Download Analysis PDF (English)
            </MenuItem>
            <MenuItem
              onClick={() => downloadAnalysis("pdf", "original")}
              disabled={!(analysis?.available_analysis_languages ?? []).includes("original")}
              sx={{ fontSize: "0.8125rem" }}
            >
              Download Analysis PDF (Original)
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* ── File header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: "1.6rem",
            fontWeight: 400,
            color: theme.palette.text.primary,
            mb: 0.25,
          }}
        >
          Analysis
        </Typography>
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: theme.palette.text.secondary,
            fontFamily: '"DM Mono", monospace',
            letterSpacing: "-0.01em",
            wordBreak: "break-all",
          }}
        >
          {analysis.filename}
        </Typography>
      </Box>

      {/* ── Summary metric cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Language",
            content: isEmpty(analysis.language) ? (
              <FieldEmpty message="Not detected" compact />
            ) : (
              <Typography
                sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              >
                {analysis.language.toUpperCase()}
              </Typography>
            ),
          },
          {
            label: "Duration",
            content: !durationFormatted ? (
              <FieldEmpty message="Unavailable" compact />
            ) : (
              <Typography
                sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              >
                {durationFormatted}
              </Typography>
            ),
          },
          {
            label: "Overall Sentiment",
            content: isEmpty(insights.OverallSentiment || insights.Sentiment) ? (
              <FieldEmpty message="Not analysed" compact />
            ) : (
              <Chip
                label={normalizeSentiment(insights.OverallSentiment || insights.Sentiment)}
                color={sentimentColor(insights.OverallSentiment || insights.Sentiment)}
              />
            ),
          },
        ].map(({ label, content }) => (
          <Grid item xs={12} sm={4} key={label}>
            <Box
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "6px",
                backgroundColor: theme.palette.background.paper,
                px: 2,
                py: 1.75,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: theme.palette.text.disabled,
                  mb: 0.75,
                }}
              >
                {label}
              </Typography>
              {content}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* ══════════════════════════════════════════════════════════════════
          TAB PANEL
      ══════════════════════════════════════════════════════════════════ */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {["Call Summary","Insights","General Info","Sentiment Analysis","Transcript","Analytics","Ask AI"].map(
            (label) => <Tab key={label} label={label} />
          )}
        </Tabs>

        {/* ════════════════ TAB 0 — Call Summary ════════════════ */}
        {tabValue === 0 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>

            <SectionLabel mt={0}>Call Type</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.CallType)
                ? <FieldEmpty message="Call type was not identified" />
                : <Typography sx={{ fontSize: "0.9rem" }}>{insights.CallType}</Typography>}
            </InfoSurface>

            <SectionLabel>Audio Environment</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.AudioEnvironment)
                ? <FieldEmpty message="Audio environment details not captured" />
                : <Typography sx={{ fontSize: "0.9rem" }}>{insights.AudioEnvironment}</Typography>}
            </InfoSurface>

            <SectionLabel>Participants</SectionLabel>
            {isEmpty(insights.Participants)
              ? <InfoSurface><FieldEmpty message="No participant information found" /></InfoSurface>
              : (insights.Participants || []).map((p, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <InfoSurface>
                    <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {["name", "role"].map((field) => (
                        <Box key={field}>
                          <Typography
                            sx={{
                              fontSize: "0.6875rem", fontWeight: 600,
                              letterSpacing: "0.06em", textTransform: "uppercase",
                              color: theme.palette.text.disabled, mb: 0.25,
                            }}
                          >
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              color: isEmpty(p[field]) ? theme.palette.text.disabled : theme.palette.text.primary,
                              fontStyle: isEmpty(p[field]) ? "italic" : "normal",
                              fontWeight: 500,
                            }}
                          >
                            {isEmpty(p[field]) ? "not provided" : p[field]}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </InfoSurface>
                </Box>
              ))
            }

            <SectionLabel>Call Summary</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.CallSummary)
                ? <FieldEmpty message="No summary was generated for this call" />
                : (
                  <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.7, color: theme.palette.text.primary }}>
                    {insights.CallSummary}
                  </Typography>
                )}
            </InfoSurface>

            <Grid container spacing={2} sx={{ mt: 0 }}>
              {/* Resolution */}
              <Grid item xs={12} md={6}>
                <SectionLabel mt={2}>Resolution Data</SectionLabel>
                <InfoSurface noPad>
                  {isEmpty(insights.ResolutionData) ? (
                    <Box sx={{ px: 2, py: 1.75 }}><FieldEmpty message="Resolution data not available" /></Box>
                  ) : (
                    <>
                      <Box
                        sx={{
                          px: 2, py: 1.5,
                          display: "flex", alignItems: "center", gap: 1.5,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.75rem", color: theme.palette.text.disabled, minWidth: 48 }}>
                          Status
                        </Typography>
                        {isEmpty(insights.ResolutionData?.Status) ? (
                          <FieldEmpty message="unknown" compact />
                        ) : (
                          <Chip
                            label={resolutionStatus}
                            size="small"
                            color={statusColor[resolutionStatus] || "default"}
                          />
                        )}
                      </Box>
                      <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography sx={{ fontSize: "0.75rem", color: theme.palette.text.disabled, mb: 0.5 }}>
                          Reason
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: isEmpty(insights.ResolutionData?.Reason)
                              ? theme.palette.text.disabled
                              : theme.palette.text.primary,
                            fontStyle: isEmpty(insights.ResolutionData?.Reason) ? "italic" : "normal",
                          }}
                        >
                          {isEmpty(insights.ResolutionData?.Reason) ? "no reason recorded" : insights.ResolutionData.Reason}
                        </Typography>
                      </Box>
                    </>
                  )}
                </InfoSurface>
              </Grid>

              {/* Churn Risk */}
              <Grid item xs={12} md={6}>
                <SectionLabel mt={2}>Churn Risk</SectionLabel>
                <InfoSurface noPad>
                  {isEmpty(insights.ChurnRisk) ? (
                    <Box sx={{ px: 2, py: 1.75 }}><FieldEmpty message="Churn risk assessment not available" /></Box>
                  ) : (
                    <>
                      <Box
                        sx={{
                          px: 2, py: 1.5,
                          display: "flex", alignItems: "center", gap: 1.5,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.75rem", color: theme.palette.text.disabled, minWidth: 48 }}>
                          Level
                        </Typography>
                        {isEmpty(insights.ChurnRisk?.Level) ? (
                          <FieldEmpty message="unknown" compact />
                        ) : (
                          <Chip
                            label={churnLevel}
                            size="small"
                            color={churnColor[churnLevel] || "default"}
                          />
                        )}
                      </Box>
                      <Box sx={{ px: 2, py: 1.5 }}>
                        <Typography sx={{ fontSize: "0.75rem", color: theme.palette.text.disabled, mb: 0.5 }}>
                          Reason
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: isEmpty(insights.ChurnRisk?.Reason)
                              ? theme.palette.text.disabled
                              : theme.palette.text.primary,
                            fontStyle: isEmpty(insights.ChurnRisk?.Reason) ? "italic" : "normal",
                          }}
                        >
                          {isEmpty(insights.ChurnRisk?.Reason) ? "no reason recorded" : insights.ChurnRisk.Reason}
                        </Typography>
                      </Box>
                    </>
                  )}
                </InfoSurface>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ════════════════ TAB 1 — Insights ════════════════ */}
        {tabValue === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>

            <SectionLabel mt={0}>Strengths</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.KeyStrengths)
                ? <FieldEmpty message="No strengths were identified for this call" />
                : (insights.KeyStrengths || []).map((s, i) => (
                  <Typography key={i} sx={{ fontSize: "0.875rem", mb: 0.5 }}>
                    <Box component="span" sx={{ color: "#2CB67D", mr: 1 }}>&#10003;</Box>{s}
                  </Typography>
                ))}
            </InfoSurface>

            <SectionLabel>Areas of Improvement</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.AreasOfImprovement)
                ? <FieldEmpty message="No improvement areas were flagged" />
                : (insights.AreasOfImprovement || []).map((s, i) => (
                  <Typography key={i} sx={{ fontSize: "0.875rem", mb: 0.5 }}>
                    <Box component="span" sx={{ color: amber, mr: 1 }}>&#8594;</Box>{s}
                  </Typography>
                ))}
            </InfoSurface>

            <SectionLabel>Keywords</SectionLabel>
            {isEmpty(insights.KeywordCounts) ? (
              <InfoSurface><FieldEmpty message="No keywords were extracted" /></InfoSurface>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {Object.entries(insights.KeywordCounts).map(([k, v]) => (
                  <Box
                    key={k}
                    sx={{
                      display: "inline-flex", alignItems: "center", gap: 0.75,
                      px: 1.25, py: 0.4,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: "4px",
                      backgroundColor: theme.palette.background.paper,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>{k}</Typography>
                    <Box
                      sx={{
                        px: 0.6, py: 0.1, borderRadius: "3px",
                        backgroundColor: amber + "20",
                        border: `1px solid ${amber}30`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.6875rem",
                          fontFamily: '"DM Mono", monospace',
                          color: amber, fontWeight: 500,
                        }}
                      >
                        {v}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ════════════════ TAB 2 — General Info ════════════════ */}
        {tabValue === 2 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>

            <SectionLabel mt={0}>Topics</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.Topics)
                ? <FieldEmpty message="No topics were identified" />
                : (insights.Topics || []).map((t, i) => (
                  <Typography key={i} sx={{ fontSize: "0.875rem", mb: 0.5 }}>
                    {"• "}
                    <Box component="span" sx={{ fontWeight: 500 }}>{t.topic}</Box>
                    {t.description && (
                      <Box component="span" sx={{ color: theme.palette.text.secondary }}>
                        {" \u2014 "}{t.description}
                      </Box>
                    )}
                  </Typography>
                ))}
            </InfoSurface>

            <SectionLabel>Technical Terms</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.TechnicalTerms)
                ? <FieldEmpty message="No technical terms were detected" />
                : (insights.TechnicalTerms || []).map((t, i) => (
                  <Typography key={i} sx={{ fontSize: "0.875rem", mb: 0.5 }}>
                    {"• "}
                    <Box component="span" sx={{ fontWeight: 500, fontFamily: '"DM Mono", monospace', fontSize: "0.8125rem" }}>
                      {t.term}
                    </Box>
                    {t.explanation && (
                      <Box component="span" sx={{ color: theme.palette.text.secondary, fontFamily: "inherit" }}>
                        {" \u2014 "}{t.explanation}
                      </Box>
                    )}
                  </Typography>
                ))}
            </InfoSurface>

            <SectionLabel>Tasks</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.Tasks)
                ? <FieldEmpty message="No tasks or action items were found" />
                : (insights.Tasks || []).map((task, i) => (
                  <Box
                    key={i}
                    sx={{
                      mb: 1.5, pb: 1.5,
                      borderBottom: i < insights.Tasks.length - 1
                        ? `1px solid ${theme.palette.divider}`
                        : "none",
                    }}
                  >
                    {typeof task === "string" && (
                      <Typography sx={{ fontSize: "0.875rem" }}>{"• "}{task}</Typography>
                    )}
                    {typeof task === "object" && !Array.isArray(task) &&
                      Object.entries(task).map(([key, value], idx) => (
                        <Box key={idx} sx={{ display: "flex", gap: 1, mb: 0.25 }}>
                          <Typography
                            sx={{
                              fontSize: "0.75rem", fontWeight: 600,
                              color: theme.palette.text.disabled,
                              minWidth: 72, textTransform: "uppercase",
                              letterSpacing: "0.05em", pt: 0.1, flexShrink: 0,
                            }}
                          >
                            {key}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              color: isEmpty(value) ? theme.palette.text.disabled : theme.palette.text.primary,
                              fontStyle: isEmpty(value) ? "italic" : "normal",
                              flex: 1,
                            }}
                          >
                            {isEmpty(value)
                              ? "not specified"
                              : typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </Typography>
                        </Box>
                      ))
                    }
                  </Box>
                ))}
            </InfoSurface>

            <SectionLabel>Extracted Information</SectionLabel>
            <InfoSurface>
              {isEmpty(insights.ExtractedInformation)
                ? <FieldEmpty message="No structured information was extracted" />
                : renderExtractedInfo(insights.ExtractedInformation)}
            </InfoSurface>
          </Box>
        )}

        {/* ════════════════ TAB 3 — Sentiment Analysis ════════════════ */}
        {tabValue === 3 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {isEmpty(sentenceSentiment)
              ? <FieldEmpty message="Sentence-level sentiment analysis was not performed on this call" />
              : sentenceSentiment.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex", gap: 1.5, mb: 1.5,
                    p: 1.75,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "6px",
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <Chip
                    label={normalizeSentiment(item.sentiment)}
                    color={sentimentColor(item.sentiment)}
                    size="small"
                    sx={{ mt: 0.125, flexShrink: 0, height: 20, fontSize: "0.6875rem" }}
                  />
                  <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
                    {item.text}
                  </Typography>
                </Box>
              ))}
          </Box>
        )}

        {/* ════════════════ TAB 4 — Transcript ════════════════ */}
        {tabValue === 4 && (
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              display: "flex",
              flexDirection: "column",
              height: "72vh",
            }}
          >
            {/* Toolbar */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              {/* Transcript language selector — shown when both original and en variants exist */}
              <Box
  sx={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1.5,
    mb: 2,
    flexWrap: "wrap",
  }}
>
  {/* LEFT: Transcript selector */}
  {availableTranscriptVariants.length > 1 && (
    <Select
      size="small"
      value={selectedTranscriptVariant}
      onChange={(e) => setSelectedTranscriptVariant(e.target.value)}
      sx={{
        fontSize: "0.8125rem",
        height: 34,
        minWidth: 180,
        fontFamily: '"DM Sans", sans-serif',
        color: theme.palette.text.primary,
        borderRadius: "6px",
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.divider,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.text.secondary,
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      {availableTranscriptVariants.includes("original") && (
        <MenuItem sx={{ fontSize: "0.8125rem" }} value="original">
          Original
        </MenuItem>
      )}
      {availableTranscriptVariants.includes("en") && (
        <MenuItem sx={{ fontSize: "0.8125rem" }} value="en">
          English
        </MenuItem>
      )}
    </Select>
  )}

  {/* RIGHT: Search */}
  <TextField
    size="small"
    placeholder="Search transcript…"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    sx={{
      width: 220,
      "& input": {
        fontSize: "0.8125rem",
        py: 0.6,
      },
    }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
        </InputAdornment>
      ),
      endAdornment: searchTerm ? (
        <InputAdornment position="end">
          <IconButton
            size="small"
            onClick={() => setSearchTerm("")}
            sx={{ p: 0.25 }}
          >
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </InputAdornment>
      ) : null,
    }}
  />
</Box>

              {/* Search navigation */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography
                  variant="caption"
                  sx={{
                    minWidth: 44, textAlign: "right",
                    fontFamily: '"DM Mono", monospace',
                    fontSize: "0.75rem",
                    color: theme.palette.text.disabled,
                  }}
                >
                  {transcriptMatches.length > 0
                    ? `${searchMatchPointer + 1}/${transcriptMatches.length}`
                    : "\u2014"}
                </Typography>
                <Tooltip title="Previous match" arrow>
                  <span>
                    <IconButton
                      size="small"
                      sx={{ p: 0.4 }}
                      onClick={gotoPrevSearchMatch}
                      disabled={transcriptMatches.length === 0}
                      aria-label="Previous match"
                    >
                      <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Next match" arrow>
                  <span>
                    <IconButton
                      size="small"
                      sx={{ p: 0.4 }}
                      onClick={gotoNextSearchMatch}
                      disabled={transcriptMatches.length === 0}
                      aria-label="Next match"
                    >
                      <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* Waveform player */}
            <WaveformPlayer
              ref={waveformPlayerRef}
              audioSrc={audioSrc}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Utterances list */}
            <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, mt: 1.5 }}>
              {isEmpty(utterances) ? (
                <FieldEmpty message="No transcript is available for this recording" />
              ) : (
                utterances.map((u, i) => {
                  const isActive = currentTime >= u.start && currentTime <= u.end;
                  return (
                    <Box
                      key={i}
                      id={`utt-${i}`}
                      ref={isActive ? activeRef : null}
                      onClick={() => waveformPlayerRef.current?.seekTo(u.start)}
                      sx={{
                        display: "flex",
                        mb: 1.25,
                        borderRadius: "6px",
                        overflow: "hidden",
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor:
                          i === activeSearchUtteranceIndex
                            ? amber + "60"
                            : isActive
                            ? amber + "30"
                            : theme.palette.divider,
                        backgroundColor: isActive
                          ? isDark ? amber + "08" : amber + "05"
                          : theme.palette.background.paper,
                        boxShadow:
                          i === activeSearchUtteranceIndex
                            ? `0 0 0 2px ${amber}50`
                            : "none",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: amber + "40",
                          backgroundColor: isDark ? amber + "06" : amber + "03",
                        },
                      }}
                    >
                      {/* Speaker colour bar */}
                      <Box
                        sx={{
                          width: 4,
                          backgroundColor: getSpeakerColor(u.speaker_id),
                          flexShrink: 0,
                        }}
                      />

                      {/* Content */}
                      <Box sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: '"DM Mono", monospace',
                              fontSize: "0.6875rem",
                              color: theme.palette.text.disabled,
                            }}
                          >
                            {formatTimestamp(u.start)}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              color: getSpeakerColor(u.speaker_id),
                              letterSpacing: "0.02em",
                            }}
                          >
                            {formatSpeakerLabel(u.speaker_id, u.role)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
                          {isEmpty(u.text) ? (
                            <Box
                              component="span"
                              sx={{
                                color: theme.palette.text.disabled,
                                fontStyle: "italic",
                                fontSize: "0.8125rem",
                              }}
                            >
                              no speech detected
                            </Box>
                          ) : (
                            highlightText(u.text)
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        )}

        {/* ════════════════ TAB 5 — Analytics ════════════════ */}
        {tabValue === 5 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2.5}>

              {/* Talk-time donut + metrics table */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "6px",
                    p: 2.5,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6875rem", fontWeight: 600,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: theme.palette.text.disabled, mb: 2,
                    }}
                  >
                    Talk Time Analytics
                  </Typography>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={talkData.length > 8 ? 7 : 8}>
                      <Box sx={{ height: 360 }}>
                        <ReactECharts option={talkTimeOption} style={{ height: "100%" }} />
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={talkData.length > 8 ? 5 : 4}>
                      <Box
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <MetricRow label="Total Duration" value={callDuration || "\u2014"} />
                        <MetricRow label="Silence Time"   value={silenceTime  || "\u2014"} />

                        {/* Talk ratio heading */}
                        <Box
                          sx={{
                            px: 2, py: 1,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            backgroundColor: isDark ? "#28261F" : "#F0ECE4",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.6875rem", fontWeight: 600,
                              letterSpacing: "0.08em", textTransform: "uppercase",
                              color: theme.palette.text.disabled,
                            }}
                          >
                            Talk-Time Ratio
                          </Typography>
                        </Box>

                        {Object.entries(talkRatio).length === 0 ? (
                          <MetricRow label="Talk-Time Ratio" value="Not Applicable" indent />
                        ) : (
                          Object.entries(talkRatio).map(([k, v]) => (
                            <MetricRow
                              key={k}
                              label={k}
                              value={formatTalkRatioValue(v)}
                              indent
                            />
                          ))
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>

              {/* Keywords */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "6px",
                    p: 2.5,
                    backgroundColor: theme.palette.background.paper,
                    height: "100%",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6875rem", fontWeight: 600,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: theme.palette.text.disabled, mb: 2,
                    }}
                  >
                    Top Keywords
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ReactECharts option={keywordBarOption} style={{ height: "100%" }} />
                  </Box>
                </Box>
              </Grid>

              {/* Processing metrics */}
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "6px",
                    p: 2.5,
                    backgroundColor: theme.palette.background.paper,
                    height: "100%",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6875rem", fontWeight: 600,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: theme.palette.text.disabled, mb: 2,
                    }}
                  >
                    Processing Metrics
                  </Typography>
                  <Box
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <MetricRow
                      label="Total Processing Time"
                      value={proc.total_processing_time_sec != null ? `${proc.total_processing_time_sec.toFixed(2)}s` : "\u2014"}
                    />
                    <MetricRow
                      label="Transcription Time"
                      value={proc.transcription_time_sec != null ? `${proc.transcription_time_sec.toFixed(2)}s` : "\u2014"}
                    />
                    <MetricRow
                      label="Analysis Time"
                      value={proc.analysis_time_sec != null ? `${proc.analysis_time_sec.toFixed(2)}s` : "\u2014"}
                    />
                    <MetricRow label="Total Tokens"  value={llmUsage.total_tokens     ?? "\u2014"} />
                    <MetricRow label="Prompt Tokens" value={llmUsage.prompt_tokens    ?? "\u2014"} />
                    <MetricRow label="Output Tokens" value={llmUsage.candidate_tokens ?? "\u2014"} />
                  </Box>
                </Box>
              </Grid>

            </Grid>
          </Box>
        )}

        {/* ════════════════ TAB 6 — Ask AI ════════════════ */}
        {tabValue === 6 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <AskAI assetId={assetId} fileName={analysis.filename} />
          </Box>
        )}

      </Paper>
    </Box>
  );
};

export default Analysis;