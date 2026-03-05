import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
  TextField,
  IconButton,
  Badge,
  TablePagination,
  Skeleton,
} from "@mui/material";

import FilterListIcon from "@mui/icons-material/FilterList";
import TableSortLabel from "@mui/material/TableSortLabel";
import LinearProgress from "@mui/material/LinearProgress";

import { useNavigate } from "react-router-dom";
import { assetsAPI } from "../services/api";
import FilterDrawer from "../components/FilterDrawer";

const ASSETS_LIST_STATE_KEY = "assets_list_state_v1";
const DEFAULT_FILTERS = {
  search: "",
  status: [],
  language: [],
  sentiment: [],
  min_duration: 0,
  max_duration: 7200,
  from_date: null,
  to_date: null,
  sort_by: "",
  order: "desc",
};

const readAssetsListState = () => {
  try {
    if (typeof window === "undefined") {
      return { page: 1, filters: DEFAULT_FILTERS };
    }
    const raw = window.sessionStorage.getItem(ASSETS_LIST_STATE_KEY);
    if (!raw) {
      return { page: 1, filters: DEFAULT_FILTERS };
    }
    const parsed = JSON.parse(raw);
    const filters = {
      ...DEFAULT_FILTERS,
      ...(parsed?.filters || {}),
      from_date: parsed?.filters?.from_date ? new Date(parsed.filters.from_date) : null,
      to_date: parsed?.filters?.to_date ? new Date(parsed.filters.to_date) : null,
    };
    const page = Number(parsed?.page);
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      filters,
    };
  } catch {
    return { page: 1, filters: DEFAULT_FILTERS };
  }
};

const AssetsList = () => {
  const restored = readAssetsListState();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(restored.page);
  const [total, setTotal] = useState(0);
  const [supportedLanguages, setSupportedLanguages] = useState([]);

  const [filterOpen, setFilterOpen] = useState(false);

  const [draftFilters, setDraftFilters] = useState(restored.filters);
  const [appliedFilters, setAppliedFilters] = useState(restored.filters);
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const fetchAssetsRef = useRef(null);

  useEffect(() => {
    try {
      const payload = {
        page,
        filters: {
          ...appliedFilters,
          from_date: appliedFilters.from_date
            ? new Date(appliedFilters.from_date).toISOString()
            : null,
          to_date: appliedFilters.to_date
            ? new Date(appliedFilters.to_date).toISOString()
            : null,
        },
      };
      window.sessionStorage.setItem(ASSETS_LIST_STATE_KEY, JSON.stringify(payload));
    } catch {}
  }, [page, appliedFilters]);

  // Fetch supported languages
  useEffect(() => {
    const fetchSupportedLanguages = async () => {
      try {
        const response = await assetsAPI.getSupportedLanguages();
        const langs = response.data.supported_languages;

        if (langs) {
          const langArray = Object.entries(langs).map(([code, name]) => ({
            code,
            name,
          }));
          setSupportedLanguages(langArray);
        }
      } catch {
        console.error("Failed to fetch supported languages");
      }
    };

    fetchSupportedLanguages();
  }, []);

  // Polling controls
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      if (fetchAssetsRef.current) {
        fetchAssetsRef.current();
      }
    }, 5000);
  }, []);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    try {
      const params = {
        page,
        page_size: 10,
        search: appliedFilters.search,
        status_filter: appliedFilters.status?.[0],
        language: appliedFilters.language,
        sentiment: appliedFilters.sentiment,
        min_duration: appliedFilters.min_duration,
        max_duration: appliedFilters.max_duration,
        from_date: appliedFilters.from_date,
        to_date: appliedFilters.to_date,
        sort_by: appliedFilters.sort_by,
        order: appliedFilters.order,
      };

      if (!appliedFilters.status?.length) delete params.status_filter;
      if (!appliedFilters.language.length) delete params.language;
      if (!appliedFilters.sentiment.length) delete params.sentiment;

      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] == null) delete params[k];
      });

      const response = await assetsAPI.list(params);
      const items = response.data.items || [];

      setAssets(items);
      setTotal(response.data.total || 0);
      setLoading(false);

      // polling decision
      if (
        items.some((a) => a.status === "processing" || a.status === "uploaded")
      ) {
        startPolling();
      } else {
        stopPolling();
      }
    } catch {
      setError("Failed to load assets.");
      setLoading(false);
    }
  }, [page, appliedFilters, startPolling, stopPolling]);

  // store latest fetch function
  useEffect(() => {
    fetchAssetsRef.current = fetchAssets;
  }, [fetchAssets]);

  // initial fetch
  useEffect(() => {
    setLoading(true);
    fetchAssets();
  }, [fetchAssets]);

  // cleanup
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // progress logic
  const getProcessingProgress = (stage) => {
    switch (stage) {
      case "transcription":
        return 25;
      case "analysis":
        return 50;
      case "completed":
        return 100;
      default:
        return 10;
    }
  };

  // chip styles
  const getStatusStyle = (status) => {
    switch (status) {
      case "completed":
        return { bgcolor: "#22c55e", color: "#fff", fontWeight: 500 };
      case "failed":
        return { bgcolor: "#ef4444", color: "#fff", fontWeight: 500 };
      case "uploaded":
        return { bgcolor: "#64748b", color: "#fff", fontWeight: 500 };
      case "processing":
        return { bgcolor: "#f59e0b", color: "#fff", fontWeight: 500 };
      default:
        return {};
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-GB");
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          mt: 6,
        }}
      >
        <Typography variant="h4">My Assets</Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search filename or transcript"
            sx={{ width: 260 }}
            value={draftFilters.search}
            onChange={(e) => {
              const value = e.target.value;

              setDraftFilters((prev) => ({
                ...prev,
                search: value,
              }));

              setAppliedFilters((prev) => ({
                ...prev,
                search: value,
              }));

              setPage(1);
            }}
          />

          <IconButton onClick={() => setFilterOpen(true)}>
            <Badge
              badgeContent={
                appliedFilters.language.length +
                appliedFilters.sentiment.length +
                appliedFilters.status.length +
                (appliedFilters.from_date || appliedFilters.to_date ? 1 : 0)
              }
              color="primary"
            >
              <FilterListIcon />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Active Filters */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {appliedFilters.status.map((s) => (
          <Chip
            key={s}
            label={`Status: ${s}`}
            onDelete={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                status: prev.status.filter((v) => v !== s),
              }))
            }
          />
        ))}

        {appliedFilters.language.map((lang) => (
          <Chip
            key={lang}
            label={`Language: ${lang}`}
            onDelete={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                language: prev.language.filter((l) => l !== lang),
              }))
            }
          />
        ))}

        {appliedFilters.sentiment.map((s) => (
          <Chip
            key={s}
            label={`Sentiment: ${s}`}
            onDelete={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                sentiment: prev.sentiment.filter((v) => v !== s),
              }))
            }
          />
        ))}

        {(appliedFilters.min_duration !== 0 ||
          appliedFilters.max_duration !== 7200) && (
          <Chip
            label={`Duration: ${appliedFilters.min_duration}-${appliedFilters.max_duration}s`}
            onDelete={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                min_duration: 0,
                max_duration: 7200,
              }))
            }
          />
        )}

        {(appliedFilters.from_date || appliedFilters.to_date) && (
          <Chip
            label="Date filter applied"
            onDelete={() =>
              setAppliedFilters((prev) => ({
                ...prev,
                from_date: null,
                to_date: null,
              }))
            }
          />
        )}
      </Box>

      <Typography variant="body2" sx={{ mb: 1 }}>
        Showing {total} results
      </Typography>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          overflowX: "hidden", // prevent horizontal movement
        }}
      >
        <Table
          sx={{
            tableLayout: "fixed", // force column widths
            width: "100%",
          }}
        >
          <TableHead>
            <TableRow>
              {[
                { id: "filename", label: "Filename" },
                { id: "status", label: "Status" },
                { id: "language", label: "Language" },
                { id: "call_length", label: "Duration" },
                { id: "created_date_time", label: "Created Date & Time" },
              ].map((col) => (
                <TableCell
                  key={col.id}
                  sx={{
                    width:
                      col.id === "filename"
                        ? "38%"
                        : col.id === "status"
                          ? "14%"
                          : col.id === "language"
                            ? "12%"
                            : col.id === "call_length"
                              ? "11%"
                              : col.id === "created_date_time"
                                ? "16%"
                                : "10%",
                    color: "text.primary",
                    fontWeight: 700,
                    fontSize: "0.97rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <TableSortLabel
                    active={appliedFilters.sort_by === col.id}
                    direction={
                      appliedFilters.sort_by === col.id
                        ? appliedFilters.order
                        : "asc"
                    }
                    onClick={() =>
                      setAppliedFilters((prev) => ({
                        ...prev,
                        sort_by: col.id,
                        order: prev.order === "asc" ? "desc" : "asc",
                      }))
                    }
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell
                sx={{
                  color: "text.primary",
                  fontWeight: 700,
                  fontSize: "0.97rem",
                  whiteSpace: "nowrap",
                  width: "10%",
                }}
              >
                Analysis
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading
              ? Array.from(new Array(5)).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from(new Array(6)).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : assets.map((asset) => (
                  <TableRow key={asset.asset_id}>
                    <TableCell>
                      <Typography
                        sx={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "block",
                          maxWidth: "100%",
                          color: "text.primary",
                          fontWeight: 500,
                          fontSize: "1rem",
                        }}
                        title={asset.filename} // shows full name on hover
                      >
                        {asset.filename}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 220 }}>
                      {asset.status === "processing" ||
                      asset.status === "uploaded" ? (
                        <Box>
                          <Chip
                            label={
                              asset.status === "uploaded"
                                ? "uploaded (waiting)"
                                : "processing"
                            }
                            sx={{
                              bgcolor: "#f59e0b",
                              color: "#ffffff",
                              fontWeight: 500,
                              mb: 1,
                            }}
                            size="small"
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              display: "inline-block",
                              mb: 0.7,
                              color: "text.primary",
                              fontWeight: 500,
                              px: 1,
                              py: 0.35,
                              borderRadius: 1,
                              bgcolor: "rgba(148, 163, 184, 0.18)",
                              border: "1px solid rgba(148, 163, 184, 0.35)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            stage: {asset.processing_stage || "starting"}
                          </Typography>

                          <LinearProgress
                            variant="determinate"
                            value={getProcessingProgress(
                              asset.processing_stage,
                            )}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      ) : (
                        <Chip
                          label={asset.status}
                          sx={getStatusStyle(asset.status)}
                          size="small"
                        />
                      )}
                    </TableCell>

                    <TableCell
                      sx={{
                        fontSize: "1rem",
                        color: "text.primary",
                        fontWeight: 500,
                      }}
                    >
                      {asset.language}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "1rem",
                        color: "text.primary",
                        fontWeight: 500,
                      }}
                    >
                      {formatDuration(asset.call_length)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "1rem",
                        color: "text.primary",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDateTime(asset.created_date_time)}
                    </TableCell>

                    <TableCell>
                      {asset.status === "completed" ? (
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() =>
                              navigate(`/analysis/${asset.asset_id}`)
                            }
                          >
                            View
                          </Button>
                        </Box>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={10}
        onPageChange={(e, newPage) => setPage(newPage + 1)}
        rowsPerPageOptions={[10]}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={draftFilters}
        setFilters={setDraftFilters}
        onApply={(nextFilters) => {
          const finalFilters = nextFilters || draftFilters;
          setAppliedFilters(finalFilters);
          setDraftFilters(finalFilters);
          setPage(1);
          setFilterOpen(false);
        }}
        supportedLanguages={supportedLanguages}
      />
    </Box>
  );
};

export default AssetsList;
