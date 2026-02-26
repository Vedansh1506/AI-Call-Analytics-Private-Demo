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

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await api.get("/api/me");
        if (mounted) setIsAuthenticated(true);
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


  const handleLogin = () => {
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
