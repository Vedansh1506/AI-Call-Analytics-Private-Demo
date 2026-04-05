import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Avatar,
  Alert, CircularProgress, IconButton,
  InputAdornment, useTheme,
} from '@mui/material';
import {
  Edit as EditIcon, Save as SaveIcon, Close as CloseIcon,
  Visibility, VisibilityOff, Lock as LockIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getProfile, updateProfile,
  requestChangePasswordOtp, changePassword,
  deleteAccount,
} from '../services/api';
import OtpInput from './OtpInput';

const fieldSx = {
  "& .MuiInputLabel-root": { color: "text.secondary" },
  "& .MuiInputBase-input": { color: "text.primary" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "primary.main" },
  "& .Mui-disabled .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
  "& .Mui-disabled .MuiInputBase-input": { color: "text.secondary", WebkitTextFillColor: "unset" },
};

const sectionSx = (theme) => ({
  p: 3, borderRadius: 3,
  border: `1px solid ${theme.palette.divider}`,
  bgcolor: 'background.paper',
  mb: 2.5,
});

export default function Profile({ onLogout }) {
  const theme = useTheme();

  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [editData,    setEditData]    = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg,     setSaveMsg]     = useState({ type: '', text: '' });

  // change password
  const [pwOtpSent,   setPwOtpSent]   = useState(false);
  const [pwOtp,       setPwOtp]       = useState('');
  const [pwOtpOk,     setPwOtpOk]     = useState(false);
  const [pwData,      setPwData]      = useState({ current: '', new: '', confirm: '' });
  const [showPw,      setShowPw]      = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);
  const [otpSending,  setOtpSending]  = useState(false);
  const [pwMsg,       setPwMsg]       = useState({ type: '', text: '' });

  // delete
  const [deletePhase,   setDeletePhase]   = useState('idle');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getProfile()
      .then(data => {
        setUser(data);
        setEditData({
          first_name: data.first_name || '',
          last_name:  data.last_name  || '',
          mobile_no:  data.mobile_no  || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // auto-mark OTP verified when all 6 entered
  useEffect(() => {
    if (pwOtp.length === 6) setPwOtpOk(true);
    else setPwOtpOk(false);
  }, [pwOtp]);

  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase()
    : '?';

  const passwordChecks = {
    length:  pwData.new.length >= 8,
    upper:   /[A-Z]/.test(pwData.new),
    lower:   /[a-z]/.test(pwData.new),
    number:  /\d/.test(pwData.new),
    special: /[^A-Za-z0-9]/.test(pwData.new),
  };
  const isPwValid      = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = pwData.confirm.length > 0 && pwData.new === pwData.confirm;

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveMsg({ type: '', text: '' });
    try {
      const res = await updateProfile(editData);
      setUser(prev => ({ ...prev, ...res.user }));
      setSaveMsg({ type: 'success', text: 'Profile updated successfully' });
      setEditing(false);
      setTimeout(() => setSaveMsg({ type: '', text: '' }), 3000);
    } catch (e) {
      setSaveMsg({ type: 'error', text: e.message });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!pwData.current) {
      setPwMsg({ type: 'error', text: 'Enter your current password first' });
      return;
    }
    setOtpSending(true);
    setPwMsg({ type: '', text: '' });
    try {
      await requestChangePasswordOtp();
      setPwOtpSent(true);
      setPwMsg({ type: 'info', text: `Verification code sent to ${user?.email}` });
    } catch (e) {
      setPwMsg({ type: 'error', text: e.message || 'Failed to send OTP' });
    } finally {
      setOtpSending(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwData.new !== pwData.confirm) {
      setPwMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setPwLoading(true);
    setPwMsg({ type: '', text: '' });
    try {
      await changePassword({
        current_password: pwData.current,
        otp:              pwOtp,
        new_password:     pwData.new,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      setPwData({ current: '', new: '', confirm: '' });
      setPwOtp('');
      setPwOtpSent(false);
      setPwOtpOk(false);
      setTimeout(() => setPwMsg({ type: '', text: '' }), 3000);
    } catch (e) {
      setPwMsg({ type: 'error', text: e.message || 'Failed to change password' });
      setPwOtp('');
      setPwOtpOk(false);
    } finally {
      setPwLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      await deleteAccount();
      onLogout();
    } catch {
      setDeleteLoading(false);
      setDeletePhase('idle');
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Profile</Typography>

      {/* ── Avatar card ── */}
      <Box sx={{
        ...sectionSx(theme),
        display: 'flex', alignItems: 'center', gap: 2.5,
      }}>
        <Avatar sx={{
          width: 68, height: 68, fontSize: 24, fontWeight: 700,
          background: 'linear-gradient(135deg,#6366f1,#ec4899)',
          flexShrink: 0,
        }}>
          {initials}
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ lineHeight: 1.3 }}>
            {user?.first_name} {user?.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
        </Box>
      </Box>

      {/* ── Personal information ── */}
      <Box sx={sectionSx(theme)}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h6" fontWeight={600}>Personal information</Typography>
          {!editing
            ? (
              <Button
                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                size="small" variant="outlined"
                onClick={() => { setEditing(true); setSaveMsg({ type: '', text: '' }); }}
              >
                Edit
              </Button>
            )
            : (
              <IconButton size="small" onClick={() => setEditing(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )
          }
        </Box>

        <AnimatePresence>
          {saveMsg.text && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Alert severity={saveMsg.type} sx={{ mb: 2, borderRadius: 2 }}>{saveMsg.text}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Column layout */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="First name" size="small" fullWidth
            value={editing ? editData.first_name : user?.first_name || ''}
            disabled={!editing}
            onChange={e => setEditData(p => ({ ...p, first_name: e.target.value }))}
            sx={fieldSx}
          />
          <TextField
            label="Last name" size="small" fullWidth
            value={editing ? editData.last_name : user?.last_name || ''}
            disabled={!editing}
            onChange={e => setEditData(p => ({ ...p, last_name: e.target.value }))}
            sx={fieldSx}
          />
          <Box>
            <TextField
              label="Email address" size="small" fullWidth
              value={user?.email || ''}
              disabled
              sx={fieldSx}
            />
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', pl: 0.5 }}>
              Email address cannot be changed
            </Typography>
          </Box>
          <TextField
            label="Mobile number" size="small" fullWidth
            value={editing ? editData.mobile_no : user?.mobile_no || ''}
            disabled={!editing}
            placeholder={!editing && !user?.mobile_no ? 'Not provided' : ''}
            onChange={e => setEditData(p => ({ ...p, mobile_no: e.target.value }))}
            sx={fieldSx}
          />
        </Box>

        {editing && (
          <Button
            variant="contained"
            startIcon={saveLoading ? null : <SaveIcon sx={{ fontSize: 16 }} />}
            onClick={handleSave}
            disabled={saveLoading}
            sx={{ mt: 2.5 }}
          >
            {saveLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save changes'}
          </Button>
        )}
      </Box>

      {/* ── Change password ── */}
      <Box sx={sectionSx(theme)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="h6" fontWeight={600}>Change password</Typography>
        </Box>

        <AnimatePresence>
          {pwMsg.text && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Alert severity={pwMsg.type} sx={{ mb: 2, borderRadius: 2 }}>{pwMsg.text}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Current password */}
          <TextField
            label="Current password" size="small" fullWidth
            type={showPw ? 'text' : 'password'}
            value={pwData.current}
            onChange={e => setPwData(p => ({ ...p, current: e.target.value }))}
            sx={fieldSx}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPw(s => !s)} sx={{ color: 'text.secondary' }}>
                    {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Send OTP button */}
          {!pwOtpSent && (
            <Button
              variant="outlined" size="small"
              onClick={handleRequestOtp}
              disabled={!pwData.current || otpSending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {otpSending
                ? <><CircularProgress size={14} sx={{ mr: 1 }} />Sending...</>
                : 'Send verification code'
              }
            </Button>
          )}

          {/* OTP boxes — appear after send */}
          <AnimatePresence>
            {pwOtpSent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Enter the 6-digit code sent to your email
                </Typography>
                <OtpInput value={pwOtp} onChange={setPwOtp} disabled={pwLoading} />
                <Box sx={{ textAlign: 'right', mt: 0.5 }}>
                  <Button
                    size="small" variant="text"
                    onClick={handleRequestOtp}
                    disabled={otpSending}
                    sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 0 }}
                  >
                    {otpSending ? 'Sending...' : 'Resend code'}
                  </Button>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New password fields — appear after OTP filled */}
          <AnimatePresence>
            {pwOtpOk && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="New password" size="small" fullWidth
                    type={showPw ? 'text' : 'password'}
                    value={pwData.new}
                    onChange={e => setPwData(p => ({ ...p, new: e.target.value }))}
                    sx={fieldSx}
                  />

                  {pwData.new.length > 0 && (
                    <Box sx={{ pl: 0.5 }}>
                      {[
                        ['8 characters minimum', passwordChecks.length],
                        ['One uppercase letter',  passwordChecks.upper],
                        ['One lowercase letter',  passwordChecks.lower],
                        ['One number',            passwordChecks.number],
                        ['One special character', passwordChecks.special],
                      ].map(([label, ok]) => (
                        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
                    label="Confirm new password" size="small" fullWidth
                    type={showPw ? 'text' : 'password'}
                    value={pwData.confirm}
                    onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))}
                    sx={fieldSx}
                  />

                  {pwData.confirm.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography component="span" sx={{ color: passwordsMatch ? 'success.main' : 'error.main', fontWeight: 700, fontSize: 13, width: 14, textAlign: 'center' }}>
                        {passwordsMatch ? '✓' : '✕'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: passwordsMatch ? 'success.main' : 'error.main', fontWeight: 600 }}>
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    onClick={handleChangePassword}
                    disabled={pwLoading || !isPwValid || !passwordsMatch}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {pwLoading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Update password'}
                  </Button>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* ── Delete account ── */}
      <Box sx={{
        p: 3, borderRadius: 3,
        border: `1px solid ${theme.palette.error.main}35`,
        bgcolor: theme.palette.mode === 'dark'
          ? 'rgba(239,68,68,0.05)'
          : 'rgba(239,68,68,0.03)',
      }}>
        <Typography variant="h6" fontWeight={600} color="error" sx={{ mb: 0.5 }}>
          Delete account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Once you delete your account, all your data — including call recordings, analyses, and history — will be permanently removed. This action cannot be undone.
        </Typography>

        {deletePhase === 'idle' && (
          <Button
            variant="outlined" color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setDeletePhase('confirm')}
            size="small"
          >
            Delete my account
          </Button>
        )}

        {deletePhase === 'confirm' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              This is permanent. All your data will be deleted immediately.
            </Alert>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Type <Box component="span" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'error.main' }}>"DELETE"</Box> to confirm:
            </Typography>
            <TextField
              size="small"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              sx={{ ...fieldSx, mb: 2, width: 180 }}
              inputProps={{ style: { fontFamily: 'monospace', fontWeight: 600 } }}
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="contained" color="error"
                disabled={deleteConfirm !== 'DELETE' || deleteLoading}
                onClick={handleDelete}
                startIcon={deleteLoading ? null : <DeleteForeverIcon />}
                size="small"
              >
                {deleteLoading
                  ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                  : 'Yes, delete everything'
                }
              </Button>
              <Button
                variant="outlined" size="small"
                onClick={() => { setDeletePhase('idle'); setDeleteConfirm(''); }}
              >
                Cancel
              </Button>
            </Box>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}