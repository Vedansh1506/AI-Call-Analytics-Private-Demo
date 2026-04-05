import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, IconButton,
  Link, Paper, Container,
} from '@mui/material';
import {
  Email as EmailIcon, Lock as LockIcon,
  Visibility, VisibilityOff,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useThemeContext } from '../context/ThemeContext';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import OtpInput from './OtpInput';

const fieldSx = {
  "& .MuiInputLabel-root": { color: "text.primary" },
  "& .MuiInputBase-input": { color: "text.primary" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
};

const ForgotPassword = ({ onBack }) => {
  const { isDark, toggleTheme } = useThemeContext();

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
  const isPwValid    = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = confirmPass.length > 0 && newPassword === confirmPass;

  // auto-verify OTP once all 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !otpVerified) {
      setOtpVerified(true);
      setError('');
    }
  }, [otp, otpVerified]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setOtpSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setOtp('');
    setOtpVerified(false);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
    } catch {}
    finally { setResending(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!isPwValid || !passwordsMatch) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        email:        email.trim().toLowerCase(),
        otp:          otp.trim(),
        new_password: newPassword,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid code. Please try again.');
      setOtp('');
      setOtpVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const paperSx = {
    p: { xs: 3, sm: 4 }, borderRadius: 3,
    maxWidth: 460, mx: 'auto',
    background: (t) => t.palette.mode === 'dark'
      ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(18px)',
    border: '1px solid rgba(148,163,184,0.3)',
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', p: { xs: 2, sm: 3 },
      background: (t) => t.palette.mode === 'dark'
        ? 'linear-gradient(135deg,#020617,#0f172a)'
        : 'linear-gradient(135deg,#e5e7eb,#f9fafb)',
      position: 'relative',
    }}>

      {/* theme toggle */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1200 }}>
        <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
          <IconButton
            onClick={toggleTheme}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {isDark
              ? <Brightness7 sx={{ fontSize: 18 }} />
              : <Brightness4 sx={{ fontSize: 18 }} />
            }
          </IconButton>
        </Tooltip>
      </Box>

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, px: { xs: 0, sm: 2 } }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Paper elevation={0} sx={paperSx}>

            {/* ── Success state ── */}
            {done ? (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{
                  width: 64, height: 64, borderRadius: '50%',
                  bgcolor: 'success.main', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 2.5,
                }}>
                  <Typography sx={{ color: '#fff', fontSize: 30 }}>✓</Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                  Password updated
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  You can now sign in with your new password.
                </Typography>
                <Button variant="contained" fullWidth size="large" onClick={onBack} sx={{ py: 1.4 }}>
                  Back to sign in
                </Button>
              </Box>
            ) : (
              <>
                {/* header */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                    {!otpSent ? 'Forgot your password?' : 'Check your email'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {!otpSent
                      ? "Enter your email and we'll send you a verification code."
                      : `We sent a 6-digit code to ${email}. Enter it below.`
                    }
                  </Typography>
                </Box>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Step 1: email form ── */}
                {!otpSent && (
                  <Box component="form" onSubmit={handleSendOtp}>
                    <TextField
                      fullWidth required margin="normal"
                      label="Email address" type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      sx={fieldSx}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      type="submit" fullWidth variant="contained" size="large"
                      disabled={loading || !email.trim()}
                      sx={{ mt: 2.5, mb: 2, py: 1.4 }}
                    >
                      {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send verification code'}
                    </Button>
                    <Box sx={{ textAlign: 'center' }}>
                      <Link
                        component="button" type="button" variant="body2"
                        onClick={onBack}
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 500, textDecoration: 'none', color: 'text.secondary' }}
                      >
                        <ArrowBackIcon sx={{ fontSize: 15 }} /> Back to sign in
                      </Link>
                    </Box>
                  </Box>
                )}

                {/* ── Step 2: OTP + new password ── */}
                {otpSent && (
                  <Box component="form" onSubmit={handleReset}>

                    {/* OTP boxes */}
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, mb: 2 }}>
                      <Link
                        component="button" type="button" variant="caption"
                        onClick={handleResend} disabled={resending}
                        sx={{ fontWeight: 500, textDecoration: 'none', color: 'text.secondary' }}
                      >
                        {resending ? 'Sending...' : 'Resend code'}
                      </Link>
                    </Box>

                    {/* New password — appears once OTP is filled */}
                    <AnimatePresence>
                      {otpVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.25 }}
                        >
                          <TextField
                            fullWidth margin="normal"
                            label="New password"
                            type={showPass ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            sx={fieldSx}
                            InputProps={{
                              startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton size="small" onClick={() => setShowPass(s => !s)} sx={{ color: 'text.secondary' }}>
                                    {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                          />

                          {newPassword.length > 0 && (
                            <Box sx={{ px: 0.5, mb: 1 }}>
                              {[
                                ['8 characters minimum', passwordChecks.length],
                                ['One uppercase letter',  passwordChecks.upper],
                                ['One lowercase letter',  passwordChecks.lower],
                                ['One number',            passwordChecks.number],
                                ['One special character', passwordChecks.special],
                              ].map(([label, ok]) => (
                                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.1 }}>
                                  <Typography component="span" sx={{ color: ok ? 'success.main' : 'text.disabled', fontWeight: 700, fontSize: 13, width: 14, textAlign: 'center' }}>
                                    {ok ? '✓' : '–'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: ok ? 'success.main' : 'text.secondary' }}>
                                    {label}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}

                          <TextField
                            fullWidth margin="normal"
                            label="Confirm new password"
                            type={showPass ? 'text' : 'password'}
                            value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)}
                            sx={fieldSx}
                            InputProps={{
                              startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                            }}
                          />

                          {confirmPass.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, px: 0.5 }}>
                              <Typography component="span" sx={{ color: passwordsMatch ? 'success.main' : 'error.main', fontWeight: 700, fontSize: 13, width: 14, textAlign: 'center' }}>
                                {passwordsMatch ? '✓' : '✕'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: passwordsMatch ? 'success.main' : 'error.main', fontWeight: 600 }}>
                                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                              </Typography>
                            </Box>
                          )}

                          <Button
                            type="submit" fullWidth variant="contained" size="large"
                            disabled={loading || !isPwValid || !passwordsMatch}
                            sx={{ mt: 1.5, py: 1.4 }}
                          >
                            {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Set new password'}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Link
                        component="button" type="button" variant="body2"
                        onClick={onBack}
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 500, textDecoration: 'none', color: 'text.secondary' }}
                      >
                        <ArrowBackIcon sx={{ fontSize: 15 }} /> Back to sign in
                      </Link>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ForgotPassword;