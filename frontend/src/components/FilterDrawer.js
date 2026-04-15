import React from 'react';
import {
  Drawer, Box, Typography, Slider, FormGroup,
  FormControlLabel, Checkbox, Button, TextField,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';

const FilterDrawer = ({ open, onClose, onApply, filters, setFilters, supportedLanguages }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const amber  = theme.palette.primary.main;

  const handleClearAll = () => {
    const cleared = {
      search: '', status: [], language: [], sentiment: [],
      min_duration: 0, max_duration: 7200, from_date: null, to_date: null,
      sort_by: '', order: 'desc',
    };
    setFilters(cleared);
    onApply(cleared);
  };

  const toggleArrayValue = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [key]: updated });
  };

  const labelSx = {
    fontSize: '0.6875rem', fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: theme.palette.text.disabled,
  };

  const accordionSx = {
    '&.MuiAccordion-root': {
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '6px !important',
      backgroundColor: theme.palette.background.paper,
      boxShadow: 'none',
      mb: 1,
      '&:before': { display: 'none' },
    },
  };

  const checkboxSx = {
    color: theme.palette.text.disabled,
    '&.Mui-checked': { color: amber },
    padding: '4px 8px',
    '& .MuiSvgIcon-root': { fontSize: 16 },
  };

  const fclSx = {
    '.MuiFormControlLabel-label': {
      fontSize: '0.875rem',
      color: theme.palette.text.secondary,
    },
    mb: 0.25,
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 440 },
          height: '100vh',           // ← FIX: constrain height so flex scroll works
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.default,
          borderLeft: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',        // ← prevent Paper itself from scrolling
        },
      }}
    >
      {/* The outer Box no longer needs height:'100%' since Paper is now flex column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: 3, py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1.15rem', color: theme.palette.text.primary,
          }}>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button size="small" variant="text" onClick={handleClearAll}
              sx={{
                fontSize: '0.75rem', py: 0.4, px: 1,
                color: '#E05252',
                '&:hover': { backgroundColor: 'rgba(224,82,82,0.08)' },
              }}>
              Clear all
            </Button>
            <IconButton size="small" onClick={onClose}
              sx={{ color: theme.palette.text.disabled }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* ── Scrollable body ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',       // ← only this section scrolls
            overflowX: 'hidden',
            px: 3,
            py: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Status — expanded by default */}
          <Accordion sx={accordionSx} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />}
              sx={{ px: 2, minHeight: 44, '& .MuiAccordionSummary-content': { my: 1 } }}
            >
              <Typography sx={labelSx}>Status</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
              <FormGroup sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {['uploaded', 'processing', 'completed', 'failed'].map(s => (
                  <FormControlLabel key={s} sx={fclSx}
                    control={
                      <Checkbox size="small" checked={filters.status?.includes(s)}
                        onChange={() => toggleArrayValue('status', s)} sx={checkboxSx} />
                    }
                    label={s.charAt(0).toUpperCase() + s.slice(1)}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          {/* Languages */}
          <Accordion sx={accordionSx} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />}
              sx={{ px: 2, minHeight: 44, '& .MuiAccordionSummary-content': { my: 1 } }}
            >
              <Typography sx={labelSx}>Language</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5, maxHeight: 220, overflowY: 'auto' }}>
              <FormGroup>
                {(supportedLanguages || []).map(lang => (
                  <FormControlLabel key={lang.code} sx={fclSx}
                    control={
                      <Checkbox size="small" checked={(filters.language || []).includes(lang.name)}
                        onChange={() => toggleArrayValue('language', lang.name)} sx={checkboxSx} />
                    }
                    label={lang.name}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          {/* Sentiment */}
          <Accordion sx={accordionSx} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />}
              sx={{ px: 2, minHeight: 44, '& .MuiAccordionSummary-content': { my: 1 } }}
            >
              <Typography sx={labelSx}>Sentiment</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
              <FormGroup>
                {['Positive', 'Neutral', 'Negative'].map(s => (
                  <FormControlLabel key={s} sx={fclSx}
                    control={
                      <Checkbox size="small" checked={(filters.sentiment || []).includes(s)}
                        onChange={() => toggleArrayValue('sentiment', s)} sx={checkboxSx} />
                    }
                    label={s}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          {/* Duration */}
          <Box sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '6px', p: 2,
            backgroundColor: theme.palette.background.paper,
          }}>
            <Typography sx={{ ...labelSx, mb: 1.5 }}>Duration (seconds)</Typography>
            <Slider
              value={[filters.min_duration ?? 0, filters.max_duration ?? 7200]}
              min={0} max={7200}
              onChange={(_, v) => setFilters({ ...filters, min_duration: v[0], max_duration: v[1] })}
              valueLabelDisplay="auto"
              sx={{
                color: amber,
                '& .MuiSlider-thumb': {
                  width: 14, height: 14,
                  '&:hover': { boxShadow: `0 0 0 6px ${amber}20` },
                },
                '& .MuiSlider-rail': { backgroundColor: isDark ? '#3A3830' : '#DDD9D1' },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="Min" size="small" fullWidth
                value={filters.min_duration ?? 0}
                onChange={e => setFilters({ ...filters, min_duration: Number(e.target.value) || 0 })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '5px' }, '& input': { fontSize: '0.875rem' } }}
              />
              <TextField label="Max" size="small" fullWidth
                value={filters.max_duration ?? 7200}
                onChange={e => setFilters({ ...filters, max_duration: Number(e.target.value) || 0 })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '5px' }, '& input': { fontSize: '0.875rem' } }}
              />
            </Box>
          </Box>

          {/* Date range */}
          <Box sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            backgroundColor: theme.palette.background.paper,
            overflow: 'visible',     // ← allow date picker to render fully
          }}>
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
              <Typography sx={labelSx}>Date Range</Typography>
            </Box>
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              pb: 1,
              // Dark mode overrides for date picker
              ...(isDark && {
                '& .rdrCalendarWrapper': { background: '#1A1915', color: '#C5C2BB' },
                '& .rdrDayNumber span': { color: '#C5C2BB' },
                '& .rdrWeekDay': { color: '#8C8880' },
                '& .rdrMonthAndYearPickers select': { color: '#C5C2BB', background: 'transparent' },
                '& .rdrNextPrevButton': { background: '#28261F', '& i': { borderRightColor: '#C5C2BB', borderLeftColor: '#C5C2BB' } },
                '& .rdrDateDisplayWrapper': { background: '#28261F' },
                '& .rdrDateDisplayItem': { background: '#1A1915', borderColor: '#3A3830' },
                '& .rdrDayDisabled': { background: 'transparent', '& .rdrDayNumber span': { color: '#5C5A54' } },
                '& .rdrDayPassive .rdrDayNumber span': { color: '#5C5A54' },
                '& .rdrDayToday .rdrDayNumber span:after': { background: amber },
                '& .rdrStartEdge, & .rdrEndEdge, & .rdrInRange': { color: amber },
                '& .rdrDayHovered .rdrDayNumber:after': { borderColor: amber },
              }),
              '& .rdrStartEdge, & .rdrEndEdge, & .rdrInRange': { color: `${amber} !important` },
              '& .rdrDayToday .rdrDayNumber span:after': { background: amber },
            }}>
              <DateRangePicker
                months={1}
                direction="horizontal"
                ranges={[{
                  startDate: filters.from_date || new Date(),
                  endDate:   filters.to_date   || new Date(),
                  key: 'selection',
                }]}
                onChange={(item) => setFilters({
                  ...filters,
                  from_date: item.selection.startDate,
                  to_date:   item.selection.endDate,
                })}
                maxDate={new Date()}
                showDateDisplay={false}
                showSelectionPreview
                moveRangeOnFirstSelection={false}
                staticRanges={[]}
                inputRanges={[]}
                rangeColors={[amber]}
              />
            </Box>
          </Box>

          {/* Bottom padding so last item isn't flush against apply button */}
          <Box sx={{ height: 8, flexShrink: 0 }} />
        </Box>

        {/* ── Apply button ── */}
        <Box sx={{
          px: 3, py: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
          backgroundColor: theme.palette.background.default,
        }}>
          <Button
            variant="contained" fullWidth size="large"
            onClick={() => onApply(filters)}
            sx={{
              py: 1.2, fontWeight: 600,
              backgroundColor: amber, color: '#0C0B09',
              '&:hover': { backgroundColor: theme.palette.primary.light },
            }}
          >
            Apply Filters
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default FilterDrawer;