import React, { useState, useEffect } from 'react';
import { Box, IconButton, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { Menu as MenuIcon, LightMode, DarkMode } from '@mui/icons-material';
import Sidebar, { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED } from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Layout = ({ children, onLogout }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isDark, toggleTheme } = useThemeContext();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [userInitials, setUserInitials] = useState('');
  const navigate = useNavigate();

  const sidebarWidth = isMobile ? 0 : (collapsed ? DRAWER_WIDTH_CLOSED : DRAWER_WIDTH_OPEN);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const first = (d.first_name || '')[0] || '';
        const last  = (d.last_name  || '')[0] || '';
        setUserInitials((first + last).toUpperCase());
      })
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        onLogout={onLogout}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          width: '100%',
          bgcolor: 'background.default',
          pl: { md: `${sidebarWidth}px` },
          transition: 'padding-left 0.2s ease',
          position: 'relative',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Top bar ── */}
        <Box sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          justifyContent: 'space-between',
          bgcolor: 'background.default',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(12px)',
        }}>
          {/* Mobile menu toggle */}
          {isMobile ? (
            <IconButton
              onClick={() => setMobileOpen(o => !o)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          ) : (
            <Box /> // spacer
          )}

          {/* Right controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme toggle */}
            <Tooltip title={isDark ? 'Light mode' : 'Dark mode'} arrow>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  color: 'text.disabled',
                  '&:hover': { color: 'text.secondary', bgcolor: 'action.hover' },
                }}
              >
                {isDark
                  ? <LightMode sx={{ fontSize: 16 }} />
                  : <DarkMode  sx={{ fontSize: 16 }} />
                }
              </IconButton>
            </Tooltip>

            {/* Profile avatar */}
            <Tooltip title="Profile" arrow>
              <Box
                onClick={() => navigate('/profile')}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  fontFamily: '"DM Sans", sans-serif',
                  color: '#fff',
                  letterSpacing: '0.02em',
                  border: `1.5px solid ${theme.palette.divider}`,
                  transition: 'border-color 0.15s, transform 0.15s',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    transform: 'scale(1.06)',
                  },
                }}
              >
                {userInitials || '?'}
              </Box>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Page content ── */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;