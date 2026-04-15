import React from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography,
  IconButton, useTheme, useMediaQuery, Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Mic as MicIcon,
  Upload as UploadIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export const DRAWER_WIDTH_OPEN   = 220;
export const DRAWER_WIDTH_CLOSED =  56;

const menuItems = [
  { text: 'Dashboard',       icon: <DashboardIcon sx={{ fontSize: 17 }} />, path: '/dashboard' },
  { text: 'Call Recordings', icon: <MicIcon        sx={{ fontSize: 17 }} />, path: '/assets'    },
  { text: 'Upload',          icon: <UploadIcon     sx={{ fontSize: 17 }} />, path: '/upload'    },
];

const Sidebar = ({ onLogout, open, onClose, collapsed, onToggleCollapse }) => {
  const theme    = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isCollapsed = collapsed && !isMobile;

  // Amber accent color
  const amber = theme.palette.primary.main;

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const handleLogout = () => { onLogout(); navigate('/login'); };

  const drawerContent = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Logo row ── */}
      <Box sx={{
        height: 56,
        px: isCollapsed ? 1 : 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
      }}>
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {/* Wordmark logo */}
            <Box sx={{
              width: 28, height: 28,
              borderRadius: '6px',
              border: `1.5px solid ${amber}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MicIcon sx={{ fontSize: 14, color: amber }} />
            </Box>
            <Typography sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '1.05rem',
              fontWeight: 400,
              letterSpacing: '-0.01em',
              color: theme.palette.text.primary,
              lineHeight: 1,
            }}>
              CallAI
            </Typography>
          </Box>
        )}

        {isCollapsed && (
          <Box sx={{
            width: 28, height: 28,
            borderRadius: '6px',
            border: `1.5px solid ${amber}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MicIcon sx={{ fontSize: 14, color: amber }} />
          </Box>
        )}

        {!isMobile && (
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{
              color: theme.palette.text.disabled,
              p: 0.5,
              '&:hover': { color: theme.palette.text.secondary },
            }}
          >
            {isCollapsed
              ? <ChevronRightIcon sx={{ fontSize: 16 }} />
              : <ChevronLeftIcon  sx={{ fontSize: 16 }} />
            }
          </IconButton>
        )}

        {isMobile && (
          <IconButton size="small" onClick={onClose}
            sx={{ color: theme.palette.text.disabled }}>
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      {/* ── Nav label ── */}
      {!isCollapsed && (
        <Box sx={{ px: 2, pt: 2.5, pb: 0.5 }}>
          <Typography sx={{
            fontSize: '0.625rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: theme.palette.text.disabled,
          }}>
            Navigation
          </Typography>
        </Box>
      )}

      {/* ── Nav items ── */}
      <List sx={{
        px: isCollapsed ? 0.75 : 1.25,
        py: isCollapsed ? 1 : 0.5,
        flexGrow: 1,
        gap: 0,
      }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          const btn = (
            <ListItemButton
              onClick={() => handleNav(item.path)}
              sx={{
                borderRadius: '5px',
                py: 0.9,
                px: isCollapsed ? 0 : 1.25,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                minHeight: 36,
                gap: 0,
                mb: 0.25,
                backgroundColor: isActive
                  ? `${amber}15`
                  : 'transparent',
                border: '1px solid',
                borderColor: isActive
                  ? `${amber}30`
                  : 'transparent',
                '&:hover': {
                  backgroundColor: isActive
                    ? `${amber}20`
                    : theme.palette.action.hover,
                  borderColor: isActive
                    ? `${amber}40`
                    : `${theme.palette.divider}`,
                },
                transition: 'all 0.12s ease',
              }}
            >
              <ListItemIcon sx={{
                color: isActive ? amber : theme.palette.text.disabled,
                minWidth: isCollapsed ? 0 : 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {item.icon}
              </ListItemIcon>

              {!isCollapsed && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                    color: isActive
                      ? theme.palette.text.primary
                      : theme.palette.text.secondary,
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                />
              )}

              {/* Active dot indicator */}
              {isActive && !isCollapsed && (
                <Box sx={{
                  width: 4, height: 4, borderRadius: '50%',
                  backgroundColor: amber,
                  flexShrink: 0,
                  ml: 'auto',
                }} />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding>
              {isCollapsed
                ? <Tooltip title={item.text} placement="right" arrow>{btn}</Tooltip>
                : btn
              }
            </ListItem>
          );
        })}
      </List>

      {/* ── Bottom section ── */}
      <Box sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        px: isCollapsed ? 0.75 : 1.25,
        py: 1.25,
      }}>
        {isCollapsed ? (
          <Tooltip title="Logout" placement="right" arrow>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: '5px', justifyContent: 'center',
                py: 0.9, px: 0, minHeight: 36,
                '&:hover': { backgroundColor: 'rgba(224,82,82,0.1)' },
              }}
            >
              <LogoutIcon sx={{ fontSize: 17, color: theme.palette.text.disabled }} />
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: '5px', py: 0.9, px: 1.25,
              minHeight: 36,
              '&:hover': { backgroundColor: 'rgba(224,82,82,0.08)' },
              transition: 'all 0.12s ease',
            }}
          >
            <ListItemIcon sx={{
              color: theme.palette.text.disabled,
              minWidth: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogoutIcon sx={{ fontSize: 17 }} />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 400,
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
              }}
            />
          </ListItemButton>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={isMobile && open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH_OPEN,
            boxSizing: 'border-box',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: collapsed ? DRAWER_WIDTH_CLOSED : DRAWER_WIDTH_OPEN,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: 'width 0.2s ease',
            position: 'fixed',
            top: 0, left: 0,
            height: '100vh',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;