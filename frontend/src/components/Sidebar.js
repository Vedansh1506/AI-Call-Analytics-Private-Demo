import React from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography,
  IconButton, Divider, useTheme, useMediaQuery, Tooltip,
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

export const DRAWER_WIDTH_OPEN   = 240;
export const DRAWER_WIDTH_CLOSED =  64;

const menuItems = [
  { text: 'Dashboard',       icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Call Recordings', icon: <MicIcon />,       path: '/assets'    },
  { text: 'Upload',          icon: <UploadIcon />,    path: '/upload'    },
];

const Sidebar = ({ onLogout, open, onClose, collapsed, onToggleCollapse }) => {
  const theme    = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isCollapsed = collapsed && !isMobile;

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const handleLogout = () => { onLogout(); navigate('/login'); };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Logo / Header row ── */}
      <Box
        sx={{
          // Match the exact same horizontal padding as the nav list so icons line up
          px: isCollapsed ? 0.5 : 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          minHeight: 64,
          // When collapsed: centre everything; when open: space-between
          justifyContent: isCollapsed ? 'center' : 'space-between',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo icon — same 40 px footprint as the nav ListItemIcons */}
        <Box
          sx={{
            // Keep icon centred in the same 40 px column the nav icons occupy
            width: 40,
            height: 40,
            minWidth: 40,
            flexShrink: 0,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <MicIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>

        {/* App name — only visible when expanded */}
        {!isCollapsed && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexGrow: 1,
              ml: 1.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CallAI
          </Typography>
        )}

        {/* Desktop collapse toggle */}
        {!isMobile && (
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{
              // Give it a fixed size so it never clips
              flexShrink: 0,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            }}
          >
            {isCollapsed
              ? <ChevronRightIcon fontSize="small" />
              : <ChevronLeftIcon  fontSize="small" />
            }
          </IconButton>
        )}

        {/* Mobile close */}
        {isMobile && (
          <IconButton size="small" onClick={onClose} sx={{ flexShrink: 0 }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ mx: isCollapsed ? 1 : 2, mb: 1 }} />

      {/* ── Nav items ── */}
      <List sx={{ px: isCollapsed ? 0.5 : 1.5, py: 1, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          const btn = (
            <ListItemButton
              onClick={() => handleNav(item.path)}
              sx={{
                borderRadius: 2,
                py: 1.3,
                // Icon always centred in its 40 px column; text follows naturally
                px: isCollapsed ? 0 : 1.5,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                width: '100%',
                minHeight: 44,
                transition: 'all 0.2s ease',
                bgcolor: isActive ? `${theme.palette.primary.main}18` : 'transparent',
                borderLeft: !isCollapsed && isActive
                  ? `3px solid ${theme.palette.primary.main}`
                  : '3px solid transparent',
                '&:hover': {
                  bgcolor: isActive
                    ? `${theme.palette.primary.main}28`
                    : 'action.hover',
                  transform: isCollapsed ? 'none' : 'translateX(3px)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? theme.palette.primary.main : 'text.secondary',
                  minWidth: 40,
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>

              {!isCollapsed && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    color: isActive ? 'text.primary' : 'text.secondary',
                  }}
                  sx={{ ml: 1 }}
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              {isCollapsed
                ? <Tooltip title={item.text} placement="right">{btn}</Tooltip>
                : btn
              }
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: isCollapsed ? 1 : 2, mt: 1 }} />

      {/* ── Logout ── */}
      <Box sx={{ px: isCollapsed ? 0.5 : 1.5, py: 1.5 }}>
        {isCollapsed ? (
          <Tooltip title="Logout" placement="right">
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                justifyContent: 'center',
                py: 1.3,
                px: 0,
                '&:hover': { bgcolor: `${theme.palette.error.main}20` },
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'text.secondary',
                  minWidth: 40,
                  width: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1.3,
              px: 1.5,
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: `${theme.palette.error.main}20` },
            }}
          >
            <ListItemIcon
              sx={{
                color: 'text.secondary',
                minWidth: 40,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem', color: 'text.secondary' }}
              sx={{ ml: 1 }}
            />
          </ListItemButton>
        )}
      </Box>

    </Box>
  );

  return (
    <>
      {/* Mobile */}
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

      {/* Desktop — fixed, doesn't push layout */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: collapsed ? DRAWER_WIDTH_CLOSED : DRAWER_WIDTH_OPEN,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
            overflowX: 'hidden',
            transition: 'width 0.25s ease',
            position: 'fixed',
            top: 0,
            left: 0,
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