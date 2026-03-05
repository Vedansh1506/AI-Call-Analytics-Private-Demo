import React, { useState } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './Login';
import Register from './Register';

const AuthLayout = ({ onLogin }) => {
  const [showRegister, setShowRegister] = useState(false);

  const handleSwitchToRegister = () => {
    setShowRegister(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegister(false);
  };

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={showRegister ? 'register' : 'login'}
          initial="enter"
          animate="center"
          exit="exit"
          variants={slideVariants}
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 },
          }}
          style={{ height: '100%' }}
        >
          {showRegister ? (
            <Register
              onLogin={onLogin}
              onSwitchToLogin={handleSwitchToLogin}
            />
          ) : (
            <Login
              onLogin={onLogin}
              onSwitchToRegister={handleSwitchToRegister}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default AuthLayout;
