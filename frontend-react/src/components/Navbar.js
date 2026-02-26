import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeContext } from '../context/ThemeContext';

const Navbar = ({ onLogout }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeContext();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          🎙️ AI Call Insights
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton color="inherit" onClick={toggleTheme} title={isDark ? 'Light' : 'Dark'}>
            {isDark ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={() => navigate('/upload')}>
            Upload
          </Button>
          <Button color="inherit" onClick={() => navigate('/assets')}>
            Assets
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
