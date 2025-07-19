/**
 * Frontend Error Handler Utility
 * Handles errors from the backend's new error handling system
 */

import logger from './logger.js';

export class ApiError extends Error {
  constructor(message, statusCode, type = 'API_ERROR', status = 'error', validationErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.type = type;
    this.status = status;
    this.validationErrors = validationErrors;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error type constants matching backend error patterns
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  BLOCKED_ACCOUNT: 'BLOCKED_ACCOUNT',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

/**
 * Get user-friendly error message based on error type and context
 */
export const getErrorMessage = (error, context = '') => {
  if (!error) return 'An unexpected error occurred';

  // If it's already a user-friendly message, return it
  if (error.message && !error.message.includes('Error:')) {
    return error.message;
  }

  // Handle different error types with context-aware messages
  switch (error.type) {
    case ERROR_TYPES.VALIDATION_ERROR:
      return error.message || 'Please check your input and try again.';
    
    case ERROR_TYPES.AUTH_ERROR:
    case ERROR_TYPES.TOKEN_EXPIRED:
      return error.message || 'Your session has expired. Please log in again.';
    
    case ERROR_TYPES.INVALID_TOKEN:
      return 'Invalid authentication. Please log in again.';
    
    case ERROR_TYPES.PERMISSION_DENIED:
      return error.message || 'You do not have permission to perform this action.';
    
    case ERROR_TYPES.BLOCKED_ACCOUNT:
      return error.message || 'Your account has been temporarily locked. Please try again later.';
    
    case ERROR_TYPES.NOT_FOUND:
      if (context === 'blog') return 'Blog post not found.';
      if (context === 'user') return 'User not found.';
      return error.message || 'The requested resource was not found.';
    
    case ERROR_TYPES.CONFLICT:
      if (context === 'user') return 'An account with this email already exists.';
      if (context === 'blog') return 'A blog with this title already exists.';
      return error.message || 'This resource already exists.';
    
    case ERROR_TYPES.RATE_LIMIT:
      return error.message || 'Too many requests. Please wait a moment before trying again.';
    
    case ERROR_TYPES.NETWORK:
      return 'Network error. Please check your connection and try again.';
    
    case ERROR_TYPES.TIMEOUT:
      return 'Request timed out. Please try again.';
    
    case ERROR_TYPES.SERVER_ERROR:
    case ERROR_TYPES.DATABASE_ERROR:
      return 'Server error. Please try again later.';
    
    case ERROR_TYPES.SERVICE_UNAVAILABLE:
      return 'Service temporarily unavailable. Please try again later.';
    
    case ERROR_TYPES.EMAIL_SERVICE_ERROR:
      return 'Email service error. Please try again or contact support.';
    
    case ERROR_TYPES.ACCOUNT_NOT_VERIFIED:
      return 'Please verify your email address before continuing.';
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Get notification type based on error type
 */
export const getNotificationType = (error) => {
  if (!error) return 'error';
  
  switch (error.type) {
    case ERROR_TYPES.VALIDATION_ERROR:
    case ERROR_TYPES.CONFLICT:
    case ERROR_TYPES.NOT_FOUND:
    case ERROR_TYPES.RATE_LIMIT:
      return 'warning';
    
    case ERROR_TYPES.AUTH_ERROR:
    case ERROR_TYPES.TOKEN_EXPIRED:
    case ERROR_TYPES.INVALID_TOKEN:
    case ERROR_TYPES.PERMISSION_DENIED:
    case ERROR_TYPES.ACCOUNT_NOT_VERIFIED:
    case ERROR_TYPES.BLOCKED_ACCOUNT:
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.TIMEOUT:
    case ERROR_TYPES.SERVER_ERROR:
    case ERROR_TYPES.SERVICE_UNAVAILABLE:
    case ERROR_TYPES.EMAIL_SERVICE_ERROR:
    case ERROR_TYPES.DATABASE_ERROR:
      return 'error';
    
    default:
      return 'error';
  }
};

/**
 * Handle error in UI components
 */
export const handleError = (error, context = '', options = {}) => {
  const {
    showNotification = true,
    logError = true,
    customMessage = null
  } = options;

  // Log error for debugging with enhanced logger
  if (logError) {
    logger.error(`Error in ${context}`, {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode,
      status: error.status,
      validationErrors: error.validationErrors,
      stack: error.stack
    }, context.toUpperCase());
  }

  // Get user-friendly message
  const message = customMessage || getErrorMessage(error, context);
  const notificationType = getNotificationType(error);

  return {
    message,
    type: notificationType,
    shouldRedirect: error.shouldRedirect || false,
    statusCode: error.statusCode,
    errorType: error.type
  };
};

/**
 * Check if error should trigger logout
 */
export const shouldLogout = (error) => {
  return error?.type === ERROR_TYPES.AUTH_ERROR && error?.shouldRedirect;
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error) => {
  const retryableTypes = [
    ERROR_TYPES.NETWORK,
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.SERVER_ERROR,
    ERROR_TYPES.SERVICE_UNAVAILABLE
  ];
  
  return retryableTypes.includes(error?.type);
};

/**
 * Extract validation errors from server response
 */
export const extractValidationErrors = (error) => {
  if (error.type !== ERROR_TYPES.VALIDATION_ERROR) return {};
  
  // If the server sends structured validation errors, parse them
  if (error.validationErrors) {
    return error.validationErrors;
  }
  
  // Otherwise, return a general form error
  return {
    form: error.message
  };
};

/**
 * Create API error from server response
 * Handles the new server error format: { success: false, status: 'error'|'fail', message: string }
 */
export const createApiErrorFromResponse = (error) => {
  const response = error.response;
  const data = response?.data || {};
  const status = response?.status || 500;
  
  // Log the raw error for debugging
  logger.debug('Creating API error from response', {
    status,
    data,
    originalError: error.message,
    code: error.code
  }, 'ERROR_HANDLER');
  
  // Handle cases where response data is undefined or not an object
  if (!data || typeof data !== 'object') {
    const apiError = new ApiError(
      'Server returned invalid response format',
      status,
      ERROR_TYPES.SERVER_ERROR,
      'error'
    );
    logger.warn('Server returned invalid response format', { data, status }, 'ERROR_HANDLER');
    return apiError;
  }
  
  // Determine error type based on status code and message
  let errorType = ERROR_TYPES.SERVER_ERROR;
  
  if (status === 400) {
    errorType = ERROR_TYPES.VALIDATION_ERROR;
  } else if (status === 401) {
    if (data.expired || data.message?.includes('expired')) {
      errorType = ERROR_TYPES.TOKEN_EXPIRED;
    } else if (data.message?.includes('invalid token')) {
      errorType = ERROR_TYPES.INVALID_TOKEN;
    } else {
      errorType = ERROR_TYPES.AUTH_ERROR;
    }
  } else if (status === 403) {
    if (data.message?.includes('not verified')) {
      errorType = ERROR_TYPES.ACCOUNT_NOT_VERIFIED;
    } else {
      errorType = ERROR_TYPES.PERMISSION_DENIED;
    }
  } else if (status === 404) {
    errorType = ERROR_TYPES.NOT_FOUND;
  } else if (status === 409) {
    errorType = ERROR_TYPES.CONFLICT;
  } else if (status === 429) {
    if (data.message?.includes('locked') || data.message?.includes('blocked')) {
      errorType = ERROR_TYPES.BLOCKED_ACCOUNT;
    } else {
      errorType = ERROR_TYPES.RATE_LIMIT;
    }
  } else if (status === 503) {
    errorType = ERROR_TYPES.SERVICE_UNAVAILABLE;
  }
  
  // Handle email service specific errors
  if (data.message?.includes('email') && (status === 500 || status === 503)) {
    errorType = ERROR_TYPES.EMAIL_SERVICE_ERROR;
  }
  
  // Handle network connection errors
  if (!response && error.code === 'ECONNREFUSED') {
    errorType = ERROR_TYPES.NETWORK;
  }
  
  const apiError = new ApiError(
    data.message || error.message || 'An error occurred',
    status,
    errorType,
    data.status || 'error',
    data.validationErrors || null
  );

  logger.debug('API Error created', {
    message: apiError.message,
    type: apiError.type,
    statusCode: apiError.statusCode,
    originalData: data
  }, 'ERROR_HANDLER');

  return apiError;
};

/**
 * Check if error indicates a server/database issue
 */
export const isServerError = (error) => {
  const serverErrorTypes = [
    ERROR_TYPES.SERVER_ERROR,
    ERROR_TYPES.DATABASE_ERROR,
    ERROR_TYPES.EMAIL_SERVICE_ERROR,
    ERROR_TYPES.SERVICE_UNAVAILABLE
  ];
  
  return serverErrorTypes.includes(error?.type) || error?.statusCode >= 500;
};

export default {
  ApiError,
  ERROR_TYPES,
  getErrorMessage,
  getNotificationType,
  handleError,
  shouldLogout,
  isRetryableError,
  extractValidationErrors,
  createApiErrorFromResponse,
  isServerError
};
