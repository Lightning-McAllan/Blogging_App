import { useState, useCallback } from 'react';
import { handleError, shouldLogout, isRetryableError, isServerError } from '../utils/errorHandler';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for consistent error handling across components
 */
export const useErrorHandler = (context = '') => {
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();

  /**
   * Handle API errors with consistent behavior
   */
  const handleApiError = useCallback((apiError, options = {}) => {
    const errorInfo = handleError(apiError, context, options);
    
    // Set error state for UI
    setError({
      ...errorInfo,
      originalError: apiError,
      timestamp: new Date().toISOString()
    });

    // Handle logout if needed
    if (shouldLogout(apiError)) {
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    }

    return errorInfo;
  }, [context, navigate]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Retry function for retryable errors
   */
  const retry = useCallback(async (retryFunction) => {
    if (!error?.originalError || !isRetryableError(error.originalError)) {
      return;
    }

    setIsRetrying(true);
    try {
      await retryFunction();
      clearError();
    } catch (newError) {
      handleApiError(newError, { customMessage: 'Retry failed. Please try again later.' });
    } finally {
      setIsRetrying(false);
    }
  }, [error, handleApiError, clearError]);

  /**
   * Async wrapper that automatically handles errors
   */
  const withErrorHandling = useCallback((asyncFunction, options = {}) => {
    return async (...args) => {
      try {
        clearError();
        return await asyncFunction(...args);
      } catch (apiError) {
        const errorInfo = handleApiError(apiError, options);
        throw errorInfo; // Re-throw for component-specific handling if needed
      }
    };
  }, [handleApiError, clearError]);

  /**
   * Show error notification with enhanced UI feedback
   */
  const showError = useCallback((message, type = 'error', options = {}) => {
    const errorObj = {
      message,
      type,
      statusCode: options.statusCode || 400,
      errorType: options.errorType || 'UNKNOWN',
      shouldRedirect: options.shouldRedirect || false,
      timestamp: new Date().toISOString()
    };

    setError(errorObj);

    // Auto-clear non-persistent errors
    if (!options.persistent) {
      setTimeout(() => {
        setError(null);
      }, options.duration || 5000);
    }

    return errorObj;
  }, []);

  return {
    error,
    isRetrying,
    handleApiError,
    clearError,
    retry,
    withErrorHandling,
    showError,
    canRetry: error ? isRetryableError(error.originalError) : false,
    isServerError: error ? isServerError(error.originalError) : false
  };
};

export default useErrorHandler;
