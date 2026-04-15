import React, { useState } from 'react';
import {
  TextField, Button, Typography, Box,
  Alert, Link, InputAdornment, IconButton, CircularProgress,
} from '@mui/material';
import {
  Visibility, VisibilityOff,
  Email as EmailIcon, Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';
import Tooltip from '@mui/material/Tooltip';
import ForgotPassword from './ForgotPassword';
import { useTheme } from '@mui/material/styles';

// Shared field style
const mkFieldSx = (theme) => ({
  '& .MuiOutlinedInput-root': { borderRadius: '5px' },
  '& .MuiInputLabel-root': { fontSize: '0.875rem', color: theme.palette.text.secondary },
  '& .MuiInputBase-input': { fontSize: '0.9rem', color: theme.palette.text.primary },
});

const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.3, ease: [0.22, 1, 0.36, 1] } }),
};

const Login = ({ onLogin, onSwitchToRegister }) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeContext();
  const navigate = useNavigate();

  const amber = theme.palette.primary.main;
  const fieldSx = mkFieldSx(theme);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const form = new URLSearchParams();
      form.append('username', formData.email);
      form.append('password', formData.password);
      const response = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
      });
      if (response.data.success) { onLogin(); navigate('/dashboard'); }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  const bgColor = isDark ? '#0C0B09' : '#F4F1EC';
  const panelBg = isDark ? '#111009' : '#FDFCF8';
  const borderColor = isDark ? '#28261F' : '#DDD9D1';

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      bgcolor: bgColor,
    }}>
      {/* ── Left: decorative panel ── */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        width: '44%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 5,
        borderRight: `1px solid ${borderColor}`,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: isDark ? '#111009' : '#F0ECE4',
      }}>
        {/* Subtle grid pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: isDark ? 0.04 : 0.06,
          backgroundImage: `
            linear-gradient(${borderColor} 1px, transparent 1px),
            linear-gradient(90deg, ${borderColor} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        {/* Amber glow */}
        <Box sx={{
          position: 'absolute',
          bottom: -120, left: -80,
          width: 400, height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${amber}18 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: '6px',
            border: `1.5px solid ${amber}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box component="span" sx={{
              fontFamily: '"DM Mono", monospace',
              fontSize: '0.65rem', color: amber, fontWeight: 500,
            }}>AI</Box>
          </Box>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '1.1rem', color: theme.palette.text.primary,
          }}>CallAI</Typography>
        </Box>

        {/* Headline */}
        <Box sx={{ position: 'relative' }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
            fontWeight: 400,
            color: theme.palette.text.primary,
            lineHeight: 1.15,
            mb: 2,
          }}>
            Every call,<br />
            <Box component="span" sx={{ color: amber, fontStyle: 'italic' }}>understood.</Box>
          </Typography>
          <Typography sx={{
            fontSize: '0.875rem',
            color: theme.palette.text.secondary,
            lineHeight: 1.7,
            maxWidth: 320,
          }}>
            AI-powered analysis that turns your call recordings into actionable insights — sentiment, summaries, tasks, and more.
          </Typography>
        </Box>

        {/* Bottom stats strip */}
        <Box sx={{
          display: 'flex', gap: 3,
          pt: 3, borderTop: `1px solid ${borderColor}`,
          position: 'relative',
        }}>
          {[['Transcript', 'Accurate'], ['Sentiment', 'Analysed'], ['Insights', 'Extracted']].map(([label, val]) => (
            <Box key={label}>
              <Typography sx={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '0.7rem', color: amber, fontWeight: 500, mb: 0.25,
              }}>{val}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Right: form panel ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 5 },
        position: 'relative',
        bgcolor: panelBg,
      }}>
        {/* Theme toggle */}
        <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
          <Tooltip title={isDark ? 'Light mode' : 'Dark mode'} arrow>
            <IconButton onClick={toggleTheme} size="small" sx={{
              width: 32, height: 32, borderRadius: '5px',
              border: `1px solid ${borderColor}`,
              color: theme.palette.text.disabled,
              '&:hover': { color: theme.palette.text.primary },
            }}>
              {isDark ? <Brightness7 sx={{ fontSize: 15 }} /> : <Brightness4 sx={{ fontSize: 15 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* Header */}
          <motion.div custom={0} variants={stagger} initial="hidden" animate="visible">
            <Typography sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '1.9rem',
              color: theme.palette.text.primary,
              mb: 0.5,
              lineHeight: 1.2,
            }}>
              Welcome back
            </Typography>
            <Typography sx={{
              fontSize: '0.875rem',
              color: theme.palette.text.secondary,
              mb: 3.5,
            }}>
              Sign in to your CallAI account
            </Typography>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} style={{ marginBottom: 16 }}
              >
                <Alert severity="error">{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <motion.div custom={1} variants={stagger} initial="hidden" animate="visible">
              <TextField
                required fullWidth label="Email address" name="email"
                type="email" autoComplete="email" autoFocus
                value={formData.email} onChange={handleChange}
                sx={fieldSx}
                InputProps={{ startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />
                  </InputAdornment>
                )}}
              />
            </motion.div>

            <motion.div custom={2} variants={stagger} initial="hidden" animate="visible">
              <TextField
                required fullWidth label="Password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password} onChange={handleChange}
                sx={fieldSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(p => !p)}
                        sx={{ color: theme.palette.text.disabled }}>
                        {showPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </motion.div>

            {/* Forgot password */}
            <motion.div custom={3} variants={stagger} initial="hidden" animate="visible">
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
                <Link component="button" type="button" variant="caption"
                  onClick={() => setShowForgotPassword(true)}
                  sx={{ color: amber, textDecoration: 'none', fontWeight: 500,
                    '&:hover': { textDecoration: 'underline' } }}>
                  Forgot password?
                </Link>
              </Box>
            </motion.div>

            {/* Sign in button */}
            <motion.div custom={4} variants={stagger} initial="hidden" animate="visible">
              <Button type="submit" fullWidth variant="contained" disabled={loading}
                sx={{
                  py: 1.25, mt: 0.5,
                  backgroundColor: amber,
                  color: '#0C0B09',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: theme.palette.primary.light },
                  '&:disabled': { opacity: 0.5 },
                }}>
                {loading
                  ? <CircularProgress size={18} sx={{ color: '#0C0B09' }} />
                  : 'Sign in'
                }
              </Button>
            </motion.div>

            {/* Divider */}
            <motion.div custom={5} variants={stagger} initial="hidden" animate="visible">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: borderColor }} />
                <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>or</Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: borderColor }} />
              </Box>
            </motion.div>

            {/* Google */}
            <motion.div custom={6} variants={stagger} initial="hidden" animate="visible">
              <Button fullWidth variant="outlined"
                onClick={() => { window.location.href = 'http://localhost:8000/auth/google'; }}
                sx={{
                  py: 1.1, borderColor: borderColor,
                  color: theme.palette.text.secondary,
                  gap: 1.25, borderWidth: '1.5px',
                  '&:hover': { borderColor: amber + '60', color: theme.palette.text.primary },
                }}>
                <Box component="img"
                  src="https://www.google.com/favicon.ico" alt="Google"
                  sx={{ width: 16, height: 16 }} />
                Continue with Google
              </Button>
            </motion.div>

            {/* Sign up link */}
            <motion.div custom={7} variants={stagger} initial="hidden" animate="visible">
              <Typography sx={{
                textAlign: 'center', fontSize: '0.8125rem',
                color: theme.palette.text.secondary,
              }}>
                Don't have an account?{' '}
                <Link component="button" type="button"
                  onClick={onSwitchToRegister}
                  sx={{ color: amber, fontWeight: 600, textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' } }}>
                  Create one
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;