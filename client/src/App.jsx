import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { ErrorNotificationProvider } from './context/ErrorNotificationContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ErrorNotificationProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorNotificationProvider>
    </ErrorBoundary>
  );
}

export default App;