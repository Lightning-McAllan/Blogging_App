import { RateLimiterMemory } from 'rate-limiter-flexible';
import logger from '../utils/logger.js';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const bypassRateLimiting = process.env.BYPASS_RATE_LIMITING === 'true' || isDevelopment;

export const rateLimiter = (windowMs, max) => {
  // In development or when bypass is enabled, return a no-op middleware
  if (bypassRateLimiting) {
    logger.warn('⚠️ Rate limiting BYPASSED for development environment', {
      NODE_ENV: process.env.NODE_ENV,
      BYPASS_RATE_LIMITING: process.env.BYPASS_RATE_LIMITING
    });
    
    return (req, res, next) => {
      logger.debug('Rate limit bypassed (dev mode)', { ip: req.ip, url: req.originalUrl });
      next();
    };
  }

  const rateLimiter = new RateLimiterMemory({
    points: max,
    duration: windowMs / 1000,
    blockDuration: 60 * 15
  });

  return async (req, res, next) => {
    try {
      const key = req.ip;
      await rateLimiter.consume(key);
      logger.debug('Rate limit check passed', { ip: req.ip, url: req.originalUrl });
      next();
    } catch (error) {
      const secondsBeforeNext = Math.ceil(error.msBeforeNext / 1000);
      logger.warn('Rate limit exceeded', { 
        ip: req.ip, 
        url: req.originalUrl,
        secondsBeforeNext 
      });
      
      res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${secondsBeforeNext} seconds.`
      });
    }
  };
};

// Create development-aware rate limiters
export const otpRateLimiter = bypassRateLimiting ? {
  consume: async () => {
    logger.debug('OTP rate limiting bypassed (dev mode)');
    return Promise.resolve();
  }
} : new RateLimiterMemory({
  points: 3, 
  duration: 15 * 60,
  blockDuration: 60 * 60
});

export const forgotPasswordLimiter = bypassRateLimiting ? {
  consume: async () => {
    logger.debug('Forgot password rate limiting bypassed (dev mode)');
    return Promise.resolve();
  }
} : new RateLimiterMemory({
  points: 5,
  duration: 60 * 60,
  blockDuration: 60 * 60
});

export const otpVerificationLimiter = bypassRateLimiting ? {
  consume: async () => {
    logger.debug('OTP verification rate limiting bypassed (dev mode)');
    return Promise.resolve();
  }
} : new RateLimiterMemory({
  points: 5, // 5 attempts per window
  duration: 10 * 60, // 10 minutes window
  blockDuration: 30 * 60 // 30 minutes block
});

// Log rate limiter status on startup
if (bypassRateLimiting) {
  logger.warn('🚨 Rate limiting is DISABLED for development environment');
  logger.warn('   - OTP requests: BYPASSED');
  logger.warn('   - Forgot password: BYPASSED');
  logger.warn('   - OTP verification: BYPASSED');
  logger.warn('   - NOTE: OTP validation logic remains SECURE');
} else {
  logger.info('🛡️ Rate limiting is ENABLED for production environment');
  logger.info('   - OTP requests: 3 per 15 min');
  logger.info('   - Forgot password: 5 per hour');
  logger.info('   - OTP verification: 5 per 10 min');
}

logger.info('Rate limiter middleware initialized');