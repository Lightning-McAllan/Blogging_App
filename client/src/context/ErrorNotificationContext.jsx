import React, { createContext, useContext, useState, useCallback } from 'react';
import NotifyBanner from '../components/ui/NotifyBanner';
import { getErrorMessage, getNotificationType, isRetryableError } from '../utils/errorHandler';

const ErrorNotificationContext = createContext();

export const useErrorNotification = () => {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within an ErrorNotificationProvider');
  }
  return context;
};

export const ErrorNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showError = useCallback((error, options = {}) => {
    const id = Date.now().toString();
    const message = getErrorMessage(error, options.context);
    const type = getNotificationType(error);
    const canRetry = isRetryableError(error);

    const notification = {
      id,
      message,
      subMessage: options.subMessage,
      type,
      canRetry,
      onRetry: options.onRetry,
      persistent: options.persistent || false,
      duration: options.duration || (type === 'error' ? 5000 : 3000),
      originalError: error
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove notification after duration (if not persistent)
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const showSuccess = useCallback((message, options = {}) => {
    const id = Date.now().toString();
    
    const notification = {
      id,
      message,
      subMessage: options.subMessage,
      type: 'success',
      canRetry: false,
      persistent: false,
      duration: options.duration || 3000
    };

    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      removeNotification(id);
    }, notification.duration);

    return id;
  }, []);

  const showWarning = useCallback((message, options = {}) => {
    const id = Date.now().toString();
    
    const notification = {
      id,
      message,
      subMessage: options.subMessage,
      type: 'warning',
      canRetry: false,
      persistent: options.persistent || false,
      duration: options.duration || 4000
    };

    setNotifications(prev => [...prev, notification]);

    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const showInfo = useCallback((message, options = {}) => {
    const id = Date.now().toString();
    
    const notification = {
      id,
      message,
      subMessage: options.subMessage,
      type: 'info',
      canRetry: false,
      persistent: options.persistent || false,
      duration: options.duration || 3000
    };

    setNotifications(prev => [...prev, notification]);

    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    removeNotification,
    clearAll,
    notifications
  };

  return (
    <ErrorNotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div 
            key={notification.id}
            style={{ 
              transform: `translateY(-${index * 80}px)`,
              zIndex: 50 - index 
            }}
          >
            <NotifyBanner
              message={notification.message}
              subMessage={notification.subMessage}
              type={notification.type}
              onClose={() => removeNotification(notification.id)}
              onRetry={notification.onRetry}
              canRetry={notification.canRetry}
              persistent={notification.persistent}
              duration={notification.duration}
            />
          </div>
        ))}
      </div>
    </ErrorNotificationContext.Provider>
  );
};

export default ErrorNotificationContext;
