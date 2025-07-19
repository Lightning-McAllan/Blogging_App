/**
 * Frontend Logger Utility
 * Provides structured logging with different levels and formatting
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_COLORS = {
  ERROR: '#ff4444',
  WARN: '#ffaa00',
  INFO: '#4CAF50',
  DEBUG: '#2196F3',
  SUCCESS: '#00C851'
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
    this.enableTimestamp = true;
    this.enableColors = true;
  }

  setLevel(level) {
    this.level = typeof level === 'string' ? LOG_LEVELS[level.toUpperCase()] : level;
  }

  formatMessage(level, message, context = '') {
    const timestamp = this.enableTimestamp ? `[${new Date().toISOString()}]` : '';
    const ctx = context ? `[${context}]` : '';
    return `${timestamp} ${level} ${ctx} ${message}`.trim();
  }

  formatObjectForConsole(obj) {
    if (typeof obj === 'object' && obj !== null) {
      return JSON.stringify(obj, null, 2);
    }
    return obj;
  }

  log(level, message, data = null, context = '') {
    if (LOG_LEVELS[level] > this.level) return;

    const formattedMessage = this.formatMessage(level, message, context);
    const color = LOG_COLORS[level];

    if (this.enableColors && typeof window !== 'undefined') {
      console.log(
        `%c${formattedMessage}`,
        `color: ${color}; font-weight: bold;`
      );
    } else {
      console.log(formattedMessage);
    }

    if (data) {
      if (level === 'ERROR') {
        console.error('📊 Error Data:', data);
      } else {
        console.log('📊 Additional Data:', data);
      }
    }
  }

  error(message, error = null, context = '') {
    this.log('ERROR', `❌ ${message}`, error, context);
    
    if (error instanceof Error) {
      console.error('🔍 Stack Trace:', error.stack);
    }
  }

  warn(message, data = null, context = '') {
    this.log('WARN', `⚠️ ${message}`, data, context);
  }

  info(message, data = null, context = '') {
    this.log('INFO', `ℹ️ ${message}`, data, context);
  }

  debug(message, data = null, context = '') {
    this.log('DEBUG', `🐛 ${message}`, data, context);
  }

  success(message, data = null, context = '') {
    if (this.enableColors && typeof window !== 'undefined') {
      console.log(
        `%c${this.formatMessage('SUCCESS', `✅ ${message}`, context)}`,
        `color: ${LOG_COLORS.SUCCESS}; font-weight: bold;`
      );
    } else {
      console.log(this.formatMessage('SUCCESS', `✅ ${message}`, context));
    }

    if (data) {
      console.log('📊 Success Data:', data);
    }
  }

  // API-specific logging methods
  apiRequest(method, url, data = null) {
    this.debug(`🚀 API Request: ${method.toUpperCase()} ${url}`, data, 'API');
  }

  apiResponse(method, url, status, data = null) {
    const statusEmoji = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
    this.debug(`${statusEmoji} API Response: ${method.toUpperCase()} ${url} [${status}]`, data, 'API');
  }

  apiError(method, url, error) {
    this.error(`🔥 API Error: ${method.toUpperCase()} ${url}`, {
      message: error.message,
      status: error.status || error.statusCode,
      type: error.type,
      stack: error.stack
    }, 'API');
  }

  // User action logging
  userAction(action, data = null) {
    this.info(`👤 User Action: ${action}`, data, 'USER');
  }

  // Auth-specific logging
  authEvent(event, data = null) {
    this.info(`🔐 Auth Event: ${event}`, data, 'AUTH');
  }

  // Navigation logging
  navigation(from, to) {
    this.debug(`🧭 Navigation: ${from} → ${to}`, null, 'ROUTER');
  }

  // Component lifecycle logging
  componentMount(componentName) {
    this.debug(`🏗️ Component Mounted: ${componentName}`, null, 'REACT');
  }

  componentUnmount(componentName) {
    this.debug(`🗑️ Component Unmounted: ${componentName}`, null, 'REACT');
  }

  // Form validation logging
  validationError(formName, errors) {
    this.warn(`📝 Validation Error in ${formName}`, errors, 'VALIDATION');
  }

  // State management logging
  stateChange(context, oldState, newState) {
    this.debug(`🔄 State Change in ${context}`, {
      from: oldState,
      to: newState
    }, 'STATE');
  }

  // Performance logging
  performanceStart(operation) {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      this.debug(`⏱️ Performance: ${operation} took ${duration}ms`, null, 'PERF');
    };
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

// Named exports for convenience
export const {
  error,
  warn,
  info,
  debug,
  success,
  apiRequest,
  apiResponse,
  apiError,
  userAction,
  authEvent,
  navigation,
  componentMount,
  componentUnmount,
  validationError,
  stateChange,
  performanceStart
} = logger;
