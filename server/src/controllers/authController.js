import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import OTP from '../models/OTP.js';
import sendOTPEmail from '../utils/sendOTPEmail.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { otpVerificationLimiter } from '../middleware/rateLimiter.js';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const bypassRateLimiting = process.env.BYPASS_RATE_LIMITING === 'true' || isDevelopment;

const otpRateLimiter = bypassRateLimiting ? {
  consume: async () => {
    return Promise.resolve();
  }
} : new RateLimiterMemory({
  points: 3,
  duration: 15 * 60,
});

import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';

export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  logger.debug('Login attempt', { email, ip: req.ip });

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  const user = await User.findOne({ email }).select('+password +loginAttempts +blockExpires');

  // Skip user-level blocking in development
  if (!bypassRateLimiting && user?.blockExpires && user.blockExpires > Date.now()) {
    const minutesLeft = Math.ceil((user.blockExpires - Date.now()) / 60000);
    logger.warn('Blocked user login attempt', { email, ip: req.ip, minutesLeft });
    return next(new AppError(`Account temporarily locked. Try again after ${minutesLeft} minutes`, 429));
  } else if (bypassRateLimiting && user?.blockExpires && user.blockExpires > Date.now()) {
    logger.debug('User blocking bypassed (dev mode)', { email, ip: req.ip });
  }

  if (!user) {
    logger.warn('Login failed - user not found', { email, ip: req.ip });
    return next(new AppError('User not found. Please check details or sign up', 404));
  }

  if (!user.isEmailVerified) {
    logger.warn('Login failed - email not verified', { email, ip: req.ip });
    return next(new AppError('Email not verified. Please verify your email before logging in.', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Skip login attempt tracking in development
    if (!bypassRateLimiting) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.blockExpires = Date.now() + 30 * 60 * 1000;
        await user.save();
        logger.warn('Account locked due to failed attempts', { email, ip: req.ip });
        return next(new AppError('Too many failed attempts. Account locked for 30 minutes.', 429));
      }

      await user.save();
      logger.warn('Login failed - invalid password', { email, ip: req.ip, attempts: user.loginAttempts });
    } else {
      logger.debug('Login attempt tracking bypassed (dev mode)', { email, ip: req.ip });
    }
    
    return next(new AppError('Invalid password', 401));
  }

  // Reset login attempts on successful login (only if not bypassed)
  if (!bypassRateLimiting) {
    user.loginAttempts = 0;
    user.blockExpires = undefined;
    await user.save();
  }

  const token = jwt.sign({
    id: user._id,
    email: user.email
  }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  logger.info('User login successful', { 
    userId: user._id, 
    email: user.email, 
    ip: req.ip 
  });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      age: user.age
    }
  });
});

export const registerUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, age } = req.body;

  logger.debug('Registration attempt', { email, ip: req.ip });

  if (!email || !password || !firstName || !lastName || !age) {
    return next(new AppError('All fields are required', 422));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn('Registration failed - user already exists', { email, ip: req.ip });
    return next(new AppError('User already exists. Please login instead.', 409));
  }

  try {
    await otpRateLimiter.consume(email);
    if (bypassRateLimiting) {
      logger.debug('OTP rate limiting bypassed (dev mode)', { email, ip: req.ip });
    }
  } catch (rateLimiterRes) {
    logger.warn('Registration rate limited', { email, ip: req.ip });
    return next(new AppError('Too many OTP requests. Please try again later.', 429));
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  await OTP.create({ email, otp, type: 'signup', ipAddress });
  await sendOTPEmail(email, otp, 'signup', ipAddress);

  const user = await User.create({
    name: `${firstName} ${lastName}`,
    email,
    password,
    age: parseInt(age),
    isEmailVerified: false
  });

  logger.info('User registration initiated', { 
    userId: user._id, 
    email: user.email, 
    ip: req.ip 
  });

  res.status(201).json({
    success: true,
    message: 'OTP sent to your email',
    email
  });
});

export const verifySignup = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  logger.debug('OTP verification attempt', { email, ip: req.ip });

  if (!email || !otp) {
    return next(new AppError('Email and OTP are required', 400));
  }

  // Apply rate limiting for signup verification attempts
  try {
    await otpVerificationLimiter.consume(`verify_signup_${email}`);
    if (bypassRateLimiting) {
      logger.debug('Signup verification rate limiting bypassed (dev mode)', { email, ip: req.ip });
    }
  } catch (rateLimiterRes) {
    logger.warn('Signup verification rate limited', { email, ip: req.ip });
    return next(new AppError('Too many verification attempts. Please try again later.', 429));
  }

  // NOTE: OTP verification logic is NOT bypassed in development - security is maintained
  const otpRecord = await OTP.findOneAndDelete({
    email,
    otp,
    type: 'signup',
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes expiry
  });

  if (!otpRecord) {
    logger.warn('OTP verification failed - invalid or expired', { email, ip: req.ip });
    return next(new AppError('Invalid or expired OTP', 400));
  }

  const user = await User.findOneAndUpdate(
    { email },
    { 
      isEmailVerified: true,
      registrationExpires: null // Clear registration expiry when verified
    },
    { new: true }
  );

  if (!user) {
    logger.error('User not found during OTP verification', { email, ip: req.ip });
    return next(new AppError('User not found', 404));
  }

  const token = jwt.sign({
    id: user._id,
    email: user.email
  }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  logger.info('Email verification successful', { 
    userId: user._id, 
    email: user.email, 
    ip: req.ip 
  });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      age: user.age
    }
  });
});

export const resendOTP = catchAsync(async (req, res, next) => {
  const { email, type } = req.body;

  logger.debug('OTP resend request', { email, type, ip: req.ip });

  if (!email || !type) {
    return next(new AppError('Email and type are required', 400));
  }

  if (!['signup', 'reset'].includes(type)) {
    return next(new AppError('Invalid OTP type', 400));
  }

  try {
    await otpRateLimiter.consume(`${email}:${type}`);
  } catch (rateLimiterRes) {
    logger.warn('OTP resend rate limited', { email, type, ip: req.ip });
    return next(new AppError('Too many OTP requests. Please try again later.', 429));
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  
  await OTP.findOneAndUpdate(
    { email, type },
    { otp, createdAt: new Date(), ipAddress },
    { upsert: true }
  );

  await sendOTPEmail(email, otp, type, ipAddress);

  logger.info('OTP resent successfully', { email, type, ip: req.ip });

  res.json({
    success: true,
    message: 'OTP resent successfully'
  });
});

export const verifyPassword = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { password } = req.body;

  logger.debug('Password verification attempt', { userId, ip: req.ip });

  if (!password) {
    return next(new AppError('Password is required', 400));
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    logger.error('User not found during password verification', { userId, ip: req.ip });
    return next(new AppError('User not found', 404));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    logger.warn('Password verification failed', { userId, ip: req.ip });
    return next(new AppError('Incorrect password', 401));
  }

  logger.info('Password verification successful', { userId, ip: req.ip });

  res.status(200).json({
    success: true,
    message: 'Password verified'
  });
});

export const setPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;
  const userId = req.user.id;

  logger.debug('Set password attempt', { userId, ip: req.ip });

  if (!newPassword || newPassword.length < 8) {
    return next(new AppError('Password must be at least 8 characters', 400));
  }

  req.user.password = newPassword;
  await req.user.save();

  logger.info('Password set successfully', { userId, ip: req.ip });

  res.json({ 
    success: true, 
    message: 'Password set successfully' 
  });
});

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  logger.debug('Change password attempt', { userId, ip: req.ip });

  if (!currentPassword || !newPassword) {
    return next(new AppError('Current password and new password are required', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters', 400));
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    logger.error('User not found during password change', { userId, ip: req.ip });
    return next(new AppError('User not found', 404));
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    logger.warn('Password change failed - incorrect current password', { userId, ip: req.ip });
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  logger.info('Password changed successfully', { userId, ip: req.ip });

  res.json({ 
    success: true, 
    message: 'Password changed successfully' 
  });
});

export const googleAuthCallback = catchAsync(async (req, res, next) => {
  logger.debug('Google auth callback processing', { ip: req.ip });

  if (req.query.error) {
    logger.error('Google OAuth error', { 
      error: req.query.error, 
      ip: req.ip 
    });
    return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
  }

  if (!req.user) {
    logger.error('No user returned from Google auth', { ip: req.ip });
    return res.redirect(`${process.env.CLIENT_URL}/login?error=no_user`);
  }

  const token = jwt.sign({
    id: req.user._id,
    email: req.user.email
  }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  const userData = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    authMethod: req.user.authMethod
  };

  logger.info('Google OAuth successful', { 
    userId: req.user._id, 
    email: req.user.email, 
    ip: req.ip 
  });

  const redirectUrl = `${process.env.CLIENT_URL}/google-auth?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
  logger.debug('Redirecting to client', { redirectUrl });

  return res.redirect(redirectUrl);
});