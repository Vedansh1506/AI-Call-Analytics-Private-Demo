import React, { useState } from 'react';
import {
  TextField, Button, Typography, Box,
  Alert, Link, InputAdornment, IconButton, CircularProgress,
} from '@mui/material';
import {
  Visibility, VisibilityOff,
  Email as EmailIcon, Person as PersonIcon,
  Phone as PhoneIcon, Lock as LockIcon,
} from '@mui/icons-material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';

const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.28, ease: [0.22, 1, 0.36, 1] } }),
};

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
      }}>{ok ? '✓' : '–'}</Typography>
      <Typography sx={{ fontSize: '0.75rem', color: ok ? '#2CB67D' : theme.palette.text.secondary }}>
        {label}
      </Typography>
    </Box>
  );
};

const Register = ({ onLogin, onSwitchToLogin }) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeContext();
  const navigate = useNavigate();

  const amber = theme.palette.primary.main;
  const fieldSx = mkFieldSx();
  const bgColor   = isDark ? '#0C0B09'   : '#F4F1EC';
  const panelBg   = isDark ? '#111009'   : '#FDFCF8';
  const sidePanel = isDark ? '#111009'   : '#F0ECE4';
  const borderColor = isDark ? '#28261F' : '#DDD9D1';

  const [formData, setFormData] = useState({
    firstName:'', lastName:'', email:'', mobileNo:'', password:'', confirmPassword:'',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const passwordChecks = {
    length:  formData.password.length >= 8,
    upper:   /[A-Z]/.test(formData.password),
    lower:   /[a-z]/.test(formData.password),
    number:  /\d/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!isPasswordValid) { setError('Password does not meet all requirements.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/register', {
        first_name: formData.firstName, last_name: formData.lastName,
        email: formData.email, mobile_no: formData.mobileNo, password: formData.password,
      });
      setRegisteredEmail(formData.email);
      setStep('otp');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed. Email might already exist.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpLoading(true); setOtpError('');
    try {
      await api.post('/auth/verify-email', { email: registeredEmail, otp: otp.trim() });
      onLogin(); navigate('/dashboard');
    } catch (err) {
      setOtpError(err?.response?.data?.detail || 'Invalid code. Please try again.');
    } finally { setOtpLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setOtpError('');
    try { await api.post('/auth/resend-verification', { email: registeredEmail }); }
    catch {} finally { setResending(false); }
  };

  // ── OTP step ──
  if (step === 'otp') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bgColor, p: 3 }}>
        <Box sx={{
          width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 },
          backgroundColor: panelBg, border: `1px solid ${borderColor}`,
          borderRadius: '8px',
        }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 48, height: 48, mx: 'auto', mb: 2,
              borderRadius: '10px',
              backgroundColor: amber + '18', border: `1px solid ${amber}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 22, color: amber }} />
            </Box>
            <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.5rem', mb: 0.5 }}>
              Verify your email
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary }}>
              We sent a 6-digit code to <Box component="span" sx={{ color: amber, fontFamily: '"DM Mono", monospace', fontSize: '0.8rem' }}>{registeredEmail}</Box>
            </Typography>
          </Box>

          {otpError && <Alert severity="error" sx={{ mb: 2 }}>{otpError}</Alert>}

          <Box component="form" onSubmit={handleVerifyOtp}>
            <TextField
              fullWidth required margin="normal" label="6-digit verification code"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
              sx={fieldSx}
              inputProps={{ maxLength: 6, style: { letterSpacing: 12, fontSize: 22, fontWeight: 600, textAlign: 'center', fontFamily: '"DM Mono", monospace' } }}
            />
            <Button type="submit" fullWidth variant="contained"
              disabled={otpLoading || otp.length !== 6}
              sx={{ mt: 2.5, py: 1.2, backgroundColor: amber, color: '#0C0B09', fontWeight: 600, '&:hover': { backgroundColor: theme.palette.primary.light }, '&:disabled': { opacity: 0.4 } }}>
              {otpLoading ? <CircularProgress size={18} sx={{ color: '#0C0B09' }} /> : 'Verify & Continue'}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary }}>
                Didn't receive it?
              </Typography>
              <Link component="button" type="button" onClick={handleResend} disabled={resending}
                sx={{ fontSize: '0.8125rem', color: amber, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                {resending ? 'Sending…' : 'Resend code'}
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Registration form ──
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: bgColor }}>
      {/* Left decorative panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, width: '40%',
        flexDirection: 'column', justifyContent: 'space-between',
        p: 5, borderRight: `1px solid ${borderColor}`,
        backgroundColor: sidePanel, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, opacity: isDark ? 0.04 : 0.06,
          backgroundImage: `linear-gradient(${borderColor} 1px, transparent 1px), linear-gradient(90deg, ${borderColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%',
          background: `radial-gradient(circle, ${amber}14 0%, transparent 65%)`, pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, position: 'relative' }}>
          <Box sx={{ width: 28, height: 28, borderRadius: '6px', border: `1.5px solid ${amber}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.6rem', color: amber, fontWeight: 500 }}>AI</Typography>
          </Box>
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.05rem', color: theme.palette.text.primary }}>
            CallAI
          </Typography>
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
            lineHeight: 1.2, mb: 1.5, color: theme.palette.text.primary,
          }}>
            Start understanding<br />
            <Box component="span" sx={{ color: amber, fontStyle: 'italic' }}>your calls.</Box>
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary, lineHeight: 1.7, maxWidth: 280 }}>
            Join thousands of teams using CallAI to extract insights from every conversation.
          </Typography>
        </Box>

        <Box sx={{ pt: 3, borderTop: `1px solid ${borderColor}`, position: 'relative' }}>
          {['Transcript', 'Sentiment', 'Insights'].map((l, i) => (
            <Box key={l} sx={{ display: 'inline-block', mr: 2.5 }}>
              <Typography sx={{ fontFamily: '"DM Mono", monospace', fontSize: '0.65rem', color: amber, fontWeight: 500, mb: 0.2 }}>
                {['Accurate','Analysed','Extracted'][i]}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.disabled }}>{l}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right form panel */}
      <Box sx={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        p: { xs: 3, sm: 5 }, bgcolor: panelBg, position: 'relative', overflowY: 'auto',
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

        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <motion.div custom={0} variants={stagger} initial="hidden" animate="visible">
            <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.8rem', mb: 0.5 }}>
              Create account
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary, mb: 3 }}>
              Join CallAI and start analysing your calls
            </Typography>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: 16 }}>
                <Alert severity="error">{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <motion.div custom={1} variants={stagger} initial="hidden" animate="visible">
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField required fullWidth label="First name" name="firstName"
                  value={formData.firstName} onChange={handleChange} sx={fieldSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment> }}
                />
                <TextField required fullWidth label="Last name" name="lastName"
                  value={formData.lastName} onChange={handleChange} sx={fieldSx}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment> }}
                />
              </Box>
            </motion.div>

            <motion.div custom={2} variants={stagger} initial="hidden" animate="visible">
              <TextField required fullWidth label="Email address" name="email" type="email"
                value={formData.email} onChange={handleChange} sx={fieldSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment> }}
              />
            </motion.div>

            <motion.div custom={3} variants={stagger} initial="hidden" animate="visible">
              <TextField required fullWidth label="Mobile number" name="mobileNo" type="tel"
                value={formData.mobileNo} onChange={handleChange} sx={fieldSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment> }}
              />
            </motion.div>

            <motion.div custom={4} variants={stagger} initial="hidden" animate="visible">
              <TextField required fullWidth label="Password" name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password} onChange={handleChange}
                onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
                sx={fieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPassword(p => !p)} sx={{ color: theme.palette.text.disabled }}>{showPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}</IconButton></InputAdornment>,
                }}
              />
              <AnimatePresence>
                {passwordFocused && formData.password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                    <Box sx={{ mt: 1, pl: 0.5 }}>
                      <PasswordCheck ok={passwordChecks.length}  label="8 characters minimum" />
                      <PasswordCheck ok={passwordChecks.upper}   label="One uppercase letter" />
                      <PasswordCheck ok={passwordChecks.lower}   label="One lowercase letter" />
                      <PasswordCheck ok={passwordChecks.number}  label="One number" />
                      <PasswordCheck ok={passwordChecks.special} label="One special character" />
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div custom={5} variants={stagger} initial="hidden" animate="visible">
              <TextField required fullWidth label="Confirm password" name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword} onChange={handleChange} sx={fieldSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 16, color: theme.palette.text.disabled }} /></InputAdornment> }}
              />
              {formData.confirmPassword.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, pl: 0.5 }}>
                  <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, color: passwordsMatch ? '#2CB67D' : '#E05252' }}>
                    {passwordsMatch ? '✓' : '✕'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: passwordsMatch ? '#2CB67D' : '#E05252', fontWeight: 600 }}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </Typography>
                </Box>
              )}
            </motion.div>

            <motion.div custom={6} variants={stagger} initial="hidden" animate="visible">
              <Button type="submit" fullWidth variant="contained"
                disabled={loading || !isPasswordValid || formData.password !== formData.confirmPassword}
                sx={{ py: 1.2, backgroundColor: amber, color: '#0C0B09', fontWeight: 600,
                  '&:hover': { backgroundColor: theme.palette.primary.light }, '&:disabled': { opacity: 0.35 } }}>
                {loading ? <CircularProgress size={18} sx={{ color: '#0C0B09' }} /> : 'Create account'}
              </Button>
            </motion.div>

            <motion.div custom={7} variants={stagger} initial="hidden" animate="visible">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: borderColor }} />
                <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled }}>or</Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: borderColor }} />
              </Box>
            </motion.div>

            <motion.div custom={8} variants={stagger} initial="hidden" animate="visible">
              <Button fullWidth variant="outlined"
                onClick={() => { window.location.href = 'http://localhost:8000/auth/google'; }}
                sx={{ py: 1.1, borderColor: borderColor, color: theme.palette.text.secondary, gap: 1.25, borderWidth: '1.5px',
                  '&:hover': { borderColor: amber + '60', color: theme.palette.text.primary } }}>
                <Box component="img" src="https://www.google.com/favicon.ico" alt="Google" sx={{ width: 16, height: 16 }} />
                Sign up with Google
              </Button>
            </motion.div>

            <motion.div custom={9} variants={stagger} initial="hidden" animate="visible">
              <Typography sx={{ textAlign: 'center', fontSize: '0.8125rem', color: theme.palette.text.secondary }}>
                Already have an account?{' '}
                <Link component="button" type="button" onClick={onSwitchToLogin}
                  sx={{ color: amber, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Sign in
                </Link>
              </Typography>
            </motion.div>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;