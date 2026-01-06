import React, { createContext, useState, useContext, useCallback } from 'react';
import Toast from '@/components/common/Toast';

const ToastContext = createContext(undefined);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message, duration) => addToast(message, 'success', duration),
    [addToast]
  );

  const showError = useCallback(
    (message, duration) => addToast(message, 'error', duration),
    [addToast]
  );

  const showInfo = useCallback(
    (message, duration) => addToast(message, 'info', duration),
    [addToast]
  );

  const showWarning = useCallback(
    (message, duration) => addToast(message, 'warning', duration),
    [addToast]
  );

  const value = {
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Custom hook to use toast notifications
 * @returns {Object} Toast methods { showSuccess, showError, showInfo, showWarning }
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
