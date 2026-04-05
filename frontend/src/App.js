import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';
import Dashboard from './components/Dashboard';
import Upload from './components/Upload';
import AssetsList from './components/AssetsList';
import Analysis from './components/Analysis';
import { api } from './services/api';
import Profile from './components/Profile';

const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [idleTimeoutMs, setIdleTimeoutMs] = useState(
    DEFAULT_IDLE_TIMEOUT_MINUTES * 60 * 1000
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await api.get("/api/me");
        const idleMinutes = Number(response?.data?.frontend_idle_timeout_minutes);
        if (mounted) {
          setIsAuthenticated(true);
          if (Number.isFinite(idleMinutes) && idleMinutes > 0) {
            setIdleTimeoutMs(idleMinutes * 60 * 1000);
          }
        }
      } catch {
        if (mounted) setIsAuthenticated(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
  const onAuthExpired = () => {
    setIsAuthenticated(false);
  };

  
  window.addEventListener("auth:expired", onAuthExpired);
  return () => window.removeEventListener("auth:expired", onAuthExpired);
}, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'google_failed') {
      // could show a toast here if you have one
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timerId = null;
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    const clearTimer = () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };

    const logoutOnIdle = async () => {
      try {
        await api.post("/auth/logout");
      } catch {}
      setIsAuthenticated(false);
    };

    const resetIdleTimer = () => {
      clearTimer();
      timerId = window.setTimeout(logoutOnIdle, idleTimeoutMs);
    };

    events.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      clearTimer();
      events.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, [isAuthenticated, idleTimeoutMs]);


  const handleLogin = async () => {
    try {
      const response = await api.get("/api/me");
      const idleMinutes = Number(response?.data?.frontend_idle_timeout_minutes);
      if (Number.isFinite(idleMinutes) && idleMinutes > 0) {
        setIdleTimeoutMs(idleMinutes * 60 * 1000);
      }
    } catch {}
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    setIsAuthenticated(false);
  };


  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  

   return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthLayout onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <Layout onLogout={handleLogout}>
              <Dashboard />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/upload"
        element={
          isAuthenticated ? (
            <Layout onLogout={handleLogout}>
              <Upload />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/assets"
        element={
          isAuthenticated ? (
            <Layout onLogout={handleLogout}>
              <AssetsList />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/analysis/:assetId"
        element={
          isAuthenticated ? (
            <Layout onLogout={handleLogout}>
              <Analysis />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />
      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <Layout onLogout={handleLogout}>
              <Profile onLogout={handleLogout} />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
