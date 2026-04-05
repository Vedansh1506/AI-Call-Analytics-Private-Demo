import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ILLUSTRATIONS = {
  calls: (color) => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="38" fill={color} fillOpacity="0.08"/>
      <rect x="22" y="28" width="36" height="26" rx="4" stroke={color} strokeWidth="2" fill="none"/>
      <circle cx="40" cy="41" r="6" stroke={color} strokeWidth="2" fill="none"/>
      <line x1="30" y1="54" x2="50" y2="54" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="34" y1="28" x2="34" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="28" x2="46" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  upload: (color) => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="38" fill={color} fillOpacity="0.08"/>
      <path d="M40 52V32M40 32L32 40M40 32L48 40" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="24" y="54" width="32" height="4" rx="2" fill={color} fillOpacity="0.3"/>
    </svg>
  ),
  search: (color) => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="38" fill={color} fillOpacity="0.08"/>
      <circle cx="36" cy="36" r="12" stroke={color} strokeWidth="2" fill="none"/>
      <line x1="45" y1="45" x2="56" y2="56" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="30" y1="36" x2="42" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
      <line x1="36" y1="30" x2="36" y2="42" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
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

  const defaults = {
    calls: {
      title: 'No call recordings yet',
      description: 'Upload your first call recording to get started with AI-powered analysis.',
      ctaLabel: 'Upload a call',
      ctaPath: '/upload',
    },
    search: {
      title: 'No results found',
      description: 'Try adjusting your search or filters to find what you\'re looking for.',
    },
    upload: {
      title: 'Drop files here',
      description: 'Drag and drop your call recordings or click to browse.',
    },
  };

  const d = defaults[variant] || defaults.calls;
  const resolvedTitle  = title       || d.title;
  const resolvedDesc   = description || d.description;
  const resolvedCta    = ctaLabel    || d.ctaLabel;
  const resolvedPath   = ctaPath     || d.ctaPath;

  const handleCta = () => {
    if (onCta) { onCta(); return; }
    if (resolvedPath) navigate(resolvedPath);
  };

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', py: 8, px: 4, textAlign: 'center',
    }}>
      {ILLUSTRATIONS[variant]?.('#6366f1')}

      <Typography variant="h6" sx={{ mt: 2.5, mb: 1, fontWeight: 600 }}>
        {resolvedTitle}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, mb: 3, lineHeight: 1.7 }}>
        {resolvedDesc}
      </Typography>

      {resolvedCta && (
        <Button variant="contained" onClick={handleCta} size="medium">
          {resolvedCta}
        </Button>
      )}
    </Box>
  );
};

export default PageEmptyState;