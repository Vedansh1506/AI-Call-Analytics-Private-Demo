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
      const response = await api.post('/auth/register', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        mobile_no: formData.mobileNo,
        password: formData.password,
      });

      if (response.data.success) {
        // Auto-login after successful registration
        const loginData = new URLSearchParams();
        loginData.append("username", formData.email);
        loginData.append("password", formData.password);

        const loginResponse = await api.post("/auth/login", loginData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          withCredentials: true,
        });

        if (loginResponse.data.success) {
          onLogin();
          navigate("/dashboard");
        }

      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed. Email might already exist.');
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%)',
        position: 'relative',
        overflow: 'hidden',
        p: 2,
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
        <Tooltip title={isDark ? "Switch to Light" : "Switch to Dark"}>
          <Box
            onClick={toggleTheme}
            sx={{
              width: 64,
              height: 32,
              borderRadius: 20,
              backgroundColor: isDark ? "#0ea5e9" : "#facc15",
              display: "flex",
              alignItems: "center",
              px: 0.5,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: isDark ? "translateX(32px)" : "translateX(0px)",
                transition: "transform 0.3s ease",
              }}
            >
              {isDark ? (
                <Brightness7 sx={{ fontSize: 18, color: "#0ea5e9" }} />
              ) : (
                <Brightness4 sx={{ fontSize: 18, color: "#f59e0b" }} />
              )}
            </Box>
          </Box>
        </Tooltip>
      </Box>
      


      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(30, 41, 59, 0.8)'
                  : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(99, 102, 241, 0.2)'
                  : 'rgba(255, 255, 255, 0.5)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                    'Create Account'
                  )}
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
