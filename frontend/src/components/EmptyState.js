import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// ── Refined SVG illustrations ──────────────────────────────────────────────
const ILLUSTRATIONS = {
  calls: (amber, muted) => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="10" y="18" width="44" height="32" rx="4" stroke={muted} strokeWidth="1.5" fill="none" />
      <rect x="10" y="18" width="44" height="10" rx="4" fill={amber} fillOpacity="0.12" />
      <rect x="16" y="22" width="8" height="2" rx="1" fill={amber} fillOpacity="0.7" />
      <rect x="16" y="34" width="32" height="1.5" rx="0.75" fill={muted} fillOpacity="0.4" />
      <rect x="16" y="38" width="24" height="1.5" rx="0.75" fill={muted} fillOpacity="0.25" />
      <rect x="16" y="42" width="20" height="1.5" rx="0.75" fill={muted} fillOpacity="0.25" />
      <circle cx="50" cy="22" r="2" fill={amber} fillOpacity="0.5" />
    </svg>
  ),
  search: (amber, muted) => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="28" cy="28" r="14" stroke={muted} strokeWidth="1.5" fill="none" />
      <line x1="38" y1="38" x2="52" y2="52" stroke={amber} strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="28" x2="34" y2="28" stroke={muted} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="28" y1="22" x2="28" y2="34" stroke={muted} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  ),
  upload: (amber, muted) => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="16" width="40" height="32" rx="4" stroke={muted} strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      <path d="M32 40V28M32 28L26 34M32 28L38 34" stroke={amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20" y="44" width="24" height="2" rx="1" fill={amber} fillOpacity="0.25" />
    </svg>
  ),
};

const PageEmptyState = ({
  variant = 'calls',
  title,
  description,
  ctaLabel,
  ctaPath,
  onCta,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const amber = theme.palette.primary.main;
  const muted = theme.palette.text.disabled;

  const defaults = {
    calls: {
      title: 'No recordings yet',
      description: 'Upload your first call recording to begin AI-powered analysis.',
      ctaLabel: 'Upload a call', ctaPath: '/upload',
    },
    search: {
      title: 'No results found',
      description: 'Try adjusting your search terms or filters.',
    },
    upload: {
      title: 'Drop files here',
      description: 'Drag and drop your call recordings, or click to browse.',
    },
  };

  const d = defaults[variant] || defaults.calls;
  const resolvedTitle = title       || d.title;
  const resolvedDesc  = description || d.description;
  const resolvedCta   = ctaLabel    || d.ctaLabel;
  const resolvedPath  = ctaPath     || d.ctaPath;

  const handleCta = () => {
    if (onCta) { onCta(); return; }
    if (resolvedPath) navigate(resolvedPath);
  };

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      py: 8, px: 3, textAlign: 'center',
    }}>
      {/* Illustration */}
      <Box sx={{
        mb: 2.5, opacity: 0.9,
        filter: `drop-shadow(0 2px 8px ${amber}20)`,
      }}>
        {ILLUSTRATIONS[variant]?.(amber, muted)}
      </Box>

      <Typography sx={{
        fontFamily: '"DM Serif Display", serif',
        fontSize: '1.2rem', fontWeight: 400,
        color: theme.palette.text.primary, mb: 0.75,
      }}>
        {resolvedTitle}
      </Typography>

      <Typography sx={{
        fontSize: '0.8125rem',
        color: theme.palette.text.secondary,
        maxWidth: 280, mb: 3, lineHeight: 1.7,
      }}>
        {resolvedDesc}
      </Typography>

      {resolvedCta && (
        <Button
          variant="outlined" onClick={handleCta}
          sx={{
            fontSize: '0.8125rem', py: 0.75, px: 2.5,
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            '&:hover': {
              borderColor: amber + '60',
              color: amber,
              backgroundColor: amber + '08',
            },
          }}
        >
          {resolvedCta}
        </Button>
      )}
    </Box>
  );
};

export default PageEmptyState;