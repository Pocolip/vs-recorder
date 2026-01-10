// src/components/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts';
import { ProtectedRoute, PublicRoute } from '../components';
import HomePage from '../pages/HomePage';
import TeamPage from '../pages/TeamPage';
import ImportPage from '../pages/ImportPage';
import ExportPage from '../pages/ExportPage';
import AboutPage from '../pages/AboutPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import PokemonService from '../services/PokemonService';

const App = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Pokemon service
      const pokemonInitialized = await PokemonService.initialize();
      if (pokemonInitialized) {
        console.log('PokemonService initialized with API support');
      } else {
        console.log('PokemonService initialized with fallback data only');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900">
          <Routes>
            {/* Public routes - redirect to home if authenticated */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Public about page - accessible to everyone */}
            <Route path="/about" element={<AboutPage />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/:teamId"
              element={
                <ProtectedRoute>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/import"
              element={
                <ProtectedRoute>
                  <ImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/export"
              element={
                <ProtectedRoute>
                  <ExportPage />
                </ProtectedRoute>
              }
            />

            {/* 404 fallback - redirect to login if not authenticated, home if authenticated */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
