import axios from 'axios';
import { createApiErrorFromResponse, ERROR_TYPES } from '../utils/errorHandler';
import logger from '../utils/logger.js';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    // Log API request
    logger.apiRequest(config.method?.toUpperCase() || 'UNKNOWN', config.url, config.data);
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error, 'API_REQUEST');
    return Promise.reject(error);
  }
);

// Response interceptor with comprehensive error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log successful API response
    logger.apiResponse(
      response.config.method?.toUpperCase() || 'UNKNOWN',
      response.config.url,
      response.status,
      response.data
    );

    // Check if the response indicates success
    const data = response.data;
    if (data && data.success === false) {
      // Server returned an error in a successful HTTP response
      const apiError = createApiErrorFromResponse({ response });
      return Promise.reject(apiError);
    }
    return data;
  },
  (error) => {
    // Log API error with enhanced details
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';
    logger.apiError(method, url, error);

    // Handle network/connection errors
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error(`Request timed out after ${error.config.timeout}ms. Please check your connection.`);
      timeoutError.type = ERROR_TYPES.TIMEOUT;
      timeoutError.statusCode = 408;
      logger.warn('Request timeout', { timeout: error.config.timeout }, 'API');
      return Promise.reject(timeoutError);
    }

    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || !error.response) {
      const networkError = new Error('Cannot connect to server. Please ensure the server is running and try again.');
      networkError.type = ERROR_TYPES.NETWORK;
      networkError.statusCode = 0;
      logger.error('Network connection failed', { code: error.code }, 'API');
      return Promise.reject(networkError);
    }

    // Handle HTTP errors with server response
    if (error.response) {
      const apiError = createApiErrorFromResponse(error);
      
      // Handle auth errors with automatic cleanup
      if (apiError.type === ERROR_TYPES.AUTH_ERROR || 
          apiError.type === ERROR_TYPES.TOKEN_EXPIRED || 
          apiError.type === ERROR_TYPES.INVALID_TOKEN) {
        
        logger.authEvent('Token invalidated - clearing auth data', {
          type: apiError.type,
          status: apiError.statusCode
        });
        
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        
        // Mark for redirect if not already on auth pages
        if (window.location.pathname !== '/login' && 
            window.location.pathname !== '/signup' && 
            window.location.pathname !== '/') {
          apiError.shouldRedirect = true;
          
          logger.navigation('current', '/login (due to auth error)');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
      
      return Promise.reject(apiError);
    }

    // Fallback for unexpected errors
    const fallbackError = new Error(error.message || 'An unexpected error occurred');
    fallbackError.type = ERROR_TYPES.SERVER_ERROR;
    fallbackError.statusCode = 500;
    return Promise.reject(fallbackError);
  }
);

export default apiClient;