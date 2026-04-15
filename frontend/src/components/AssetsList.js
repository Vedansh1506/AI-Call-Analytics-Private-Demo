import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Alert, TextField, IconButton,
  Badge, TablePagination, Skeleton, useTheme,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import TableSortLabel from '@mui/material/TableSortLabel';
import LinearProgress from '@mui/material/LinearProgress';
import { useNavigate } from 'react-router-dom';
import { assetsAPI } from '../services/api';
import FilterDrawer from '../components/FilterDrawer';
import PageEmptyState from './EmptyState';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import CloseIcon from '@mui/icons-material/Close';
import qs from 'qs';

const ASSETS_LIST_STATE_KEY = 'assets_list_state_v1';
const DEFAULT_FILTERS = {
  search: '',
  status: [],
  language: [],
  sentiment: [],
  min_duration: 0,
  max_duration: 7200,
  from_date: null,
  to_date: null,
  sort_by: '',
  order: 'desc',
};

const readAssetsListState = () => {
  try {
    if (typeof window === 'undefined') return { page: 1, filters: DEFAULT_FILTERS };
    const raw = window.sessionStorage.getItem(ASSETS_LIST_STATE_KEY);
    if (!raw) return { page: 1, filters: DEFAULT_FILTERS };
    const parsed = JSON.parse(raw);
    const asArray = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);
    const filters = {
      ...DEFAULT_FILTERS,
      ...(parsed?.filters || {}),
      status:   asArray(parsed?.filters?.status),
      language: asArray(parsed?.filters?.language),
      sentiment:asArray(parsed?.filters?.sentiment),
      from_date: parsed?.filters?.from_date ? new Date(parsed.filters.from_date) : null,
      to_date:   parsed?.filters?.to_date   ? new Date(parsed.filters.to_date)   : null,
    };
    const page = Number(parsed?.page);
    return { page: Number.isFinite(page) && page > 0 ? page : 1, filters };
  } catch { return { page: 1, filters: DEFAULT_FILTERS }; }
};

// ── Status chip ──────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const map = {
    completed: { color: 'success', label: 'Completed' },
    failed:    { color: 'error',   label: 'Failed'    },
    uploaded:  { color: 'info',    label: 'Uploaded'  },
    processing:{ color: 'warning', label: 'Processing'},
  };
  const cfg = map[status] || { color: 'default', label: status };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
};


const AssetsList = () => {
  const restored = readAssetsListState();
  const [assets,  setAssets]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [page,    setPage]    = useState(restored.page);
  const [total,   setTotal]   = useState(0);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters,   setDraftFilters]   = useState(restored.filters);
  const [appliedFilters, setAppliedFilters] = useState(restored.filters);
  const navigate = useNavigate();
  const pollingRef    = useRef(null);
  const fetchAssetsRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    try {
      const payload = {
        page,
        filters: {
          ...appliedFilters,
          from_date: appliedFilters.from_date ? new Date(appliedFilters.from_date).toISOString() : null,
          to_date:   appliedFilters.to_date   ? new Date(appliedFilters.to_date).toISOString()   : null,
        },
      };
      window.sessionStorage.setItem(ASSETS_LIST_STATE_KEY, JSON.stringify(payload));
    } catch {}
  }, [page, appliedFilters]);

  useEffect(() => {
    assetsAPI.getSupportedLanguages()
      .then(r => {
        const langs = r.data.supported_languages;
        if (langs) setSupportedLanguages(Object.entries(langs).map(([code, name]) => ({ code, name })));
      })
      .catch(() => {});
  }, []);

  const stopPolling  = useCallback(() => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } }, []);
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => { fetchAssetsRef.current?.(); }, 5000);
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const params = {
        page, page_size: 10,
        search:        appliedFilters.search,
        status_filter: appliedFilters.status,
        language:      appliedFilters.language,
        sentiment:     appliedFilters.sentiment,
        min_duration:  appliedFilters.min_duration,
        max_duration:  appliedFilters.max_duration,
        from_date:     appliedFilters.from_date,
        to_date:       appliedFilters.to_date,
        sort_by:       appliedFilters.sort_by,
        order:         appliedFilters.order,
      };
      if (!appliedFilters.status?.length)    delete params.status_filter;
      if (!appliedFilters.language.length)   delete params.language;
      if (!appliedFilters.sentiment.length)  delete params.sentiment;
      Object.keys(params).forEach(k => { if (params[k] === '' || params[k] == null) delete params[k]; });

      const response = await assetsAPI.list(params);
      const items = response.data.items || [];
      setAssets(items);
      setTotal(response.data.total || 0);
      setLoading(false);
      items.some(a => a.status === 'processing' || a.status === 'uploaded') ? startPolling() : stopPolling();
    } catch {
      setError('Failed to load assets.');
      setLoading(false);
    }
  }, [page, appliedFilters, startPolling, stopPolling]);

  useEffect(() => { fetchAssetsRef.current = fetchAssets; }, [fetchAssets]);
  useEffect(() => { setLoading(true); fetchAssets(); }, [fetchAssets]);
  useEffect(() => () => stopPolling(), [stopPolling]);

  const getProcessingProgress = (stage) => {
    switch(stage) {
      case 'transcription': return 30;
      case 'analysis':      return 65;
      case 'completed':     return 100;
      default:              return 10;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
      : `${m}:${s.toString().padStart(2,'0')}`;
  };

  const formatDateTime = (ds) => {
    if (!ds) return '—';
    return new Date(ds).toLocaleString('en-GB');
  };

  const activeFilterCount = appliedFilters.language.length + appliedFilters.sentiment.length + appliedFilters.status.length
    + (appliedFilters.from_date || appliedFilters.to_date ? 1 : 0);

  const cols = [
    { id: 'filename',          label: 'Filename',         width: '36%' },
    { id: 'status',            label: 'Status',           width: '16%' },
    { id: 'language',          label: 'Language',         width: '12%' },
    { id: 'call_length',       label: 'Duration',         width: '10%' },
    { id: 'created_date_time', label: 'Created',          width: '16%' },
  ];

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 3,
        mt: { xs: 0.5, md: 0 },
      }}>
        <Box>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '1.5rem', md: '1.75rem' },
            fontWeight: 400,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            mb: 0.25,
          }}>
            Call Recordings
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>
            {total} recording{total !== 1 ? 's' : ''} total
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            size="small"
            placeholder="Search recordings…"
            aria-label="Search assets"
            sx={{ width: { xs: '100%', sm: 240 } }}
            value={draftFilters.search}
            onChange={e => {
              const value = e.target.value;
              setDraftFilters(prev => ({ ...prev, search: value }));
              setAppliedFilters(prev => ({ ...prev, search: value }));
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: draftFilters.search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => {
                    setDraftFilters(p => ({ ...p, search: '' }));
                    setAppliedFilters(p => ({ ...p, search: '' }));
                    setPage(1);
                  }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <IconButton
            onClick={() => setFilterOpen(true)}
            aria-label="Open filters"
            sx={{
              border: `1px solid ${activeFilterCount > 0 ? theme.palette.primary.main : theme.palette.divider}`,
              borderRadius: 1.5,
              color: activeFilterCount > 0 ? 'primary.main' : 'text.secondary',
              bgcolor: activeFilterCount > 0 ? theme.palette.primary.main + '10' : 'transparent',
              width: 36, height: 36,
              '&:hover': { borderColor: 'primary.main', bgcolor: `${theme.palette.primary.main}15` },
              transition: 'all 0.15s',
            }}
          >
            <Badge badgeContent={activeFilterCount} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
              <FilterListIcon sx={{ fontSize: 17 }} />
            </Badge>
          </IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {appliedFilters.status.map(s => (
            <Chip key={s} label={`Status: ${s}`} size="small" onDelete={() => {
              setAppliedFilters(p => ({ ...p, status: p.status.filter(v => v !== s) }));
              setDraftFilters(p => ({ ...p, status: p.status.filter(v => v !== s) }));
              setPage(1);
            }} />
          ))}
          {appliedFilters.language.map(lang => (
            <Chip key={lang} label={`Language: ${lang}`} size="small" onDelete={() => {
              setAppliedFilters(p => ({ ...p, language: p.language.filter(l => l !== lang) }));
              setDraftFilters(p => ({ ...p, language: p.language.filter(l => l !== lang) }));
              setPage(1);
            }} />
          ))}
          {appliedFilters.sentiment.map(s => (
            <Chip key={s} label={`Sentiment: ${s}`} size="small" onDelete={() => {
              setAppliedFilters(p => ({ ...p, sentiment: p.sentiment.filter(v => v !== s) }));
              setDraftFilters(p => ({ ...p, sentiment: p.sentiment.filter(v => v !== s) }));
              setPage(1);
            }} />
          ))}
          {(appliedFilters.min_duration !== 0 || appliedFilters.max_duration !== 7200) && (
            <Chip label={`Duration: ${appliedFilters.min_duration}–${appliedFilters.max_duration}s`} size="small" onDelete={() => {
              setAppliedFilters(p => ({ ...p, min_duration: 0, max_duration: 7200 }));
              setDraftFilters(p => ({ ...p, min_duration: 0, max_duration: 7200 }));
              setPage(1);
            }} />
          )}
          {(appliedFilters.from_date || appliedFilters.to_date) && (
            <Chip label="Date filter" size="small" onDelete={() => {
              setAppliedFilters(p => ({ ...p, from_date: null, to_date: null }));
              setDraftFilters(p => ({ ...p, from_date: null, to_date: null }));
              setPage(1);
            }} />
          )}
        </Box>
      )}

      {/* ── Table ── */}
      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer>
          <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow>
                {cols.map(col => (
                  <TableCell key={col.id} sx={{ width: col.width }}>
                    <TableSortLabel
                      active={appliedFilters.sort_by === col.id}
                      direction={appliedFilters.sort_by === col.id ? appliedFilters.order : 'asc'}
                      onClick={() => setAppliedFilters(prev => ({
                        ...prev,
                        sort_by: col.id,
                        order: prev.order === 'asc' ? 'desc' : 'asc',
                      }))}
                      sx={{
                        '& .MuiTableSortLabel-icon': { fontSize: 14 },
                        '&.Mui-active': { color: 'text.secondary' },
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell sx={{ width: '10%' }}>Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton height={20} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !assets.length ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ border: 0, p: 0 }}>
                    <PageEmptyState
                      variant={appliedFilters.search || appliedFilters.status.length ? 'search' : 'calls'}
                      description={
                        appliedFilters.search || appliedFilters.status.length
                          ? 'No recordings match your current filters.'
                          : 'Upload your first call recording to start analysing.'
                      }
                      ctaLabel={appliedFilters.search ? undefined : 'Upload a recording'}
                      ctaPath="/upload"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow
                    key={asset.asset_id}
                    sx={{ cursor: asset.status === 'completed' ? 'pointer' : 'default' }}
                    onClick={() => asset.status === 'completed' && navigate(`/analysis/${asset.asset_id}`)}
                    hover
                  >
                    <TableCell>
                      <Typography sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'text.primary',
                        fontFamily: '"DM Sans", sans-serif',
                      }} title={asset.filename}>
                        {asset.filename}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {(asset.status === 'processing' || asset.status === 'uploaded') ? (
                        <Box>
                          <StatusChip status={asset.status} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={getProcessingProgress(asset.processing_stage)}
                              sx={{ flex: 1, height: 3 }}
                            />
                            <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
                              {asset.processing_stage || 'queued'}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <StatusChip status={asset.status} />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontFamily: '"DM Sans", sans-serif' }}>
                        {asset.language || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                        {formatDuration(asset.call_length)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
                        {formatDateTime(asset.created_date_time)}
                      </Typography>
                    </TableCell>

                    <TableCell onClick={e => e.stopPropagation()}>
                      {asset.status === 'completed' && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/analysis/${asset.asset_id}`)}
                          sx={{ fontSize: '0.75rem', py: 0.5, px: 1.5 }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <TablePagination
        component="div"
        count={total}
        page={page - 1}
        rowsPerPage={10}
        onPageChange={(e, newPage) => setPage(newPage + 1)}
        rowsPerPageOptions={[10]}
        sx={{ '& *': { fontFamily: '"DM Sans", sans-serif', fontSize: '0.8125rem' } }}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={draftFilters}
        setFilters={setDraftFilters}
        onApply={(nextFilters) => {
          const final = nextFilters || draftFilters;
          setAppliedFilters(final);
          setDraftFilters(final);
          setPage(1);
          setFilterOpen(false);
        }}
        supportedLanguages={supportedLanguages}
      />
    </Box>
  );
};

export default AssetsList;