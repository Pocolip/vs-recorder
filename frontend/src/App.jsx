import React from 'react';
import { AuthProvider, ToastProvider } from '@/contexts';
import { AppRouter } from '@/routes';
import { ErrorBoundary } from '@/components/common';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
