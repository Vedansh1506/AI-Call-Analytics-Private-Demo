import React, { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

const SPEAKER_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316',
];

const SpeakerTimeline = ({ utterances = [], totalDurationMs }) => {
  const theme = useTheme();

  const speakers = useMemo(() => {
    const map = {};
    utterances.forEach((u) => {
      const key = u.speaker_id || 'unknown';
      if (!map[key]) map[key] = { id: key, role: u.role || key, segments: [] };
      map[key].segments.push({ start: u.start, end: u.end });
    });
    return Object.values(map);
  }, [utterances]);

  const total = totalDurationMs || Math.max(...utterances.map(u => u.end), 1);

  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((total * i) / (tickCount - 1) / 1000)
  );

  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!utterances.length) return null;

  return (
    <Box>
      {/* time axis */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, pl: '90px' }}>
        {ticks.map((t, i) => (
          <Typography key={i} variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            {fmt(t)}
          </Typography>
        ))}
      </Box>

      {/* speaker rows */}
      {speakers.map((sp, si) => (
        <Box key={sp.id} sx={{ display: 'flex', alignItems: 'center', mb: 1.2, gap: 1 }}>
          {/* label */}
          <Typography
            variant="caption"
            sx={{
              width: 82, flexShrink: 0, textAlign: 'right', pr: 1,
              fontSize: '0.72rem', color: 'text.secondary',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {sp.role}
          </Typography>

          {/* track */}
          <Box sx={{
            flex: 1, height: 22, position: 'relative',
            bgcolor: theme.palette.action.hover,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
          }}>
            {sp.segments.map((seg, i) => {
              const left  = (seg.start / total) * 100;
              const width = ((seg.end - seg.start) / total) * 100;
              return (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${Math.max(width, 0.3)}%`,
                    top: 2, bottom: 2,
                    bgcolor: SPEAKER_COLORS[si % SPEAKER_COLORS.length],
                    borderRadius: 0.5,
                    opacity: 0.85,
                    transition: 'opacity 0.15s',
                    '&:hover': { opacity: 1 },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      ))}

      {/* legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1, pl: '90px', flexWrap: 'wrap' }}>
        {speakers.map((sp, si) => (
          <Box key={sp.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              width: 10, height: 10, borderRadius: 0.5,
              bgcolor: SPEAKER_COLORS[si % SPEAKER_COLORS.length],
            }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {sp.role}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default SpeakerTimeline;