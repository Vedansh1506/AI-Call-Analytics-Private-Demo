  import React, { useState, useEffect, useCallback, useMemo } from "react";
  import ReactECharts from "echarts-for-react";
  import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Card,
    CardContent,
    Grid,
    Chip,
    Alert,
    Select,
    Menu,
    MenuItem,
    Button,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
  } from "@mui/material";
  import DownloadIcon from '@mui/icons-material/Download';
  import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
  import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
  import CloseIcon from "@mui/icons-material/Close";

  import PlayArrowIcon from "@mui/icons-material/PlayArrow";
  import PauseIcon from "@mui/icons-material/Pause";
  import TextField from "@mui/material/TextField";
  import InputAdornment from "@mui/material/InputAdornment";
  import { useTheme } from "@mui/material/styles";

  import { useParams, useNavigate } from "react-router-dom";
  import { assetsAPI } from "../services/api";
  import api from "../services/api";
  import WaveSurfer from "wavesurfer.js";

  // ─── Empty State Component ────────────────────────────────────────────────────
  // Shows a subtle, transparent placeholder when a field has no data.
  // Feels intentional — not broken.
  const EmptyState = ({ message = "No data available", compact = false }) => (
    <Box
      sx={{
        border: "1.5px dashed",
        borderColor: "divider",
        borderRadius: 2,
        px: compact ? 2 : 3,
        py: compact ? 1 : 2,
        display: "flex",
        alignItems: "center",
        backgroundColor: "background.paper",
        mt: compact ? 0 : 1,
      }}
    >
      <Typography
        sx={{
          fontSize: compact ? "0.78rem" : "0.875rem",
          color: "text.secondary",
          fontStyle: "italic",
        }}
      >
        {message}
      </Typography>
    </Box>
  );

  // ─── Helper: check if a value is "empty" ─────────────────────────────────────
  const isEmpty = (val) => {
    if (val === null || val === undefined || val === "" || val === "-") return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true;
    return false;
  };

  // ─── Main Component ───────────────────────────────────────────────────────────
  const Analysis = () => {
    const { assetId } = useParams();
    const navigate = useNavigate();

    const [analysis, setAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tabValue, setTabValue] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const activeRef = React.useRef(null); 
    const [audioSrc, setAudioSrc] = useState(null);
    const waveformRef = React.useRef(null);
    const wavesurferRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const lastActiveIndexRef = React.useRef(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [duration, setDuration] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMatchPointer, setSearchMatchPointer] = useState(-1);
    const [exportAnchorEl, setExportAnchorEl] = useState(null);
    const [selectedTranscriptVariant, setSelectedTranscriptVariant] = useState("original");
    const [analysisLanguage, setAnalysisLanguage] = useState("en");
    const analysisCacheRef = React.useRef({});

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

    const fetchAnalysis = useCallback(async () => {
      const cacheKey = `${assetId}:${analysisLanguage}`;
      const cached = analysisCacheRef.current[cacheKey];
      if (cached) {
        setAnalysis(cached);
        return;
      }

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
      finally {
        setLoading(false);
      }
    }, [assetId]);

    useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);
    useEffect(() => { fetchTranscript(); }, [fetchTranscript]);

    useEffect(() => {
      const canPrefetchOriginal =
        analysisLanguage === "en" &&
        analysis?.available_analysis_languages?.includes("original");
      if (!canPrefetchOriginal) return;

      const cacheKey = `${assetId}:original`;
      if (analysisCacheRef.current[cacheKey]) return;

      let active = true;
      assetsAPI
        .getAnalysis(assetId, "original")
        .then((res) => {
          if (active) {
            analysisCacheRef.current[cacheKey] = res.data;
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [analysis, analysisLanguage, assetId]);

    
    useEffect(() => {
    let objectUrl = null;

    const loadAudio = async () => {
      try {
        const response = await api.get(`/assets/${assetId}/audio`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(response.data);
        setAudioSrc(objectUrl);
      } catch (err) {
        console.error("Audio load failed", err);
      }
    };

    loadAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [assetId]);


    useEffect(() => {
    if (!audioSrc || tabValue !== 4) return;
    if (!waveformRef.current) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#94a3b8",
      progressColor: "#3b82f6",
      cursorColor: "#3b82f6",
      height: 100,
      responsive: true,
      barWidth: 2,
      barGap: 2,
    });

    wavesurferRef.current = ws;

    ws.load(audioSrc);

    ws.on("ready", () => {
      setDuration(ws.getDuration());
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime() * 1000);
    });

    ws.on("seek", () => {
      setCurrentTime(ws.getCurrentTime() * 1000);
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioSrc, tabValue]);

  const performanceMetrics = analysis?.performance_metrics || {};
  const talkRaw = performanceMetrics?.RawTalkTimeMs || {};
  const callDuration = performanceMetrics?.TotalCallDuration;
  const silenceTime = performanceMetrics?.SilenceTime;
  const talkRatio = performanceMetrics?.TalkListenRatio || {};
  const master = analysis?.master_json || {};

  const proc = master?.processing_metrics || {};
  const llmUsage = master?.usage?.llm || {};

  const displayInsights = analysis?.normalized_insights || {};
  const canonicalInsights = analysis?.normalized_insights_en || analysis?.normalized_insights || {};
  const insights = displayInsights; // for existing UI blocks

  const openExportMenu = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const closeExportMenu = () => {
    setExportAnchorEl(null);
  };

  const downloadTranscript = (format) => {
    window.open(assetsAPI.getTranscriptExportUrl(assetId, format), "_blank");
    closeExportMenu();
  };

  const downloadAnalysis = (format, lang = analysisLanguage) => {
    window.open(assetsAPI.getAnalysisExportUrl(assetId, format, lang), "_blank");
    closeExportMenu();
  };

  const talkData = Object.entries(talkRaw).map(([name, value]) => ({
    name,
    value: Math.round(value / 1000),
  }));

  const keywordObj = canonicalInsights?.KeywordCounts || {};

  const sortedKeywords = Object.entries(keywordObj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([text, value]) => ({ text, value }));

  const keywordBarOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      textStyle: {
        color: theme.palette.text.secondary,
      },
    },

    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: "value",
      axisLine: {
        lineStyle: { color: theme.palette.divider },
      },
      splitLine: {
        lineStyle: { color: theme.palette.divider },
      },
      axisLabel: {
        color: theme.palette.text.secondary,
      },
    },

    yAxis: {
      type: "category",
      inverse: true,
      axisLabel: {
        color: theme.palette.text.primary,
        fontWeight: 500,
      },
      axisLine: {
        lineStyle: { color: theme.palette.divider },
      },
      data: sortedKeywords.map(k => k.text)
    },

    series: [
      {
        type: "bar",
        data: sortedKeywords.map(k => k.value),
        itemStyle: {
          color: isDark ? "#ff0000" : "#ff1b1b",
          borderRadius: [0, 6, 6, 0],
        },
        emphasis: {
    itemStyle: {
      color: isDark ? "#60a5fa" : "#60a5fa",
    },
  },
      },

    ],
  };

  const COLORS = [ "#d4cd06", "#ec4899", "#007427", "#48e4ec", "#9600c4",
    "#634b21", "#f28900", "#5edaac",  "#852d54","#ef4444",
    "#22c55e","#5f5a5a",  "#6366f1",  "#efff85", "#c00053",];

const legendCount = talkData.length;
const legendTop = 28;
const legendBottom = 28;
const legendMaxRows = 12;
const legendScrollable =
  legendCount > legendMaxRows ||
  talkData.some((d) => String(d.name || "").length > 24);

const talkTimeOption = {
  backgroundColor: "transparent",
  tooltip: {
    trigger: "item",
    formatter: "{b}: {c}s ({d}%)",
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#ffffff",
    borderColor: theme.palette.divider,
    borderWidth: 1,
    textStyle: {
      color: theme.palette.text.primary,
      fontWeight: 600,
    },
  },
  legend: {
    type: legendScrollable ? "scroll" : "plain",
    orient: "vertical",
    right: 18,
    top: legendTop,
    bottom: legendBottom,
    itemWidth: 14,
    itemHeight: 10,
    itemGap: 10,
    pageIconColor: theme.palette.text.primary,
    pageTextStyle: { color: theme.palette.text.secondary },
    textStyle: {
      color: theme.palette.text.primary,
      fontSize: 12,
      width: 170,
      overflow: "truncate",
    },
    formatter: (name) => {
      const s = String(name || "");
      return s.length > 28 ? `${s.slice(0, 27)}...` : s;
    },
  },
  series: [
    {
      type: "pie",
      radius: ["46%", "70%"],
      center: ["30%", "50%"], // left shift to create safe legend zone
      minAngle: 3,
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      data: talkData.map((d, i) => ({
        value: d.value,
        name: d.name,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    },
  ],
};

const formatTalkRatioValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not Applicable";
  }
  return String(value);
};

    const sentenceSentiment = useMemo(
      () => analysis?.sentence_sentiment ?? [],
      [analysis?.sentence_sentiment]
    );
    const transcriptVariants = useMemo(
    () => transcript?.variants ?? {},
    [transcript?.variants]
  );

  const availableTranscriptVariants = useMemo(
    () => Object.keys(transcriptVariants),
    [transcriptVariants]
  );


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

    const transcriptMatches = useMemo(() => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return [];
      const hits = [];
      utterances.forEach((u, idx) => {
        const text = String(u?.text || "").toLowerCase();
        if (text.includes(q)) hits.push(idx);
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
      const el = document.getElementById(`utt-${activeSearchUtteranceIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, [tabValue, activeSearchUtteranceIndex]);

    const gotoPrevSearchMatch = () => {
      if (transcriptMatches.length === 0) return;
      setSearchMatchPointer((prev) =>
        prev <= 0 ? transcriptMatches.length - 1 : prev - 1
      );
    };

    const gotoNextSearchMatch = () => {
      if (transcriptMatches.length === 0) return;
      setSearchMatchPointer((prev) =>
        prev >= transcriptMatches.length - 1 ? 0 : prev + 1
      );
    };
  let activeIndex = utterances.findIndex(
    u => currentTime >= u.start && currentTime <= u.end
  );

  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== lastActiveIndexRef.current) {
      lastActiveIndexRef.current = activeIndex;
      activeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeIndex]);

  const togglePlay = () => {
    if (!wavesurferRef.current) return;

    wavesurferRef.current.playPause();
    setIsPlaying(wavesurferRef.current.isPlaying());
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2,"0")}`;
  };

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
      const totalSeconds = Math.floor(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return h > 0
        ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        : `${m}:${s.toString().padStart(2, "0")}`;
    };

    const formatSpeakerLabel = (speakerId, role) => {
      if (!speakerId) return role || "Speaker";
      const number = speakerId.split("_")[1];
      const speakerName = number ? `Speaker ${parseInt(number) + 1}` : speakerId;
      return role ? `${speakerName} (${role})` : speakerName;
    };

    const speakerColors = [
      "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
      "#d4cd06", "#ec4899", "#0c4b21", "#48e4ec", "#4f2846",
    ];

    const getSpeakerColor = (speakerId) => {
      if (!speakerId) return "#64748b";
      const index = parseInt(speakerId.split("_")[1] || 0);
      return speakerColors[index % speakerColors.length];
    };

    const normalizeSentiment = (value) => {
      const v = String(value || "").trim().toLowerCase();
      if (v === "positive") return "Positive";
      if (v === "negative") return "Negative";
      if (v === "neutral") return "Neutral";
      return "Unknown";
    };

    const normalizeResolutionStatus = (value) => {
      const v = String(value || "").trim().toLowerCase();
      if (v === "resolved") return "Resolved";
      if (v === "unresolved") return "Unresolved";
      if (v === "pending") return "Pending";
      if (v === "not applicable" || v === "not-applicable" || v === "non applicable" || v === "n/a" || v === "na") return "Not Applicable";
      return "Unknown";
    };

    const normalizeChurnLevel = (value) => {
      const v = String(value || "").trim().toLowerCase();
      if (v === "high") return "High";
      if (v === "medium") return "Medium";
      if (v === "low") return "Low";
      if (v === "not applicable" || v === "not-applicable" || v === "non applicable" || v === "n/a" || v === "na") return "Not Applicable";
      return "Unknown";
    };

    const sentimentColor = (value) => {
      const normalized = normalizeSentiment(value);
      if (normalized === "Positive") return "success";
      if (normalized === "Negative") return "error";
      if (normalized === "Neutral") return "info";
      return "default";
    };

    if (loading || (analysisLoading && !analysis)) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
          <Typography color="text.secondary">Loading analysis…</Typography>
        </Box>
      );
    }

    if (error || !analysis) {
      return (
        <Box>
          <Button onClick={() => navigate("/assets")} sx={{ mb: 2 }}>Back</Button>
          <Alert severity="error">{error || "Analysis not available"}</Alert>
        </Box>
      );
    }
  const highlightText = (text) => {
    if (!searchTerm) return text;

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, "gi");
    const parts = text.split(regex);
    const highlightBg = isDark ? "rgba(250, 204, 21, 0.45)" : "rgba(250, 204, 21, 0.55)";
    const highlightColor = isDark ? "#fef9c3" : "#1c1917";

    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={i} style={{ backgroundColor: highlightBg, color: highlightColor, padding: "0 2px", borderRadius: 2 }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

    const renderExtractedInfo = (data, level = 0) => {
      if (!data) return null;

      if (typeof data === "string" || typeof data === "number") {
        return (
          <Typography sx={{ ml: level * 3 }}>• {String(data)}</Typography>
        );
      }

      if (Array.isArray(data)) {
        return data.map((item, index) => (
          <Box key={index}>{renderExtractedInfo(item, level)}</Box>
        ));
      }

      if (data.Key !== undefined && data.Value !== undefined) {

    // Value is ARRAY
    if (Array.isArray(data.Value)) {
      return (
        <Box sx={{ ml: level * 3 }}>
          <Typography>• {data.Key}</Typography>
          {data.Value.map((child, idx) => (
            <Box key={idx}>{renderExtractedInfo(child, level + 1)}</Box>
          ))}
        </Box>
      );
    }

    // Value is OBJECT (THIS IS YOUR FIX)
    if (typeof data.Value === "object" && data.Value !== null) {
      return (
        <Box sx={{ ml: level * 3 }}>
          <Typography>• {data.Key}</Typography>
          {renderExtractedInfo(data.Value, level + 1)}
        </Box>
      );
    }

    // Primitive value
    return (
      <Typography sx={{ ml: level * 3 }}>
        • {data.Key} - {String(data.Value)}
      </Typography>
    );
  }

      return Object.entries(data).map(([key, value]) => (
        <Box key={key} sx={{ ml: level * 3 }}>
          <Typography>• {key}</Typography>
          {renderExtractedInfo(value, level + 1)}
        </Box>
      ));
    };

    // ─── Duration display ───────────────────────────────────────────────────────
    const durationFormatted = formatDuration(analysis.call_length);
    const resolutionStatus = normalizeResolutionStatus(insights?.ResolutionData?.Status);
    const churnLevel = normalizeChurnLevel(insights?.ChurnRisk?.Level);

    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Button onClick={() => navigate("/assets")} variant="outlined" size="medium">
            Back to assets
          </Button>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Analysis</Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: "100%",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            mb: 3,
          }}
        >
          {analysis.filename}
        </Typography>

        {/* ── Top summary cards ── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>Language</Typography>
                {isEmpty(analysis.language)
                  ? <EmptyState message="Language not detected" compact />
                  : <Typography variant="h6">{analysis.language.toUpperCase()}</Typography>
                }
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>Duration</Typography>
                {!durationFormatted
                  ? <EmptyState message="Duration unavailable" compact />
                  : <Typography variant="h6">{durationFormatted}</Typography>
                }
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>Overall Sentiment</Typography>
                {isEmpty(insights.OverallSentiment || insights.Sentiment)
                  ? <EmptyState message="Sentiment not analysed" compact />
                  : (
                    <Chip
                      label={normalizeSentiment(insights.OverallSentiment || insights.Sentiment)}
                      color={sentimentColor(insights.OverallSentiment || insights.Sentiment)}
                    />
                  )
                }
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap", gap: 1 }}>
            {analysis?.available_analysis_languages?.includes("original") && (
              <Box sx={{ width: 190, flexShrink: 0 }}>
                <Select
                  size="small"
                  value={analysisLanguage}
                  onChange={(e) => setAnalysisLanguage(e.target.value)}
                  disabled={analysisLoading}
                  sx={{ width: 190 }}
                >
                  <MenuItem value="en">Analysis: English</MenuItem>
                  <MenuItem value="original">Analysis: Original</MenuItem>
                </Select>
                {analysisLoading && (
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
                    Updating language...
                  </Typography>
                )}
              </Box>
            )}

            <Button variant="contained" endIcon={<DownloadIcon />} onClick={openExportMenu}>
              Export
            </Button>
            <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={closeExportMenu}>
              <MenuItem onClick={() => downloadTranscript("pdf")}>Download Transcript PDF</MenuItem>
              <MenuItem onClick={() => downloadAnalysis("pdf", "en")}>
                Download Analysis PDF (English)
              </MenuItem>
              <MenuItem
                onClick={() => downloadAnalysis("pdf", "original")}
                disabled={!analysis?.available_analysis_languages?.includes("original")}
              >
                Download Analysis PDF (Original)
              </MenuItem>
            </Menu>

          </Grid>

        </Grid>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              "& .MuiTab-root": {
                color: "text.primary",
                fontSize: "1.05rem",
                fontWeight: 600,
                textTransform: "none",
              },
              "& .MuiTab-root.Mui-selected": {
                color: "primary.main",
                fontWeight: 700,
              },
            }}
          >
            <Tab label="Call Summary" />
            <Tab label="Insights" />
            <Tab label="General Info" />
            <Tab label="Sentiment Analysis" />
            <Tab label="Transcript" />
            <Tab label="Analytics" />
          </Tabs>

          {/* ════════════════════════════════════════
              TAB 0 — Call Summary
          ════════════════════════════════════════ */}
          {tabValue === 0 && (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>

              {/* Call Type */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Call Type</Typography>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  {isEmpty(insights.CallType)
                    ? <EmptyState message="Call type was not identified" />
                    : <Typography variant="body1">{insights.CallType}</Typography>
                  }
                </CardContent>
              </Card>

              {/* Audio Environment */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Audio Environment</Typography>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  {isEmpty(insights.AudioEnvironment)
                    ? <EmptyState message="Audio environment details not captured" />
                    : <Typography variant="body1">{insights.AudioEnvironment}</Typography>
                  }
                </CardContent>
              </Card>

              {/* Participants */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Participants</Typography>
              {isEmpty(insights.Participants)
                ? <EmptyState message="No participant information found" />
                : (insights.Participants || []).map((p, i) => (
                  <Card key={i} sx={{ mb: 1 }}>
                    <CardContent>
                      <Typography fontWeight={600}>
                        Name: {isEmpty(p.name) ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic", fontWeight: 400 }}>not provided</span> : p.name}
                      </Typography>
                      <Typography fontWeight={600}>
                        Role: {isEmpty(p.role) ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic", fontWeight: 400 }}>not provided</span> : p.role}
                      </Typography>
                    </CardContent>
                  </Card>
                ))
              }

              {/* Call Summary */}
              <Typography variant="h6" sx={{ mt: 3 }}>Call Summary</Typography>
              <Paper sx={{ p: 2, mt: 1 }}>
                {isEmpty(insights.CallSummary)
                  ? <EmptyState message="No summary was generated for this call" />
                  : <Typography>{insights.CallSummary}</Typography>
                }
              </Paper>

              {/* Resolution */}
              <Typography variant="h6" sx={{ mt: 3 }}>Resolution Data</Typography>
              <Card sx={{ mt: 1 }}>
                <CardContent>
                  {isEmpty(insights.ResolutionData)
                    ? <EmptyState message="Resolution data not available" />
                    : (
                      <>
                        <Typography>
                          Status:{" "}
                          {isEmpty(insights.ResolutionData?.Status)
                            ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>unknown</span>
                            : (
                              <Chip
                                label={resolutionStatus}
                                color={
                                  resolutionStatus === "Unresolved" ? "error"
                                  : resolutionStatus === "Pending" ? "warning"
                                  : resolutionStatus === "Resolved" ? "success"
                                  : "default"
                                }
                                sx={{ mb: 1 }}
                              />
                            )
                          }
                        </Typography>
                        <Typography>
                          Reason:{" "}
                          {isEmpty(insights.ResolutionData?.Reason)
                            ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>no reason recorded</span>
                            : insights.ResolutionData.Reason
                          }
                        </Typography>
                      </>
                    )
                  }
                </CardContent>
              </Card>

              {/* Churn Risk */}
              <Typography variant="h6" sx={{ mt: 3 }}>Churn Risk</Typography>
              <Card sx={{ mt: 1 }}>
                <CardContent>
                  {isEmpty(insights.ChurnRisk)
                    ? <EmptyState message="Churn risk assessment not available" />
                    : (
                      <>
                        <Typography>
                          Level:{" "}
                          {isEmpty(insights.ChurnRisk?.Level)
                            ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>unknown</span>
                            : (
                              <Chip
                                label={churnLevel}
                                color={
                                  churnLevel === "High" ? "error"
                                  : churnLevel === "Medium" ? "warning"
                                  : churnLevel === "Low" ? "success"
                                  : "default"
                                }
                                sx={{ mb: 1 }}
                              />
                            )
                          }
                        </Typography>
                        <Typography>
                          Reason:{" "}
                          {isEmpty(insights.ChurnRisk?.Reason)
                            ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>no reason recorded</span>
                            : insights.ChurnRisk.Reason
                          }
                        </Typography>
                      </>
                    )
                  }
                </CardContent>
              </Card>
            </Box>
          )}

          {/* ════════════════════════════════════════
              TAB 1 — Insights
          ════════════════════════════════════════ */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>

              <Typography variant="h6">Strengths</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.KeyStrengths)
                ? <EmptyState message="No strengths were identified for this call" />
                : (insights.KeyStrengths || []).map((s, i) => (
                  <Typography key={i}>• {s}</Typography>
                ))
              }
  </CardContent>
  </Card>
              <Typography variant="h6" sx={{ mt: 3 }}>Areas of Improvement</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.AreasOfImprovement)
                ? <EmptyState message="No improvement areas were flagged" />
                : (insights.AreasOfImprovement || []).map((s, i) => (
                  <Typography key={i}>• {s}</Typography>
                ))
              }
              </CardContent>
  </Card>

              <Typography variant="h6" sx={{ mt: 3 }}>Keywords</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.KeywordCounts)
                ? <EmptyState message="No keywords were extracted" />
                : Object.entries(insights.KeywordCounts).map(([k, v]) => (
                  <Chip key={k} label={`${k}: ${v}`} sx={{ mr: 1, mb: 1 }} />
                ))
              }
              </CardContent>
  </Card>
            </Box>
          )}

          {/* ════════════════════════════════════════
              TAB 2 — General Info
          ════════════════════════════════════════ */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>

              <Typography variant="h6">Topics</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.Topics)
                ? <EmptyState message="No topics were identified" />
                : (insights.Topics || []).map((t, i) => (
                  <Typography key={i}>
                    • {t.topic}{t.description ? ` - ${t.description}` : ""}
                  </Typography>
                ))
              }
  </CardContent>
  </Card>
              <Typography variant="h6" sx={{ mt: 3 }}>Technical Terms</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.TechnicalTerms)
                ? <EmptyState message="No technical terms were detected" />
                : (insights.TechnicalTerms || []).map((t, i) => (
                  <Typography key={i}>
                    • {t.term}{t.explanation ? ` - ${t.explanation}` : ""}
                  </Typography>
                ))
              }
  </CardContent>
  </Card>
              <Typography variant="h6" sx={{ mt: 3 }}>Tasks</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.Tasks)
                ? <EmptyState message="No tasks or action items were found" />
                : (insights.Tasks || []).map((task, i) => (
                  <Typography key={i} sx={{ mt: 1 }}>
                      {typeof task === "string" && (
                        <Typography>• {task}</Typography>
                      )}
                      {typeof task === "object" && !Array.isArray(task) && (
                        Object.entries(task).map(([key, value], idx) => (
                          <Typography key={idx}>
                            <strong>{key}:</strong>{" "}
                            {isEmpty(value)
                              ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>not specified</span>
                              : typeof value === "object" ? JSON.stringify(value) : String(value)
                            }
                          </Typography>
                        ))
                      )}
                      
                  </Typography>
                    
                ))
              }
              </CardContent>
                  </Card>

              <Typography variant="h6" sx={{ mt: 3 }}>Extracted Information</Typography>
              <Card sx={{ mt: 1 }}>
        <CardContent>
              {isEmpty(insights.ExtractedInformation)
                ? <EmptyState message="No structured information was extracted" />
                : renderExtractedInfo(insights.ExtractedInformation)
              }
              </CardContent>
  </Card>
            </Box>
          )}

          {/* ════════════════════════════════════════
              TAB 3 — Sentiment Analysis
          ════════════════════════════════════════ */}
          {tabValue === 3 && (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {isEmpty(sentenceSentiment)
                ? <EmptyState message="Sentence-level sentiment analysis was not performed on this call" />
                : sentenceSentiment.map((item, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Chip
                      label={normalizeSentiment(item.sentiment)}
                      color={sentimentColor(item.sentiment)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography>{item.text}</Typography>
                  </Box>
                ))
              }
            </Box>
          )}

          {/* ════════════════════════════════════════
      TAB 4 — Transcript
  ════════════════════════════════════════ */}
  {tabValue === 4 && (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", height: "72vh" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 1.5, mb: 2 }}>
        {availableTranscriptVariants.length > 1 && (
          <Select
            size="small"
            value={selectedTranscriptVariant}
            onChange={(e) => setSelectedTranscriptVariant(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="original">Original</MenuItem>
            {availableTranscriptVariants.includes("en") && <MenuItem value="en">English</MenuItem>}
          </Select>
        )}
        <TextField
          size="small"
          placeholder="Search transcript…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 180 }}
          aria-label="Search in transcript"
          InputProps={{
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear transcript search"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 42 }}>
            {transcriptMatches.length > 0 ? `${searchMatchPointer + 1}/${transcriptMatches.length}` : "No results"}
          </Typography>
          <Tooltip title="Previous match">
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.5 }}
                onClick={gotoPrevSearchMatch}
                disabled={transcriptMatches.length === 0}
                aria-label="Previous match"
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Next match">
            <span>
              <IconButton
                size="small"
                sx={{ p: 0.5 }}
                onClick={gotoNextSearchMatch}
                disabled={transcriptMatches.length === 0}
                aria-label="Next match"
              >
                <KeyboardArrowDownIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      {/* Audio Player */}
    <Box
    sx={{
      backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
      borderRadius: 2,
        p: 2,
        mb: 3
    }}
  >
    

    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
    
    <Button variant="contained" onClick={togglePlay} sx={{ minWidth: 40 }}>
      {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
    </Button>

    <Select
      size="small"
      value={playbackRate}
      onChange={(e) => {
        const rate = Number(e.target.value);
        setPlaybackRate(rate);
        wavesurferRef.current?.setPlaybackRate(rate);
      }}
    >
      <MenuItem value={0.25}>0.25x</MenuItem>
      <MenuItem value={0.5}>0.5x</MenuItem>
      <MenuItem value={0.75}>0.75x</MenuItem>
      <MenuItem value={1}>1x</MenuItem>
      <MenuItem value={1.25}>1.25x</MenuItem>
      <MenuItem value={1.5}>1.5x</MenuItem>
      <MenuItem value={2}>2x</MenuItem>
    </Select>

    <Typography variant="body2" color="text.secondary">
      {formatTime(currentTime/1000)} / {formatTime(duration)}
    </Typography>

  </Box>

    <Box
      ref={waveformRef}
      sx={{
        width: "100%",
        height: 100,
        borderRadius: 2,
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      }}
    />
  </Box>


      {/* Transcript */}
      <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
      {isEmpty(utterances) ? (
        <EmptyState message="No transcript is available for this recording" />
      ) : (
        utterances.map((u, i) => {

          const isActive =
            currentTime >= u.start &&
            currentTime <= u.end;

          return (
            <Box
              key={i}
              id={`utt-${i}`}
              ref={isActive ? activeRef : null}
              onClick={() => {
                if (!wavesurferRef.current) return;
                const duration = wavesurferRef.current.getDuration();
                if (!duration) return;


    wavesurferRef.current.seekTo(u.start / 1000 / duration);
  }}


              sx={{
                display: "flex",
                mb: 2,
                borderRadius: 2,
                overflow: "hidden",
                cursor: "pointer",
                backgroundColor: isActive
    ? theme.palette.action.selected
    : theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow:
                  i === activeSearchUtteranceIndex
                    ? `0 0 0 2px ${theme.palette.primary.main}`
                    : "none",
                transition: "background-color 0.2s ease"
              }}
            >
              {/* Colored speaker bar */}
              <Box
                sx={{
                  width: 6,
                  backgroundColor: getSpeakerColor(u.speaker_id)
                }}
              />

              {/* Content */}
              <Box sx={{ p: 2, flex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {formatTimestamp(u.start)} | {formatSpeakerLabel(u.speaker_id, u.role)}
                </Typography>

                <Typography sx={{ mt: 0.5 }}>
                  {isEmpty(highlightText(u.text))
                    ? <span style={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>no speech detected</span>
                    : highlightText(u.text)
                  }
                </Typography>
              </Box>

            </Box>
          );
        })
      )}
      </Box>
      </Box>

  )}
  {/* ════════════════════════════════════════
      TAB 5 — Analytics
  ════════════════════════════════════════ */}
  {tabValue === 5 && (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3}>

        {/* FULL WIDTH DONUT */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Talk Time Analytics
              </Typography>

              <Grid container spacing={2} alignItems="stretch">
                <Grid item xs={12} md={talkData.length > 8 ? 7 : 8}>
                  <Box sx={{ height: "100%", minHeight: 400 }}>
                    <ReactECharts option={talkTimeOption} style={{ height: "100%" }} />
                  </Box>
                </Grid>

    <Grid item xs={12} md={talkData.length > 8 ? 5 : 4}>
    <Box
      sx={{
        height: "100%",
        pl: 3,
        ml: -3,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: "90%",
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* ROW */}
        {[
          ["Total Duration", callDuration || "-"],
          ["Silence Time", silenceTime || "-"],
        ].map(([label, value], i) => (
          <Box
            key={label}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              px: 2.5,
              py: 1.4,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
            <Typography>{value}</Typography>
          </Box>
        ))}

        {/* Talk ratio heading */}
        <Box
          sx={{
            px: 2.5,
            py: 1.3,
            borderBottom: `1px solid ${theme.palette.divider}`,
            fontWeight: 700,
          }}
        >
          <Typography fontWeight={700}>Talk-Time Ratio</Typography>
        </Box>

        {/* Ratio rows */}
      {Object.entries(talkRatio).length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            px: 4.5,
            py: 1.3,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography fontWeight={600} color="text.secondary">• Talk-Time Ratio</Typography>
          <Typography>Not Applicable</Typography>
        </Box>
      ) : Object.entries(talkRatio).map(([k, v]) => (
        <Box
          key={k}
          sx={{
              display: "flex",
              justifyContent: "space-between",
              px: 4.5, // indentation
              py: 1.3,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
        >
          <Typography fontWeight={600} color="text.secondary">• {k}</Typography>
          <Typography>{formatTalkRatioValue(v)}</Typography>
        </Box>
      ))}
      </Box>
    </Box>
  </Grid>
              </Grid>

            </CardContent>
          </Card>
        </Grid>

        {/* KEYWORDS + PROCESSING SAME ROW */}
        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
    <Card sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Top Keywords
              </Typography>

              <Box sx={{ height: 320 }}>
                <ReactECharts option={keywordBarOption} style={{ height: "100%" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} sx={{ display: "flex" }}>
    <Card sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
    }}
  >
              <Typography variant="h6" sx={{ mb: 2 }}>
                Processing Metrics
              </Typography>

              <TableContainer
    sx={{
      mt: 1,
      flex: 1,
      display: "flex",
    }}
  >
    <Table size="small" sx={{ tableLayout: "fixed" }}>
      <TableBody>

        <TableRow>
          
          <TableCell sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      width: "55%",
    }}>Total Processing Time</TableCell>
          
          <TableCell sx={{fontSize: "0.95rem"}}>{proc.total_processing_time_sec?.toFixed(2)} sec</TableCell>
        </TableRow>

        <TableRow>
          <TableCell sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      width: "55%",
    }}>Transcription Time</TableCell>
          <TableCell sx={{fontSize: "0.95rem"}}>{proc.transcription_time_sec?.toFixed(2)} sec</TableCell>
        </TableRow>

        <TableRow>
          <TableCell sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      width: "55%",
    }}>Analysis Time</TableCell>
          <TableCell sx={{fontSize: "0.95rem"}}>{proc.analysis_time_sec?.toFixed(2)} sec</TableCell>
        </TableRow>


        <TableRow>
          <TableCell sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      width: "55%",
    }}>Total Tokens</TableCell>
          <TableCell sx={{fontSize: "0.95rem"}}>{llmUsage.total_tokens}</TableCell>
        </TableRow>

        <TableRow>
          <TableCell sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      width: "55%",
    }}>Prompt Tokens</TableCell>
          <TableCell sx={{fontSize: "0.95rem"}}>{llmUsage.prompt_tokens}</TableCell>
        </TableRow>

        <TableRow>
          <TableCell sx={{
      fontWeight: 600,
      fontSize: "0.95rem",
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      width: "55%",
    }}>Output Tokens</TableCell>
          <TableCell sx={{fontSize: "0.95rem"}}>{llmUsage.candidate_tokens}</TableCell>
        </TableRow>

      </TableBody>
    </Table>
  </TableContainer>

            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  )}



                    
        </Paper>
      </Box>
    );
  };

  export default Analysis;




