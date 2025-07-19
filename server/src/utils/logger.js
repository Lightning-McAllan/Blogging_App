// Console logger utility with colored output
class Logger {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
    };
  }

  getTimestamp() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    let formattedMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      formattedMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return formattedMessage;
  }

  info(message, meta = {}) {
    const formatted = this.formatMessage(
      `${this.colors.green}INFO${this.colors.reset}`, 
      message, 
      meta
    );
    console.log(formatted);
  }

  error(message, meta = {}) {
    const formatted = this.formatMessage(
      `${this.colors.red}ERROR${this.colors.reset}`, 
      message, 
      meta
    );
    console.error(formatted);
  }

  warn(message, meta = {}) {
    const formatted = this.formatMessage(
      `${this.colors.yellow}WARN${this.colors.reset}`, 
      message, 
      meta
    );
    console.warn(formatted);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage(
        `${this.colors.blue}DEBUG${this.colors.reset}`, 
        message, 
        meta
      );
      console.log(formatted);
    }
  }

  http(message, meta = {}) {
    const formatted = this.formatMessage(
      `${this.colors.magenta}HTTP${this.colors.reset}`, 
      message, 
      meta
    );
    console.log(formatted);
  }
}

const logger = new Logger();

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
    };

    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    } else {
      logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    }
  });

  next();
};

export default logger;
