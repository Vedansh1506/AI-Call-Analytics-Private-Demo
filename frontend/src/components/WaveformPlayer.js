import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Box, Typography, Button, Select, MenuItem, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const WaveformPlayer = forwardRef(({
  audioSrc,
  onTimeUpdate,
}, ref) => {
  const theme      = useTheme();
  const waveRef    = useRef(null);
  const wsRef      = useRef(null);
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
        waveColor:     theme.palette.mode === 'dark' ? '#334155' : '#cbd5e1',
        progressColor: theme.palette.primary.main,
        cursorColor:   theme.palette.primary.main,
        height:        72,
        barWidth:      2,
        barGap:        2,
        responsive:    true,
      });

      ws.load(audioSrc);

      ws.on('ready', () => {
        if (cancelled) return;
        setReady(true);
        setDuration(ws.getDuration());
      });
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
      setReady(false);
      setPlaying(false);
      setCurrent(0);
      setDuration(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  useImperativeHandle(ref, () => ({
    seekTo: (ms) => {
      if (!wsRef.current || !ready) return;
      const dur = wsRef.current.getDuration();
      if (!dur) return;
      wsRef.current.seekTo((ms / 1000) / dur);
    }
  }));

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 2, p: 2,
      bgcolor: 'background.paper',
    }}>
      <Box
        sx={{ position: 'relative', mb: 1.5, cursor: 'pointer' }}
        onClick={() => wsRef.current?.playPause()}
      >
        <Box ref={waveRef} sx={{ width: '100%' }} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained" size="small"
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
          sx={{ minWidth: 40, px: 1.5 }}
        >
          {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {fmt(current)} / {fmt(duration)}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Select
          size="small"
          value={rate}
          onChange={(e) => {
            setRate(e.target.value);
            wsRef.current?.setPlaybackRate(e.target.value);
          }}
          sx={{ fontSize: '0.75rem', height: 28 }}
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
            <MenuItem key={r} value={r} sx={{ fontSize: '0.75rem' }}>{r}×</MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
});

export default WaveformPlayer;