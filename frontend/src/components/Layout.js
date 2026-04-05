import React, { useState, useEffect  } from 'react';
import { Box, IconButton, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { Menu as MenuIcon, Brightness4, Brightness7 } from '@mui/icons-material';
import Sidebar, { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED } from './Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Layout = ({ children, onLogout }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isDark, toggleTheme } = useThemeContext();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const sidebarWidth = isMobile ? 0 : (collapsed ? DRAWER_WIDTH_CLOSED : DRAWER_WIDTH_OPEN);
  const [userInitials, setUserInitials] = useState('');
  
  const navigate = useNavigate();

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
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

      <Sidebar
        onLogout={onLogout}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          width: '100%',
          bgcolor: 'background.default',
          pl: { md: `${sidebarWidth}px` },
          transition: 'padding-left 0.25s ease',
          willChange: 'padding-left',       // ← add here
          position: 'relative',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Mobile top bar */}
        {isMobile && (
          <Box sx={{
            display: 'flex', alignItems: 'center', px: 2, py: 1.5,
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            position: 'sticky', top: 0, zIndex: 1100,
          }}>
            <IconButton onClick={() => setMobileOpen(o => !o)} size="small">
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Top right controls */}
        <Box sx={{
          position: 'absolute', top: 14, right: 20, zIndex: 1200,
          display: 'flex', alignItems: 'center', gap: 1,
        }}>

          {/* Theme toggle — clean icon button, industry standard */}
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

          {/* Profile avatar */}
          <Tooltip title="Profile">
            <Box
              onClick={() => navigate('/profile')}
              sx={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                border: '2px solid transparent',
                transition: 'border-color 0.15s, transform 0.15s',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'scale(1.05)',
                },
              }}
            >
              {userInitials}
            </Box>
          </Tooltip>

        </Box>

        {/* Page content */}
        <Box sx={{
          p: { xs: 2, sm: 3 },
          
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;