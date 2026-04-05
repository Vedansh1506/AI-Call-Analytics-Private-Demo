import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper,
  CircularProgress, Fade, Divider, Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTheme } from '@mui/material/styles';
import {
  sendChatMessage,
  getChatSessions,
  getChatSession,
  deleteChatSession,
} from '../services/api';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const SUGGESTED = [
  "What was the main issue discussed?",
  "What is the overall sentiment of this call?",
  "What could the agent have done better?",
  "Draft a follow-up email for this call",
  "Summarise this call in 3 bullet points",
];

const formatTime = (iso) => {
  if (!iso) return '';
  // parse as UTC explicitly by appending Z if missing
  const str = iso.endsWith('Z') ? iso : iso + 'Z';
  const d = new Date(str);
  const now = new Date();
  const diffMs = now - d;
  const diffM = diffMs / 60000;
  if (diffM < 1) return 'just now';
  if (diffM < 60) return `${Math.floor(diffM)}m ago`;
  const diffH = diffMs / 3600000;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return 'yesterday';
  return d.toLocaleDateString();
};

export default function AskAI({ assetId, fileName }) {
  const theme = useTheme();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // sessions sidebar
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessLoading] = useState(true);

  // active conversation
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);

  // input
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const bottomRef = useRef(null);

  // ── load session list on mount ──
  const loadSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const data = await getChatSessions(assetId);
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setSessLoading(false);
    }
  }, [assetId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── scroll to bottom on new messages ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── load a past session ──
  const openSession = async (sessionId) => {
    if (loading) return;
    try {
      const data = await getChatSession(sessionId);
      setActiveSessionId(data.id);
      setMessages(
        (data.messages || []).map((m) => ({ role: m.role, text: m.text }))
      );
    } catch {
      // silently fail
    }
  };

  // ── start a fresh conversation ──
  const newConversation = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
  };

  // ── delete a session ──
  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) newConversation();
    } catch {
      // silently fail
    }
  };

  // ── send a message ──
  const send = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { reply, session_id } = await sendChatMessage(
        assetId,
        text,
        activeSessionId
      );

      setMessages((prev) => [...prev, { role: 'model', text: reply }]);

      // if this was a new session, update sidebar + set active
      if (!activeSessionId) {
        setActiveSessionId(session_id);
        await loadSessions();
      } else {
        // refresh updated_at in sidebar
        setSessions((prev) =>
          prev.map((s) =>
            s.id === session_id
              ? { ...s, message_count: s.message_count + 2, updated_at: new Date().toISOString() }
              : s
          )
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── copy message text ──
  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: sidebarCollapsed ? '40px 1fr' : '200px 1fr',
        transition: 'grid-template-columns 0.2s ease',
        gap: 0,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden',
        minHeight: 480,
      }}
    >
      {/* ── SIDEBAR ── */}
      <Box
        sx={{
          borderRight: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        {/* new conversation button */}
        <Box sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 0.5 }}>
          {!sidebarCollapsed && (
            <Paper
              variant="outlined"
              onClick={newConversation}
              sx={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.5, py: 0.8, cursor: 'pointer', borderRadius: 1.5,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <AddIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">New chat</Typography>
            </Paper>
          )}
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(c => !c)}
            sx={{ p: 0.5, color: 'text.secondary' }}
          >
            {sidebarCollapsed
              ? <ChevronRightIcon fontSize="small" />
              : <ChevronLeftIcon fontSize="small" />
            }
          </IconButton>
        </Box>

        {/* session list */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
          {!sidebarCollapsed && (
            sessionsLoading ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={16} />
              </Box>
            ) : sessions.length === 0 ? (
              <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1.5, display: 'block' }}>
                No past conversations
              </Typography>
            ) : (
              sessions.map((s) => (
                <Box
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  sx={{
                    px: 1.5, py: 1, cursor: 'pointer', mx: 0.5, borderRadius: 1,
                    bgcolor: activeSessionId === s.id ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex', flexDirection: 'column', gap: 0.3,
                    position: 'relative',
                    '&:hover .del-btn': { opacity: 1 },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: activeSessionId === s.id ? 600 : 400,
                      color: activeSessionId === s.id ? 'primary.main' : 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      pr: 2,
                      fontSize: '0.72rem',
                    }}
                  >
                    {s.title || 'Untitled'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
                    {formatTime(s.updated_at)} · {s.message_count / 2 | 0} msg{s.message_count / 2 !== 1 ? 's' : ''}
                  </Typography>
                  <IconButton
                    className="del-btn"
                    size="small"
                    onClick={(e) => handleDelete(e, s.id)}
                    sx={{
                      opacity: 0, position: 'absolute', right: 2, top: '50%',
                      transform: 'translateY(-50%)', p: 0.3,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              ))
            )
          )}
        </Box>
      </Box>

      {/* ── CHAT PANEL ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480 }}>

        {/* header */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={500}>Ask AI</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.7rem' }}>
            {fileName}
          </Typography>
        </Box>

        {/* messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
          {messages.length === 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.82rem' }}>
                Ask anything about this call — transcript, sentiment, summary, or request a draft email.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {SUGGESTED.map((q) => (
                  <Paper
                    key={q}
                    variant="outlined"
                    onClick={() => send(q)}
                    sx={{
                      p: 1.2, cursor: 'pointer', borderRadius: 2,
                      '&:hover': { bgcolor: 'action.hover' },
                      transition: 'background 0.15s',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {q}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          ) : (
            messages.map((m, i) => (
              <Fade in key={i}>
                <Box
  sx={{
    display: 'flex',
    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
    mb: 1.5,
  }}
>
  {m.role === 'user' ? (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        maxWidth: '82%',
        borderRadius: '14px 14px 4px 14px',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.82rem' }}>
        {m.text}
      </Typography>
    </Paper>
  ) : (
    <Box sx={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 0.3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: '14px 14px 14px 4px',
          bgcolor: 'action.hover',
          color: 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.82rem' }}>
          {m.text}
        </Typography>
      </Paper>
      <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
        <Tooltip title={copied === i ? 'Copied!' : 'Copy'} placement="bottom">
          <IconButton
            size="small"
            onClick={() => copyText(m.text, i)}
            sx={{ p: 0.3, opacity: 0.4, '&:hover': { opacity: 1 } }}
          >
            <ContentCopyIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
        {copied === i && (
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', ml: 0.3 }}>
            Copied
          </Typography>
        )}
      </Box>
    </Box>
  )}
</Box>
              </Fade>
            ))
          )}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <CircularProgress size={12} />
              <Typography variant="caption" color="text.secondary">Thinking…</Typography>
            </Box>
          )}
          <div ref={bottomRef} />
        </Box>

        <Divider />

        {/* input */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', px: 2, py: 1.5 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ask about this call…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            disabled={loading}
          />
          <IconButton
            color="primary"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}