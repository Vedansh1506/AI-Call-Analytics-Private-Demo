import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const Register = ({ onLogin, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNo: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useThemeContext();
  
  const [step, setStep]           = useState('form');  // 'form' | 'otp'
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp]             = useState('');
  const [otpError, setOtpError]   = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();

  const passwordChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const fieldSx = {
    "& .MuiInputLabel-root": { color: "text.primary" },
    "& .MuiInputBase-input": { color: "text.primary" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
    "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match.');
    setLoading(false);
    return;
  }
  if (!isPasswordValid) {
    setError('Password does not meet all requirements.');
    setLoading(false);
    return;
  }

  try {
    await api.post('/auth/register', {
      first_name: formData.firstName,
      last_name:  formData.lastName,
      email:      formData.email,
      mobile_no:  formData.mobileNo,
      password:   formData.password,
    });
    setRegisteredEmail(formData.email);
    setStep('otp');
  } catch (err) {
    setError(err?.response?.data?.detail || 'Registration failed. Email might already exist.');
  } finally {
    setLoading(false);
  }
};

  const handleVerifyOtp = async (e) => {
  e.preventDefault();
  setOtpLoading(true);
  setOtpError('');
  try {
    await api.post('/auth/verify-email', {
      email: registeredEmail,
      otp:   otp.trim(),
    });
    onLogin();
    navigate('/dashboard');
  } catch (err) {
    setOtpError(err?.response?.data?.detail || 'Invalid OTP. Please try again.');
  } finally {
    setOtpLoading(false);
  }
};

const handleResend = async () => {
  setResending(true);
  setOtpError('');
  try {
    await api.post('/auth/resend-verification', { email: registeredEmail });
  } catch {}
  finally { setResending(false); }
};

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  // ── OTP verification screen ──────────────────────────────────────────
  if (step === 'otp') {
    return (
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', p: { xs: 2, sm: 3 },
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg,#020617,#020617)'
          : 'linear-gradient(135deg,#e5e7eb,#f9fafb)',
        position: 'relative',
      }}>
        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, px: { xs: 0, sm: 2 } }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Paper elevation={0} sx={{
              p: { xs: 3, sm: 4 }, borderRadius: 3, maxWidth: 480, mx: 'auto',
              background: (t) => t.palette.mode === 'dark'
                ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(148,163,184,0.35)',
            }}>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                  Verify your email
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We sent a 6-digit code to <strong>{registeredEmail}</strong>
                </Typography>
              </Box>

              {otpError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{otpError}</Alert>
              )}

              <Box component="form" onSubmit={handleVerifyOtp}>
                <TextField
                  fullWidth required margin="normal"
                  label="Enter 6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{
                    maxLength: 6,
                    style: { letterSpacing: 10, fontSize: 26, fontWeight: 700, textAlign: 'center' },
                  }}
                  sx={fieldSx}
                />

                <Button
                  type="submit" fullWidth variant="contained" size="large"
                  disabled={otpLoading || otp.length !== 6}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {otpLoading
                    ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                    : 'Verify & Continue'
                  }
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Didn't receive it?
                  </Typography>
                  <Link
                    component="button" type="button" variant="body2"
                    onClick={handleResend} disabled={resending}
                    sx={{ fontWeight: 600, textDecoration: 'none' }}
                  >
                    {resending ? 'Sending...' : 'Resend code'}
                  </Link>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at top, rgba(148,163,184,0.18) 0, transparent 55%), linear-gradient(135deg, #020617 0%, #020617 60%, #020617 100%)'
            : 'radial-gradient(circle at top, rgba(79,70,229,0.08) 0, transparent 55%), linear-gradient(135deg, #e5e7eb 0%, #f9fafb 40%, #f9fafb 100%)',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      {/* Theme Toggle Button */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1200,
        }}
      >
        <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
                    <IconButton
                      onClick={toggleTheme}
                      size="small"
                      sx={{
                        width: 36, height: 36,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                      }}
                    >
                      {isDark
                        ? <Brightness7 sx={{ fontSize: 18 }} />
                        : <Brightness4 sx={{ fontSize: 18 }} />
                      }
                    </IconButton>
                  </Tooltip>
      </Box>
      


      <Container
        maxWidth="sm"
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 0, sm: 2 },
        }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              maxWidth: 520,
              mx: 'auto',
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.9)'
                  : 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(18px)',
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(148, 163, 184, 0.35)'
                  : 'rgba(148, 163, 184, 0.35)',
            }}
          >
            {/* Logo */}
            <motion.div variants={itemVariants}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>
                    AI
                  </Typography>
                </Box>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                  Create Account
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(241, 245, 249, 0.88)"
                        : "rgba(15, 23, 42, 0.78)",
                    fontWeight: 500,
                  }}
                >
                  Join CallAI and start analyzing your calls
                </Typography>
              </Box>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              </motion.div>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <motion.div variants={itemVariants} style={{ flex: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="firstName"
                    label="First Name"
                    name="firstName"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    sx={fieldSx}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: 'text.primary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </motion.div>
                <motion.div variants={itemVariants} style={{ flex: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    sx={fieldSx}
                    InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'text.primary' }} />
                      </InputAdornment>
                    ),
                  }}
                  />
                </motion.div>
              </Box>

              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: 'text.primary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="mobileNo"
                  label="Mobile Number"
                  name="mobileNo"
                  autoComplete="tel"
                  value={formData.mobileNo}
                  onChange={handleChange}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: 'text.primary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: 'text.primary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "text.primary" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>

              {passwordFocused && (
                <motion.div variants={itemVariants}>
                  <Box sx={{ mt: 0.5, mb: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        display: 'block',
                        mb: 0.5,
                      }}
                    >
                      Must meet all of the following:
                    </Typography>
                    {[
                      ['8 characters minimum', passwordChecks.length],
                      ['One uppercase letter', passwordChecks.upper],
                      ['One lowercase letter', passwordChecks.lower],
                      ['One number', passwordChecks.number],
                      ['One special character (e.g. !@#$%^&*)', passwordChecks.special],
                    ].map(([label, ok]) => (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
                        <Typography
                          component="span"
                          sx={{
                            width: 14,
                            textAlign: 'center',
                            color: ok ? 'success.main' : 'text.secondary',
                            fontSize: 14,
                            lineHeight: 1,
                            fontWeight: 700,
                          }}
                        >
                          {ok ? '✓' : '–'}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: ok ? 'success.main' : 'text.secondary', fontWeight: ok ? 600 : 500 }}
                        >
                          {label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  sx={fieldSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: 'text.primary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ mt: 0.25, mb: 0.5, minHeight: 24 }}>
                  {formData.confirmPassword.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        component="span"
                        sx={{
                          width: 14,
                          textAlign: 'center',
                          color: passwordsMatch ? 'success.main' : 'error.main',
                          fontSize: 14,
                          lineHeight: 1,
                          fontWeight: 700,
                        }}
                      >
                        {passwordsMatch ? '✓' : '✕'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: passwordsMatch ? 'success.main' : 'error.main', fontWeight: 600 }}
                      >
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !isPasswordValid || formData.password !== formData.confirmPassword}
                  sx={{
                    mt: 0,
                    mb: 0.5,
                    py: 1.5,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      transition: 'left 0.5s',
                    },
                    '&:hover::before': {
                      left: '100%',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: '#fff' }} />
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ position: 'relative', my: 2 }}>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', borderTop: '1px solid', borderColor: 'divider' }} />
                  </Box>
                  <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <Typography variant="caption" sx={{ bgcolor: 'background.paper', px: 1.5, color: 'text.secondary' }}>
                      OR
                    </Typography>
                  </Box>
                </Box>
                <Button
                  fullWidth variant="outlined" size="large"
                  onClick={() => { window.location.href = 'http://localhost:8000/auth/google'; }}
                  sx={{
                    py: 1.3, borderColor: 'divider', color: 'text.primary', gap: 1.5,
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Box component="img" src="https://www.google.com/favicon.ico" alt="Google" sx={{ width: 18, height: 18 }} />
                  Sign up with Google
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      mt:1,
                      color: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(241, 245, 249, 0.88)"
                          : "rgba(15, 23, 42, 0.78)",
                    }}
                  >
                    Already have an account?{' '}
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={onSwitchToLogin}
                      sx={{
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Sign In
                    </Link>
                  </Typography>
                </Box>
              </motion.div>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Register;
