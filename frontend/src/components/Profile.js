import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Avatar,
  Alert, CircularProgress, IconButton, InputAdornment, useTheme,
} from '@mui/material';
import {
  Edit as EditIcon, Save as SaveIcon, Close as CloseIcon,
  Visibility, VisibilityOff, Lock as LockIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getProfile, updateProfile,
  requestChangePasswordOtp, changePassword, deleteAccount,
} from '../services/api';
import OtpInput from './OtpInput';

const mkFieldSx = (theme) => ({
  '& .MuiOutlinedInput-root': { borderRadius: '5px' },
  '& .MuiInputLabel-root': { fontSize: '0.875rem', color: theme.palette.text.secondary },
  '& .MuiInputBase-input': { fontSize: '0.875rem', color: theme.palette.text.primary },
  '& .Mui-disabled .MuiInputBase-input': {
    color: theme.palette.text.secondary, WebkitTextFillColor: theme.palette.text.secondary,
  },
});

const PasswordCheck = ({ ok, label }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
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

// ── Section card ──────────────────────────────────────────────────────────
const SectionCard = ({ children }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      p: 3, borderRadius: '8px',
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      mb: 2,
    }}>
      {children}
    </Box>
  );
};

export default function Profile({ onLogout }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const amber = theme.palette.primary.main;
  const fieldSx = mkFieldSx(theme);

  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [editData,    setEditData]    = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg,     setSaveMsg]     = useState({ type: '', text: '' });

  const [pwOtpSent,  setPwOtpSent]  = useState(false);
  const [pwOtp,      setPwOtp]      = useState('');
  const [pwOtpOk,    setPwOtpOk]    = useState(false);
  const [pwData,     setPwData]     = useState({ current: '', new: '', confirm: '' });
  const [showPw,     setShowPw]     = useState(false);
  const [pwLoading,  setPwLoading]  = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [pwMsg,      setPwMsg]      = useState({ type: '', text: '' });

  const [deletePhase,   setDeletePhase]   = useState('idle');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getProfile()
      .then(d => {
        setUser(d);
        setEditData({ first_name: d.first_name || '', last_name: d.last_name || '', mobile_no: d.mobile_no || '' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    setSaveLoading(true); setSaveMsg({ type: '', text: '' });
    try {
      const res = await updateProfile(editData);
      setUser(prev => ({ ...prev, ...res.user }));
      setSaveMsg({ type: 'success', text: 'Profile updated successfully' });
      setEditing(false);
      setTimeout(() => setSaveMsg({ type: '', text: '' }), 3000);
    } catch (e) {
      setSaveMsg({ type: 'error', text: e.message });
    } finally { setSaveLoading(false); }
  };

  const handleRequestOtp = async () => {
    if (!pwData.current) { setPwMsg({ type: 'error', text: 'Enter your current password first' }); return; }
    setOtpSending(true); setPwMsg({ type: '', text: '' });
    try {
      await requestChangePasswordOtp();
      setPwOtpSent(true);
      setPwMsg({ type: 'info', text: `Verification code sent to ${user?.email}` });
    } catch (e) {
      setPwMsg({ type: 'error', text: e.message || 'Failed to send code' });
    } finally { setOtpSending(false); }
  };

  const handleChangePassword = async () => {
    if (pwData.new !== pwData.confirm) { setPwMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    setPwLoading(true); setPwMsg({ type: '', text: '' });
    try {
      await changePassword({ current_password: pwData.current, otp: pwOtp, new_password: pwData.new });
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      setPwData({ current: '', new: '', confirm: '' }); setPwOtp('');
      setPwOtpSent(false); setPwOtpOk(false);
      setTimeout(() => setPwMsg({ type: '', text: '' }), 3000);
    } catch (e) {
      setPwMsg({ type: 'error', text: e.message || 'Failed to change password' });
      setPwOtp(''); setPwOtpOk(false);
    } finally { setPwLoading(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true);
    try { await deleteAccount(); onLogout(); }
    catch { setDeleteLoading(false); setDeletePhase('idle'); }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress size={24} sx={{ color: amber }} />
      </Box>
    );
  }

  const labelSx = {
    fontSize: '0.6875rem', fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: theme.palette.text.disabled, mb: 2,
  };

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', py: { xs: 2, md: 3 } }} className="page-enter">
      <Typography sx={{
        fontFamily: '"DM Serif Display", serif',
        fontSize: '1.75rem', fontWeight: 400,
        color: theme.palette.text.primary, mb: 3,
      }}>
        Profile
      </Typography>

      {/* ── Avatar card ── */}
      <SectionCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            width: 56, height: 56,
            fontSize: '1.1rem', fontWeight: 700,
            fontFamily: '"DM Sans", sans-serif',
            backgroundColor: isDark ? '#3A3830' : '#E8E4DC',
            border: `1.5px solid ${amber}40`,
            color: amber,
          }}>
            {initials}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: theme.palette.text.primary }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography sx={{
              fontSize: '0.8125rem', color: theme.palette.text.secondary,
              fontFamily: '"DM Mono", monospace', letterSpacing: '-0.01em',
            }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </SectionCard>

      {/* ── Personal information ── */}
      <SectionCard>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography sx={labelSx}>Personal Information</Typography>
          {!editing ? (
            <Button startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              size="small" variant="outlined"
              onClick={() => { setEditing(true); setSaveMsg({ type: '', text: '' }); }}
              sx={{
                fontSize: '0.75rem', py: 0.4, px: 1.25,
                borderColor: theme.palette.divider, color: theme.palette.text.secondary,
                '&:hover': { borderColor: amber + '60', color: amber },
              }}>
              Edit
            </Button>
          ) : (
            <IconButton size="small" onClick={() => setEditing(false)}
              sx={{ color: theme.palette.text.disabled }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>

        <AnimatePresence>
          {saveMsg.text && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Alert severity={saveMsg.type} sx={{ mb: 2 }}>{saveMsg.text}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField label="First name" size="small" fullWidth
              value={editing ? editData.first_name : user?.first_name || ''}
              disabled={!editing}
              onChange={e => setEditData(p => ({ ...p, first_name: e.target.value }))}
              sx={fieldSx}
            />
            <TextField label="Last name" size="small" fullWidth
              value={editing ? editData.last_name : user?.last_name || ''}
              disabled={!editing}
              onChange={e => setEditData(p => ({ ...p, last_name: e.target.value }))}
              sx={fieldSx}
            />
          </Box>

          <Box>
            <TextField label="Email address" size="small" fullWidth
              value={user?.email || ''} disabled sx={fieldSx}
            />
            <Typography sx={{ fontSize: '0.6875rem', color: theme.palette.text.disabled, mt: 0.5, pl: 0.5 }}>
              Email cannot be changed
            </Typography>
          </Box>

          <TextField label="Mobile number" size="small" fullWidth
            value={editing ? editData.mobile_no : user?.mobile_no || ''}
            disabled={!editing}
            placeholder={!editing && !user?.mobile_no ? 'Not provided' : ''}
            onChange={e => setEditData(p => ({ ...p, mobile_no: e.target.value }))}
            sx={fieldSx}
          />
        </Box>

        {editing && (
          <Button
            startIcon={saveLoading ? null : <SaveIcon sx={{ fontSize: 14 }} />}
            variant="contained" onClick={handleSave} disabled={saveLoading}
            sx={{
              mt: 2.5, fontSize: '0.875rem', py: 0.9,
              backgroundColor: amber, color: '#0C0B09', fontWeight: 600,
              '&:hover': { backgroundColor: theme.palette.primary.light },
              '&:disabled': { opacity: 0.4 },
            }}
          >
            {saveLoading ? <CircularProgress size={16} sx={{ color: '#0C0B09' }} /> : 'Save changes'}
          </Button>
        )}
      </SectionCard>

      {/* ── Change password ── */}
      <SectionCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <LockIcon sx={{ fontSize: 15, color: theme.palette.text.disabled }} />
          <Typography sx={labelSx}>Change Password</Typography>
        </Box>

        <AnimatePresence>
          {pwMsg.text && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Alert severity={pwMsg.type} sx={{ mb: 2 }}>{pwMsg.text}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          {/* Current password */}
          <TextField label="Current password" size="small" fullWidth
            type={showPw ? 'text' : 'password'} value={pwData.current}
            onChange={e => setPwData(p => ({ ...p, current: e.target.value }))}
            sx={fieldSx}
            InputProps={{ endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowPw(p => !p)}
                  sx={{ color: theme.palette.text.disabled }}>
                  {showPw ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                </IconButton>
              </InputAdornment>
            )}}
          />

          {!pwOtpSent && (
            <Button variant="outlined" size="small"
              onClick={handleRequestOtp} disabled={!pwData.current || otpSending}
              sx={{
                alignSelf: 'flex-start', fontSize: '0.8125rem', py: 0.5, px: 1.5,
                borderColor: theme.palette.divider, color: theme.palette.text.secondary,
                '&:hover': { borderColor: amber + '60', color: amber },
                '&:disabled': { opacity: 0.4 },
              }}>
              {otpSending
                ? <><CircularProgress size={12} sx={{ mr: 0.75, color: 'inherit' }} />Sending…</>
                : 'Send verification code'
              }
            </Button>
          )}

          <AnimatePresence>
            {pwOtpSent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.18 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mb: 1 }}>
                    Enter the 6-digit code sent to your email
                  </Typography>
                  <OtpInput value={pwOtp} onChange={setPwOtp} disabled={pwLoading} />
                  <Box sx={{ textAlign: 'right', mt: 0.5 }}>
                    <Button size="small" variant="text" onClick={handleRequestOtp} disabled={otpSending}
                      sx={{ fontSize: '0.75rem', color: theme.palette.text.disabled, '&:hover': { color: amber } }}>
                      {otpSending ? 'Sending…' : 'Resend code'}
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {pwOtpOk && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.18 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                  <TextField label="New password" size="small" fullWidth
                    type={showPw ? 'text' : 'password'} value={pwData.new}
                    onChange={e => setPwData(p => ({ ...p, new: e.target.value }))} sx={fieldSx}
                  />

                  {pwData.new.length > 0 && (
                    <Box sx={{ pl: 0.5 }}>
                      <PasswordCheck ok={passwordChecks.length}  label="8 characters minimum" />
                      <PasswordCheck ok={passwordChecks.upper}   label="One uppercase letter" />
                      <PasswordCheck ok={passwordChecks.lower}   label="One lowercase letter" />
                      <PasswordCheck ok={passwordChecks.number}  label="One number" />
                      <PasswordCheck ok={passwordChecks.special} label="One special character" />
                    </Box>
                  )}

                  <TextField label="Confirm new password" size="small" fullWidth
                    type={showPw ? 'text' : 'password'} value={pwData.confirm}
                    onChange={e => setPwData(p => ({ ...p, confirm: e.target.value }))} sx={fieldSx}
                  />

                  {pwData.confirm.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pl: 0.5 }}>
                      <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 700, color: passwordsMatch ? '#2CB67D' : '#E05252' }}>
                        {passwordsMatch ? '✓' : '✕'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: passwordsMatch ? '#2CB67D' : '#E05252' }}>
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </Typography>
                    </Box>
                  )}

                  <Button variant="contained" onClick={handleChangePassword}
                    disabled={pwLoading || !isPwValid || !passwordsMatch}
                    sx={{
                      alignSelf: 'flex-start', fontSize: '0.875rem', py: 0.9, px: 2,
                      backgroundColor: amber, color: '#0C0B09', fontWeight: 600,
                      '&:hover': { backgroundColor: theme.palette.primary.light },
                      '&:disabled': { opacity: 0.4 },
                    }}>
                    {pwLoading ? <CircularProgress size={16} sx={{ color: '#0C0B09' }} /> : 'Update password'}
                  </Button>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </SectionCard>

      {/* ── Delete account ── */}
      <Box sx={{
        p: 3, borderRadius: '8px',
        border: `1px solid rgba(224,82,82,0.25)`,
        backgroundColor: isDark ? 'rgba(224,82,82,0.04)' : 'rgba(224,82,82,0.03)',
      }}>
        <Typography sx={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#E05252', mb: 0.75,
        }}>
          Danger Zone
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mb: 2, lineHeight: 1.6 }}>
          Permanently delete your account and all associated data — recordings, analyses, and history. This cannot be undone.
        </Typography>

        {deletePhase === 'idle' && (
          <Button variant="outlined" size="small"
            startIcon={<DeleteForeverIcon sx={{ fontSize: 15 }} />}
            onClick={() => setDeletePhase('confirm')}
            sx={{
              fontSize: '0.8125rem', py: 0.5, px: 1.5,
              borderColor: 'rgba(224,82,82,0.4)', color: '#E05252',
              '&:hover': { borderColor: '#E05252', backgroundColor: 'rgba(224,82,82,0.06)' },
            }}>
            Delete account
          </Button>
        )}

        {deletePhase === 'confirm' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This is permanent. All your data will be deleted immediately.
            </Alert>
            <Typography sx={{ fontSize: '0.8125rem', color: theme.palette.text.secondary, mb: 1 }}>
              Type{' '}
              <Box component="span" sx={{
                fontFamily: '"DM Mono", monospace', fontWeight: 600, color: '#E05252', fontSize: '0.8rem',
              }}>DELETE</Box>{' '}to confirm:
            </Typography>
            <TextField
              size="small" value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE" sx={{ ...fieldSx, mb: 2, width: 160 }}
              inputProps={{ style: { fontFamily: '"DM Mono", monospace', fontWeight: 600 } }}
            />
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button variant="contained" size="small"
                disabled={deleteConfirm !== 'DELETE' || deleteLoading}
                onClick={handleDelete}
                startIcon={deleteLoading ? null : <DeleteForeverIcon sx={{ fontSize: 14 }} />}
                sx={{
                  fontSize: '0.8125rem', backgroundColor: '#E05252', color: '#fff',
                  '&:hover': { backgroundColor: '#C43A3A' }, '&:disabled': { opacity: 0.4 },
                }}>
                {deleteLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Delete everything'}
              </Button>
              <Button variant="outlined" size="small"
                onClick={() => { setDeletePhase('idle'); setDeleteConfirm(''); }}
                sx={{
                  fontSize: '0.8125rem', borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                  '&:hover': { borderColor: theme.palette.text.secondary },
                }}>
                Cancel
              </Button>
            </Box>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}