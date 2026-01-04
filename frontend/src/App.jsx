import React from 'react';
import { AuthProvider } from '@/contexts';
import { AppRouter } from '@/routes';
import { ErrorBoundary } from '@/components/common';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
