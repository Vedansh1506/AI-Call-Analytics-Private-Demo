import React, { useState } from 'react';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';
import Tooltip from '@mui/material/Tooltip';


const DRAWER_WIDTH = 260;

const Layout = ({ children, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
const { isDark, toggleTheme } = useThemeContext();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        onLogout={onLogout}
        open={mobileOpen}
        onClose={handleDrawerToggle}
      />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          position: 'relative',
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Mobile Header */}
        {isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              p: 2,
              backgroundColor: theme.palette.background.paper,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              position: 'sticky',
              top: 0,
              zIndex: 1100,
            }}
          >
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}
        {/* Theme Toggle Button (Top Right) */}

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

        {/* Page Content */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            mt: isMobile ? 0 : 0,
            animation: 'fadeIn 0.3s ease',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(10px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
        


          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
