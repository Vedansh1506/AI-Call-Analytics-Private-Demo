import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, CircularProgress,
  Tooltip, Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sendChatMessage, getChatSessions, getChatSession, deleteChatSession,
} from '../services/api';

const SUGGESTED = [
  'What was the main issue discussed?',
  'What is the overall sentiment of this call?',
  'What could the agent have done better?',
  'Draft a follow-up email for this call',
  'Summarise this call in 3 bullet points',
];

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  const now = new Date();
  const diffM = (now - d) / 60000;
  if (diffM < 1) return 'just now';
  if (diffM < 60) return `${Math.floor(diffM)}m ago`;
  const diffH = (now - d) / 3600000;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return 'yesterday';
  return d.toLocaleDateString();
};

export default function AskAI({ assetId, fileName }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const amber = theme.palette.primary.main;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const bottomRef = useRef(null);

  const loadSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const data = await getChatSessions(assetId);
      setSessions(data);
    } catch { setSessions([]); }
    finally { setSessLoading(false); }
  }, [assetId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openSession = async (id) => {
    if (loading) return;
    try {
      const data = await getChatSession(id);
      setActiveSessionId(data.id);
      setMessages((data.messages || []).map(m => ({ role: m.role, text: m.text })));
    } catch {}
  };

  const newConversation = () => { setActiveSessionId(null); setMessages([]); setInput(''); };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteChatSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) newConversation();
    } catch {}
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const { reply, session_id } = await sendChatMessage(assetId, text, activeSessionId);
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      if (!activeSessionId) {
        setActiveSessionId(session_id);
        await loadSessions();
      } else {
        setSessions(prev => prev.map(s =>
          s.id === session_id
            ? { ...s, message_count: s.message_count + 2, updated_at: new Date().toISOString() }
            : s
        ));
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  const sidebarW = sidebarCollapsed ? 48 : 196;
  const borderColor = theme.palette.divider;

  return (
    <Box sx={{
      display: 'flex',
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
      minHeight: 520,
      backgroundColor: theme.palette.background.paper,
    }}>
      {/* ── Sidebar ── */}
      <Box sx={{
        width: sidebarW, flexShrink: 0,
        borderRight: `1px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.18s ease',
        overflow: 'hidden',
        backgroundColor: isDark ? '#1A1915' : '#F4F1EC',
      }}>
        {/* Header */}
        <Box sx={{
          height: 44, px: 1, display: 'flex', alignItems: 'center',
          gap: 0.5, borderBottom: `1px solid ${borderColor}`, flexShrink: 0,
        }}>
          {!sidebarCollapsed && (
            <Box
              onClick={newConversation}
              sx={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.5, borderRadius: '4px', cursor: 'pointer',
                border: `1px solid ${borderColor}`,
                backgroundColor: theme.palette.background.paper,
                '&:hover': { borderColor: amber + '50', backgroundColor: isDark ? '#28261F' : '#F0ECE4' },
                transition: 'all 0.12s ease',
              }}
            >
              <AddIcon sx={{ fontSize: 13, color: theme.palette.text.disabled }} />
              <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>New chat</Typography>
            </Box>
          )}
          <IconButton size="small" onClick={() => setSidebarCollapsed(c => !c)}
            sx={{ p: 0.4, color: theme.palette.text.disabled, flexShrink: 0 }}>
            {sidebarCollapsed
              ? <ChevronRightIcon sx={{ fontSize: 15 }} />
              : <ChevronLeftIcon  sx={{ fontSize: 15 }} />
            }
          </IconButton>
        </Box>

        {/* Session list */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
          {!sidebarCollapsed && (
            sessionsLoading ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={14} sx={{ color: theme.palette.text.disabled }} />
              </Box>
            ) : sessions.length === 0 ? (
              <Typography sx={{ px: 1.5, py: 1.5, fontSize: '0.7rem', color: theme.palette.text.disabled, display: 'block' }}>
                No conversations yet
              </Typography>
            ) : (
              sessions.map(s => (
                <Box key={s.id} onClick={() => openSession(s.id)}
                  sx={{
                    px: 1.25, py: 0.9, mx: 0.5, mb: 0.2,
                    borderRadius: '4px', cursor: 'pointer',
                    backgroundColor: activeSessionId === s.id
                      ? (isDark ? `${amber}12` : `${amber}08`)
                      : 'transparent',
                    border: '1px solid',
                    borderColor: activeSessionId === s.id ? amber + '25' : 'transparent',
                    '&:hover': { backgroundColor: isDark ? '#28261F' : '#E8E4DC' },
                    position: 'relative',
                    '&:hover .del-btn': { opacity: 1 },
                    transition: 'all 0.1s ease',
                  }}
                >
                  <Typography sx={{
                    fontSize: '0.7rem', fontWeight: activeSessionId === s.id ? 600 : 400,
                    color: activeSessionId === s.id ? amber : theme.palette.text.primary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    pr: 2, display: 'block',
                  }}>
                    {s.title || 'Untitled'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.625rem', color: theme.palette.text.disabled, mt: 0.15, fontFamily: '"DM Mono", monospace' }}>
                    {formatTime(s.updated_at)} · {Math.floor(s.message_count / 2)} msg
                  </Typography>
                  <IconButton
                    className="del-btn"
                    size="small"
                    onClick={(e) => handleDelete(e, s.id)}
                    sx={{
                      opacity: 0, position: 'absolute', right: 3, top: '50%',
                      transform: 'translateY(-50%)', p: 0.25,
                      transition: 'opacity 0.12s', color: theme.palette.text.disabled,
                      '&:hover': { color: '#E05252' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))
            )
          )}
        </Box>
      </Box>

      {/* ── Chat panel ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <Box sx={{
          height: 44, px: 2, display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: `1px solid ${borderColor}`, flexShrink: 0,
        }}>
          <AutoAwesomeIcon sx={{ fontSize: 14, color: amber }} />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: theme.palette.text.primary }}>
            Ask AI
          </Typography>
          <Typography sx={{ fontSize: '0.6875rem', color: theme.palette.text.disabled, ml: 'auto',
            fontFamily: '"DM Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>
            {fileName}
          </Typography>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
          {messages.length === 0 ? (
            <Box>
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mb: 2, lineHeight: 1.6 }}>
                Ask anything about this call — transcript, sentiment, summaries, or request a drafted email.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {SUGGESTED.map(q => (
                  <Box key={q} onClick={() => send(q)}
                    sx={{
                      px: 1.5, py: 1, cursor: 'pointer',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '5px',
                      backgroundColor: theme.palette.background.paper,
                      '&:hover': {
                        borderColor: amber + '40',
                        backgroundColor: isDark ? `${amber}06` : `${amber}04`,
                      },
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary }}>
                      {q}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Box sx={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1.5,
                  }}>
                    {m.role === 'user' ? (
                      <Box sx={{
                        maxWidth: '80%', px: 1.75, py: 1.25,
                        borderRadius: '10px 10px 3px 10px',
                        backgroundColor: amber,
                        color: '#0C0B09',
                      }}>
                        <Typography sx={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontWeight: 500 }}>
                          {m.text}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        <Box sx={{
                          px: 1.75, py: 1.25,
                          borderRadius: '10px 10px 10px 3px',
                          border: `1px solid ${borderColor}`,
                          backgroundColor: isDark ? '#1A1915' : '#F4F1EC',
                        }}>
                          <Typography sx={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap', lineHeight: 1.65, color: theme.palette.text.primary }}>
                            {m.text}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
                          <Tooltip title={copied === i ? 'Copied!' : 'Copy'} placement="bottom" arrow>
                            <IconButton size="small" onClick={() => copyText(m.text, i)}
                              sx={{ p: 0.3, opacity: 0.35, '&:hover': { opacity: 1 }, color: theme.palette.text.secondary }}>
                              <ContentCopyIcon sx={{ fontSize: 11 }} />
                            </IconButton>
                          </Tooltip>
                          <AnimatePresence>
                            {copied === i && (
                              <motion.span
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              >
                                <Typography sx={{ fontSize: '0.6rem', color: amber, ml: 0.25 }}>Copied</Typography>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <Box key={i} sx={{
                    width: 5, height: 5, borderRadius: '50%',
                    backgroundColor: amber, opacity: 0.5,
                    animation: 'dotPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                    '@keyframes dotPulse': {
                      '0%, 100%': { opacity: 0.2, transform: 'scale(0.8)' },
                      '50%': { opacity: 1, transform: 'scale(1)' },
                    },
                  }} />
                ))}
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>Thinking…</Typography>
            </Box>
          )}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', px: 2, py: 1.25 }}>
          <TextField
            fullWidth multiline maxRows={4} size="small"
            placeholder="Ask about this call…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            disabled={loading}
            sx={{
              '& .MuiInputBase-input': { fontSize: '0.875rem' },
              '& .MuiOutlinedInput-root': { borderRadius: '5px' },
            }}
          />
          <IconButton
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            sx={{
              width: 36, height: 36, borderRadius: '5px',
              backgroundColor: input.trim() && !loading ? amber : 'transparent',
              border: `1px solid ${input.trim() && !loading ? 'transparent' : borderColor}`,
              color: input.trim() && !loading ? '#0C0B09' : theme.palette.text.disabled,
              flexShrink: 0,
              '&:hover': input.trim() && !loading ? { backgroundColor: theme.palette.primary.light } : {},
              transition: 'all 0.15s ease',
              '&:disabled': { opacity: 0.5 },
            }}
          >
            <SendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}