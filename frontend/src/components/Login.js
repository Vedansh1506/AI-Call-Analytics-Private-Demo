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
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';
import Tooltip from '@mui/material/Tooltip';
import ForgotPassword from './ForgotPassword';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useThemeContext();
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const navigate = useNavigate();

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

    try {
      const loginData = new URLSearchParams();
      loginData.append('username', formData.email);
      loginData.append('password', formData.password);

      const response = await api.post('/auth/login', loginData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      withCredentials: true,
    });

    if (response.data.success) {
      onLogin();
      navigate('/dashboard');
    }

    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
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

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
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
          right: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

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
                  Welcome Back
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
                  Sign in to continue to CallAI
                </Typography>
              </Box>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Box component="form" onSubmit={handleSubmit}>
              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
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
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
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

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 4,
                    mb: 3,
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
                    'Sign In'
                  )}
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ textAlign: 'right', mt: -2 }}>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => setShowForgotPassword(true)}
                    sx={{ fontWeight: 500, textDecoration: 'none', color: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(241, 245, 249, 0.88)"
                          : "rgba(15, 23, 42, 0.78)",
                      '&:hover': { color: 'primary.main' } }}
                  >
                    Forgot password?
                  </Link>
                </Box>

              </motion.div>
              <motion.div variants={itemVariants}>
                <Box sx={{ position: 'relative', my: 2 }}>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', borderTop: `1px solid`, borderColor: 'divider' }} />
                  </Box>
                  <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <Typography variant="caption" sx={{ bgcolor: 'background.paper', px: 1.5, color: 'text.secondary' }}>
                      OR
                    </Typography>
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => { window.location.href = 'http://localhost:8000/auth/google'; }}
                  sx={{
                    mb: 2, py: 1.3,
                    borderColor: 'divider',
                    color: 'text.primary',
                    gap: 1.5,
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Box component="img"
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    sx={{ width: 18, height: 18 }}
                  />
                  Continue with Google
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(241, 245, 249, 0.88)"
                          : "rgba(15, 23, 42, 0.78)",
                    }}
                  >
                    Don't have an account?{' '}
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={onSwitchToRegister}
                      sx={{
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      Sign Up
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

export default Login;
