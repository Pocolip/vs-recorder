import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import * as PublicPages from '@/pages/public';
import * as AuthPages from '@/pages/authenticated';
import NotFoundPage from '@/pages/NotFoundPage';

/**
 * Main application router
 * Handles all routing logic with public and protected routes
 */
const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - redirect to dashboard if authenticated */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <PublicPages.LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <PublicPages.LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <PublicPages.RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected routes - require authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AuthPages.DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/:teamId"
          element={
            <ProtectedRoute>
              <AuthPages.TeamDetailPage />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
