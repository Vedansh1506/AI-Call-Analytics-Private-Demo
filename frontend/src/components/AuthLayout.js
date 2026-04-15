import React, { useState } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './Login';
import Register from './Register';

// AuthLayout handles the animated transition between Login and Register.
// The new Login/Register are split-panel pages (no glassmorphism card),
// so we just animate them with a simple fade rather than a slide that
// clashes with the full-width layout.

const AuthLayout = ({ onLogin }) => {
  const [showRegister, setShowRegister] = useState(false);

  const variants = {
    enter:  { opacity: 0 },
    center: { opacity: 1 },
    exit:   { opacity: 0 },
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={showRegister ? 'register' : 'login'}
          initial="enter"
          animate="center"
          exit="exit"
          variants={variants}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          {showRegister ? (
            <Register
              onLogin={onLogin}
              onSwitchToLogin={() => setShowRegister(false)}
            />
          ) : (
            <Login
              onLogin={onLogin}
              onSwitchToRegister={() => setShowRegister(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default AuthLayout;