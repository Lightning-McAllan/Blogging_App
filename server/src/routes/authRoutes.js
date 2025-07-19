import express from 'express';
import passport from 'passport';
import {
  loginUser, registerUser, verifySignup, resendOTP,
  verifyPassword, setPassword, changePassword, googleAuthCallback
} from '../controllers/authController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import authenticateToken from '../middleware/authenticateToken.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

const router = express.Router();

logger.info('Initializing auth routes...');

const authLimiter = rateLimiter(15 * 60 * 1000, 5);

router.post('/set-password', authenticateToken, setPassword);
router.post('/login', authLimiter, loginUser);
router.post('/register', authLimiter, registerUser);
router.post('/verify-signup', authLimiter, verifySignup);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/verify-password', authenticateToken, verifyPassword);
router.post('/change-password', authenticateToken, changePassword);

router.get('/google',
  (req, res, next) => {
    logger.debug('Initiating Google OAuth flow', { ip: req.ip });
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    accessType: 'offline',
    prompt: 'consent'
  })
);

router.get('/google/callback',
  (req, res, next) => {
    logger.debug('Google OAuth callback received', { 
      ip: req.ip,
      query: req.query 
    });
    next();
  },
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false
  }),
  (err, req, res, next) => {
    if (err) {
      logger.error('Passport authentication error', { 
        error: err.message,
        ip: req.ip 
      });
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
    next();
  },
  googleAuthCallback
);

logger.info('Auth routes initialized successfully');

export default router;