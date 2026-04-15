import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Alert, LinearProgress,
  IconButton, List, ListItem, ListItemText, useTheme,
} from '@mui/material';
import { CloudUpload as UploadIcon, Close, InfoOutlined } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { useNavigate } from 'react-router-dom';
import { assetsAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const getFileKey = (f) => `${f.name}-${f.size}-${f.lastModified ?? 0}`;

const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const Upload = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const amber = theme.palette.primary.main;
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [constraints, setConstraints] = useState({
    max_files_per_request: 10,
    max_file_size_mb: 100,
    allowed_extensions: ['.mp3','.wav','.m4a','.mp4','.ogg','.webm'],
    allowed_mime_types: ['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg','audio/webm'],
  });

  const orderedExtensions = useMemo(() => {
    const preferred = ['.m4a','.mp3','.mp4','.ogg','.wav','.webm'];
    const extSet = new Set(constraints.allowed_extensions || []);
    return [
      ...preferred.filter(e => extSet.has(e)),
      ...[...extSet].filter(e => !preferred.includes(e)).sort(),
    ];
  }, [constraints.allowed_extensions]);

  useEffect(() => {
    assetsAPI.getSupportedLanguages()
      .then(r => {
        const l = r.data.supported_languages;
        if (typeof l === 'object') setSupportedLanguages(Object.values(l));
      }).catch(() => {});
    assetsAPI.getUploadConstraints()
      .then(r => setConstraints(r.data))
      .catch(() => {});
  }, []);

  const validateFiles = (selected) => {
    const valid = [];
    selected.forEach(file => {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      const okMime = (constraints.allowed_mime_types || []).includes(file.type);
      const okExt  = (constraints.allowed_extensions || []).includes(ext);
      if (!okMime && !okExt) { setMessage(`Unsupported format: ${file.name}`); return; }
      const maxBytes = (constraints.max_file_size_mb || 100) * 1024 * 1024;
      if (file.size > maxBytes) { setMessage(`File too large: ${file.name}`); return; }
      valid.push(file);
    });
    return valid;
  };

  const addFiles = (selected) => {
    setFiles(prev => {
      const newFiles = validateFiles(selected);
      const unique = newFiles.filter(f => !prev.some(p => p.name === f.name && p.size === f.size));
      const remaining = (constraints.max_files_per_request || 10) - prev.length;
      if (remaining <= 0) { setMessage(`Max ${constraints.max_files_per_request} files allowed.`); return prev; }
      if (unique.length > remaining) setMessage(`Only ${remaining} more file(s) can be added.`);
      return [...prev, ...unique.slice(0, remaining)];
    });
  };

  const handleFileChange = (e) => { addFiles(Array.from(e.target.files)); e.target.value = null; };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); };

  const handleUpload = async () => {
    if (!files.length) { setMessage('Please select at least one file.'); return; }
    setUploading(true); setProgress(0); setMessage('');
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('file', f));
      await assetsAPI.upload(formData, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      });
      setMessage('Upload successful. Redirecting…');
      setFiles([]);
      setTimeout(() => navigate('/assets'), 1200);
    } catch {
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isSuccess = message.includes('successful');

  return (
    <Box className="page-enter" sx={{ maxWidth: 640, mx: 'auto' }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3, mt: { xs: 1, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1.75rem', fontWeight: 400,
            color: theme.palette.text.primary,
          }}>
            Upload Recordings
          </Typography>
          <Tooltip
  title={
    <Box sx={{ p: 0.5, maxWidth: 220 }}>
      <Typography
        sx={{ fontSize: '0.7rem', fontWeight: 600, mb: 0.75, color: amber }}
      >
        Supported Languages
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
        {supportedLanguages.map((l, i) => (
          <Typography
            key={i}
            sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}
          >
            {l}
          </Typography>
        ))}
      </Box>
    </Box>
  }
  placement="bottom-end"
  arrow
>
            <IconButton size="small" sx={{
              color: theme.palette.text.disabled,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '5px', width: 30, height: 30,
            }}>
              <InfoOutlined sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary }}>
          Supported formats: {orderedExtensions.join(', ')}  ·  Max {constraints.max_file_size_mb} MB per file  
        </Typography>
      </Box>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Alert severity={isSuccess ? 'success' : 'error'} sx={{ mb: 2.5 }}>
              {message}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drop zone ── */}
      <Box
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        sx={{
          border: '1.5px dashed',
          borderColor: dragOver ? amber : theme.palette.divider,
          borderRadius: '8px',
          p: { xs: 4, sm: 5 },
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver
            ? (isDark ? `${amber}08` : `${amber}05`)
            : 'transparent',
          transition: 'all 0.15s ease',
          mb: 2,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            borderColor: amber + '60',
            backgroundColor: isDark ? `${amber}06` : `${amber}03`,
          },
        }}
      >
        {/* Subtle radial when dragging */}
        {dragOver && (
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse at center, ${amber}10 0%, transparent 70%)`,
          }} />
        )}

        <Box sx={{
          width: 48, height: 48, mx: 'auto', mb: 2,
          borderRadius: '10px',
          backgroundColor: isDark ? `${amber}12` : `${amber}10`,
          border: `1px solid ${amber}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UploadIcon sx={{ fontSize: 22, color: amber }} />
        </Box>

        <Typography sx={{
          fontSize: '0.9375rem', fontWeight: 500,
          color: theme.palette.text.primary, mb: 0.5,
        }}>
          {dragOver ? 'Release to add files' : 'Drag & drop files here'}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mb: 2 }}>
          or
        </Typography>

        <input
          accept=".mp3,.wav,.m4a,.mp4,.ogg,.webm,audio/*"
          style={{ display: 'none' }} id="file-upload"
          type="file" multiple onChange={handleFileChange}
        />
        <label htmlFor="file-upload">
          <Button
            component="span" variant="outlined"
            size="small"
            sx={{
              fontSize: '0.8125rem', py: 0.6, px: 2,
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              '&:hover': { borderColor: amber + '60', color: amber },
            }}
          >
            Browse files
          </Button>
        </label>
      </Box>

      {/* ── File list ── */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', mb: 1,
              }}>
                <Typography sx={{
                  fontSize: '0.75rem', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: theme.palette.text.disabled,
                }}>
                  {files.length} file{files.length !== 1 ? 's' : ''} ready
                </Typography>
                <Button
                  size="small" variant="text"
                  onClick={() => setFiles([])}
                  sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled, py: 0.25, px: 1 }}
                >
                  Clear all
                </Button>
              </Box>

              <Box sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '6px', overflow: 'hidden',
              }}>
                {files.map((file, i) => (
                  <Box
                    key={getFileKey(file)}
                    sx={{
                      display: 'flex', alignItems: 'center',
                      px: 2, py: 1.25, gap: 1.5,
                      borderBottom: i < files.length - 1
                        ? `1px solid ${theme.palette.divider}` : 'none',
                      backgroundColor: theme.palette.background.paper,
                      '&:hover': { backgroundColor: theme.palette.action.hover },
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    {/* File type icon */}
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '4px',
                      backgroundColor: amber + '18', border: `1px solid ${amber}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Typography sx={{
                        fontFamily: '"DM Mono", monospace',
                        fontSize: '0.55rem', color: amber, fontWeight: 500,
                        lineHeight: 1, letterSpacing: '0',
                      }}>
                        {file.name.split('.').pop()?.toUpperCase().slice(0, 3) || 'AUD'}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontSize: '0.8125rem', fontWeight: 500,
                        color: theme.palette.text.primary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={file.name}>
                        {file.name}
                      </Typography>
                      <Typography sx={{
                        fontSize: '0.6875rem', color: theme.palette.text.disabled,
                        fontFamily: '"DM Mono", monospace',
                      }}>
                        {formatBytes(file.size)}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                      disabled={uploading}
                      sx={{ color: theme.palette.text.disabled, p: 0.4,
                        '&:hover': { color: '#E05252' } }}
                    >
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress ── */}
      <AnimatePresence>
        {uploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary }}>
                  Uploading…
                </Typography>
                <Typography sx={{
                  fontFamily: '"DM Mono", monospace',
                  fontSize: '0.8125rem', color: amber, fontWeight: 500,
                }}>
                  {progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate" value={progress}
                sx={{
                  height: 3, borderRadius: 999,
                  backgroundColor: isDark ? '#28261F' : '#DDD9D1',
                  '& .MuiLinearProgress-bar': { backgroundColor: amber },
                }}
              />
              <Typography sx={{
                fontSize: '0.75rem', color: theme.palette.text.disabled, mt: 0.75,
              }}>
                Do not close this page while uploading
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload button ── */}
      <Button
        variant="contained" fullWidth size="large"
        disabled={!files.length || uploading}
        onClick={handleUpload}
        sx={{
          py: 1.3, fontWeight: 600,
          backgroundColor: amber,
          color: '#0C0B09',
          '&:hover': { backgroundColor: theme.palette.primary.light },
          '&:disabled': { opacity: 0.35, color: '#0C0B09' },
        }}
      >
        {uploading ? 'Uploading…' : `Upload & Process${files.length > 1 ? ` (${files.length})` : ''}`}
      </Button>
    </Box>
  );
};

export default Upload;