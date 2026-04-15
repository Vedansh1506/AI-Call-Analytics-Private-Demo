import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, IconButton, Link,
} from '@mui/material';
import {
  Email as EmailIcon, Lock as LockIcon,
  Visibility, VisibilityOff, ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useThemeContext } from '../context/ThemeContext';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import OtpInput from './OtpInput';
import { useTheme } from '@mui/material/styles';

const mkFieldSx = () => ({
  '& .MuiOutlinedInput-root': { borderRadius: '5px' },
  '& .MuiInputBase-input': { fontSize: '0.875rem' },
});

const PasswordCheck = ({ ok, label }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.1 }}>
      <Typography component="span" sx={{
        fontSize: '0.7rem', fontWeight: 700, width: 12, textAlign: 'center',
        color: ok ? '#2CB67D' : theme.palette.text.disabled,
      }}>
        {ok ? '✓' : '–'}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: ok ? '#2CB67D' : theme.palette.text.secondary }}>
        {label}
      </Typography>
    </Box>
  );
};

const ForgotPassword = ({ onBack }) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeContext();
  const amber = theme.palette.primary.main;
  const fieldSx = mkFieldSx();

  const bgColor     = isDark ? '#0C0B09' : '#F4F1EC';
  const panelBg     = isDark ? '#111009' : '#FDFCF8';
  const borderColor = isDark ? '#28261F' : '#DDD9D1';

  const [email,       setEmail]       = useState('');
  const [otpSent,     setOtpSent]     = useState(false);
  const [otp,         setOtp]         = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const [error,       setError]       = useState('');
  const [done,        setDone]        = useState(false);

  const passwordChecks = {
    length:  newPassword.length >= 8,
    upper:   /[A-Z]/.test(newPassword),
    lower:   /[a-z]/.test(newPassword),
    number:  /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const isPwValid      = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = confirmPass.length > 0 && newPassword === confirmPass;

  useEffect(() => {
    if (otp.length === 6 && !otpVerified) { setOtpVerified(true); setError(''); }
  }, [otp, otpVerified]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setOtpSent(true);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setOtp(''); setOtpVerified(false); setError('');
    try { await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() }); }
    catch {} finally { setResending(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!isPwValid || !passwordsMatch) return;
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPassword,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid code. Please try again.');
      setOtp(''); setOtpVerified(false);
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      bgcolor: bgColor, p: { xs: 2, sm: 3 }, position: 'relative',
    }}>
      {/* Theme toggle */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Tooltip title={isDark ? 'Light mode' : 'Dark mode'} arrow>
          <IconButton onClick={toggleTheme} size="small" sx={{
            width: 32, height: 32, borderRadius: '5px',
            border: `1px solid ${borderColor}`, color: theme.palette.text.disabled,
            '&:hover': { color: theme.palette.text.primary },
          }}>
            {isDark ? <Brightness7 sx={{ fontSize: 15 }} /> : <Brightness4 sx={{ fontSize: 15 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        <Box sx={{
          backgroundColor: panelBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          p: { xs: 3, sm: 4 },
        }}>
          {/* ── Success state ── */}
          {done ? (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{
                width: 52, height: 52, mx: 'auto', mb: 2.5,
                borderRadius: '10px',
                backgroundColor: '#2CB67D18', border: '1px solid #2CB67D30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{ color: '#2CB67D', fontSize: 22, fontWeight: 700 }}>✓</Typography>
              </Box>
              <Typography sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: '1.4rem', mb: 0.75,
              }}>
                Password updated
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mb: 3 }}>
                You can now sign in with your new password.
              </Typography>
              <Button fullWidth variant="contained" onClick={onBack}
                sx={{ py: 1.2, backgroundColor: amber, color: '#0C0B09', fontWeight: 600,
                  '&:hover': { backgroundColor: theme.palette.primary.light } }}>
                Back to sign in
              </Button>
            </Box>
          ) : (
            <>
              {/* Header */}
              <Box sx={{ mb: 3 }}>
                <Typography sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: '1.5rem', mb: 0.5, color: theme.palette.text.primary,
                }}>
                  {!otpSent ? 'Reset password' : 'Check your email'}
                </Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary }}>
                  {!otpSent
                    ? "Enter your email and we'll send a verification code."
                    : `We sent a 6-digit code to `
                  }
                  {otpSent && (
                    <Box component="span" sx={{
                      color: amber, fontFamily: '"DM Mono", monospace', fontSize: '0.75rem',
                    }}>
                      {email}
                    </Box>
                  )}
                </Typography>
              </Box>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} style={{ marginBottom: 16 }}>
                    <Alert severity="error">{error}</Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Step 1: email ── */}
              {!otpSent && (
                <Box component="form" onSubmit={handleSendOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth required label="Email address" type="email"
                    value={email} onChange={e => setEmail(e.target.value)} sx={fieldSx}
                    InputProps={{ startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} />
                      </InputAdornment>
                    )}}
                  />
                  <Button type="submit" fullWidth variant="contained"
                    disabled={loading || !email.trim()}
                    sx={{ py: 1.2, backgroundColor: amber, color: '#0C0B09', fontWeight: 600,
                      '&:hover': { backgroundColor: theme.palette.primary.light }, '&:disabled': { opacity: 0.4 } }}>
                    {loading ? <CircularProgress size={18} sx={{ color: '#0C0B09' }} /> : 'Send verification code'}
                  </Button>
                  <Box sx={{ textAlign: 'center' }}>
                    <Link component="button" type="button" onClick={onBack}
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                        fontSize: '0.8125rem', color: theme.palette.text.secondary,
                        textDecoration: 'none', '&:hover': { color: amber } }}>
                      <ArrowBackIcon sx={{ fontSize: 14 }} /> Back to sign in
                    </Link>
                  </Box>
                </Box>
              )}

              {/* ── Step 2: OTP + new password ── */}
              {otpSent && (
                <Box component="form" onSubmit={handleReset} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* OTP */}
                  <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link component="button" type="button" onClick={handleResend} disabled={resending}
                      sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, textDecoration: 'none',
                        fontWeight: 500, '&:hover': { color: amber } }}>
                      {resending ? 'Sending…' : 'Resend code'}
                    </Link>
                  </Box>

                  {/* New password fields — appear after OTP filled */}
                  <AnimatePresence>
                    {otpVerified && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.22 }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                          <TextField
                            fullWidth label="New password"
                            type={showPass ? 'text' : 'password'}
                            value={newPassword} onChange={e => setNewPassword(e.target.value)} sx={fieldSx}
                            InputProps={{
                              startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment>,
                              endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPass(p => !p)} sx={{ color: theme.palette.text.disabled }}>{showPass ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}</IconButton></InputAdornment>,
                            }}
                          />

                          {newPassword.length > 0 && (
                            <Box sx={{ pl: 0.5 }}>
                              <PasswordCheck ok={passwordChecks.length}  label="8 characters minimum" />
                              <PasswordCheck ok={passwordChecks.upper}   label="One uppercase letter" />
                              <PasswordCheck ok={passwordChecks.lower}   label="One lowercase letter" />
                              <PasswordCheck ok={passwordChecks.number}  label="One number" />
                              <PasswordCheck ok={passwordChecks.special} label="One special character" />
                            </Box>
                          )}

                          <TextField
                            fullWidth label="Confirm new password"
                            type={showPass ? 'text' : 'password'}
                            value={confirmPass} onChange={e => setConfirmPass(e.target.value)} sx={fieldSx}
                            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment> }}
                          />

                          {confirmPass.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pl: 0.5 }}>
                              <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, color: passwordsMatch ? '#2CB67D' : '#E05252' }}>
                                {passwordsMatch ? '✓' : '✕'}
                              </Typography>
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: passwordsMatch ? '#2CB67D' : '#E05252' }}>
                                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                              </Typography>
                            </Box>
                          )}

                          <Button type="submit" fullWidth variant="contained"
                            disabled={loading || !isPwValid || !passwordsMatch}
                            sx={{ py: 1.2, backgroundColor: amber, color: '#0C0B09', fontWeight: 600,
                              '&:hover': { backgroundColor: theme.palette.primary.light }, '&:disabled': { opacity: 0.4 } }}>
                            {loading ? <CircularProgress size={18} sx={{ color: '#0C0B09' }} /> : 'Set new password'}
                          </Button>
                        </Box>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Box sx={{ textAlign: 'center' }}>
                    <Link component="button" type="button" onClick={onBack}
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4,
                        fontSize: '0.8125rem', color: theme.palette.text.secondary,
                        textDecoration: 'none', '&:hover': { color: amber } }}>
                      <ArrowBackIcon sx={{ fontSize: 14 }} /> Back to sign in
                    </Link>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      </motion.div>
    </Box>
  );
};

export default ForgotPassword;