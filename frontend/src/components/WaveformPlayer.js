import React, {
  useEffect, useRef, useState, forwardRef, useImperativeHandle,
} from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Box, Typography, Select, MenuItem, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const WaveformPlayer = forwardRef(({ audioSrc, onTimeUpdate }, ref) => {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const amber   = theme.palette.primary.main;
  const waveRef = useRef(null);
  const wsRef   = useRef(null);

  const [ready,    setReady]    = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate,     setRate]     = useState(1);

  useEffect(() => {
    if (!audioSrc || !waveRef.current) return;
    let ws = null;
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled || !waveRef.current) return;

      ws = WaveSurfer.create({
        container:     waveRef.current,
        waveColor:     isDark ? '#3A3830' : '#DDD9D1',
        progressColor: amber,
        cursorColor:   amber,
        cursorWidth:   1,
        height:        56,
        barWidth:      2,
        barGap:        1.5,
        barRadius:     2,
        responsive:    true,
      });

      ws.load(audioSrc);

      ws.on('ready',  () => { if (!cancelled) { setReady(true); setDuration(ws.getDuration()); } });
      ws.on('play',   () => { if (!cancelled) setPlaying(true);  });
      ws.on('pause',  () => { if (!cancelled) setPlaying(false); });
      ws.on('finish', () => { if (!cancelled) setPlaying(false); });
      ws.on('audioprocess', () => {
        if (cancelled) return;
        const t = ws.getCurrentTime();
        setCurrent(t);
        onTimeUpdate?.(t * 1000);
      });
      ws.on('seek', () => {
        if (cancelled) return;
        const t = ws.getCurrentTime();
        setCurrent(t);
        onTimeUpdate?.(t * 1000);
      });

      wsRef.current = ws;
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (wsRef.current) {
        try { wsRef.current.destroy(); } catch {}
        wsRef.current = null;
      }
      setReady(false); setPlaying(false); setCurrent(0); setDuration(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  useImperativeHandle(ref, () => ({
    seekTo: (ms) => {
      if (!wsRef.current || !ready) return;
      const dur = wsRef.current.getDuration();
      if (!dur) return;
      wsRef.current.seekTo((ms / 1000) / dur);
    },
  }));

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <Box sx={{
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: '6px',
      p: 1.75,
      mb: 1.5,
      backgroundColor: theme.palette.background.paper,
    }}>
      {/* Waveform */}
      <Box
        sx={{ mb: 1, cursor: ready ? 'pointer' : 'default', position: 'relative' }}
        onClick={() => wsRef.current?.playPause()}
      >
        <Box ref={waveRef} sx={{ width: '100%' }} />
        {!ready && (
          <Box sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center',
            backgroundColor: isDark ? '#1A1915' : '#F4F1EC',
            borderRadius: '3px',
          }}>
            <Box sx={{
              flex: 1, height: 2, mx: 1,
              backgroundColor: theme.palette.divider,
              borderRadius: 999,
              overflow: 'hidden',
              '& .loading-bar': {
                height: '100%', width: '30%', borderRadius: 999,
                backgroundColor: amber,
                animation: 'loadingSlide 1.2s ease-in-out infinite',
                '@keyframes loadingSlide': {
                  '0%':   { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(400%)' },
                },
              },
            }}>
              <Box className="loading-bar" />
            </Box>
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Play/pause */}
        <Box
          onClick={() => wsRef.current?.playPause()}
          sx={{
            width: 30, height: 30, borderRadius: '5px',
            border: `1px solid ${ready ? amber + '50' : theme.palette.divider}`,
            backgroundColor: ready ? amber + '14' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: ready ? 'pointer' : 'not-allowed',
            opacity: ready ? 1 : 0.5,
            transition: 'all 0.15s ease',
            color: amber,
            '&:hover': ready ? { backgroundColor: amber + '22' } : {},
          }}
        >
          {playing
            ? <PauseIcon sx={{ fontSize: 16 }} />
            : <PlayArrowIcon sx={{ fontSize: 16 }} />
          }
        </Box>

        {/* Timestamps */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '0.75rem', color: amber, fontWeight: 500,
            minWidth: 36, textAlign: 'right',
          }}>
            {fmt(current)}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: theme.palette.text.disabled }}>
            /
          </Typography>
          <Typography sx={{
            fontFamily: '"DM Mono", monospace',
            fontSize: '0.75rem', color: theme.palette.text.disabled,
            minWidth: 36,
          }}>
            {fmt(duration)}
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{
            height: 3, borderRadius: 999,
            backgroundColor: isDark ? '#3A3830' : '#DDD9D1',
            cursor: 'pointer', position: 'relative',
            overflow: 'hidden',
          }}
            onClick={(e) => {
              if (!wsRef.current || !ready) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              wsRef.current.seekTo(Math.max(0, Math.min(1, ratio)));
            }}
          >
            <Box sx={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${progress}%`,
              backgroundColor: amber, borderRadius: 999,
              transition: 'width 0.1s linear',
            }} />
          </Box>
        </Box>

        {/* Playback rate */}
        <Select
          size="small" value={rate}
          onChange={(e) => {
            setRate(e.target.value);
            wsRef.current?.setPlaybackRate(e.target.value);
          }}
          sx={{
            fontSize: '0.7rem', height: 26, minWidth: 52,
            fontFamily: '"DM Mono", monospace',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
            '& .MuiSelect-select': { py: 0.25, px: 1 },
          }}
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
            <MenuItem key={r} value={r}
              sx={{ fontSize: '0.75rem', fontFamily: '"DM Mono", monospace' }}>
              {r}×
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
});

export default WaveformPlayer;