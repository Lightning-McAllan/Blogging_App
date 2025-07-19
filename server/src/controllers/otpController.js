import User from '../models/User.js';
import OTP from '../models/OTP.js';
import bcrypt from 'bcryptjs';
import sendOTPEmail from '../utils/sendOTPEmail.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import { otpRateLimiter, forgotPasswordLimiter, otpVerificationLimiter } from '../middleware/rateLimiter.js';

// Development mode detection
const bypassRateLimiting = process.env.NODE_ENV === 'development';

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  logger.debug('Forgot password request', { email, ip: req.ip });

  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please enter a valid email address', 400));
  }

  // Apply rate limiting for forgot password requests
  try {
    await forgotPasswordLimiter.consume(email);
    if (bypassRateLimiting) {
      logger.debug('Forgot password rate limiting bypassed (dev mode)', { email, ip: req.ip });
    }
  } catch (rateLimiterRes) {
    logger.warn('Forgot password rate limited', { email, ip: req.ip });
    return next(new AppError('Too many password reset requests. Please try again later.', 429));
  }

  const user = await User.findOne({ email });
  if (!user) {
    logger.warn('Password reset requested for non-existent user', { email, ip: req.ip });
    return next(new AppError('No account found with this email address', 404));
  }

  if (!user.isEmailVerified) {
    logger.warn('Password reset requested for unverified user', { email, ip: req.ip });
    return next(new AppError('Please verify your email first before resetting password', 400));
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

  const otpRecord = await OTP.create({
    email,
    otp,
    type: 'reset',
    ipAddress
  });

  await sendOTPEmail(email, otp, 'reset', ipAddress);

  logger.info('Password reset OTP sent successfully', { email, ip: req.ip });

  res.json({
    success: true,
    message: 'OTP sent successfully to your email address',
    data: {
      email,
      expiresIn: '5 minutes'
    }
  });
});

export const verifyResetOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  logger.debug('Verifying reset OTP', { email, ip: req.ip });

  if (!email || !otp) {
    return next(new AppError('Email and OTP are required', 400));
  }

  if (!/^\d{6}$/.test(otp)) {
    return next(new AppError('OTP must be a 6-digit number', 400));
  }

  // Apply rate limiting for OTP verification attempts
  try {
    await otpVerificationLimiter.consume(`verify_${email}`);
    if (bypassRateLimiting) {
      logger.debug('OTP verification rate limiting bypassed (dev mode)', { email, ip: req.ip });
    }
  } catch (rateLimiterRes) {
    logger.warn('OTP verification rate limited', { email, ip: req.ip });
    return next(new AppError('Too many verification attempts. Please try again later.', 429));
  }

  // NOTE: OTP verification logic is NOT bypassed in development - security is maintained
  const otpRecord = await OTP.findOne({
    email,
    otp,
    type: 'reset',
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
  });

  if (!otpRecord) {
    logger.warn('Invalid or expired OTP verification attempt', { email, otp, ip: req.ip });
    return next(new AppError('Invalid or expired OTP. Please request a new one.', 400));
  }

  if (otpRecord.attempts >= 3) {
    await OTP.deleteOne({ _id: otpRecord._id });
    logger.warn('OTP verification failed - too many attempts', { email, ip: req.ip });
    return next(new AppError('Too many failed attempts. Please request a new OTP.', 400));
  }

  await OTP.findByIdAndUpdate(otpRecord._id, {
    $inc: { attempts: 1 },
    verified: true
  });

  logger.info('Reset OTP verified successfully', { email, ip: req.ip });

  res.json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      email,
      verified: true
    }
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  logger.debug('Password reset attempt', { email, ip: req.ip });

  if (!email || !otp || !newPassword) {
    return next(new AppError('Email, OTP, and new password are required', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  if (!/^\d{6}$/.test(otp)) {
    return next(new AppError('OTP must be a 6-digit number', 400));
  }

  // Apply rate limiting for password reset attempts
  try {
    await otpVerificationLimiter.consume(`reset_${email}`);
    if (bypassRateLimiting) {
      logger.debug('Password reset rate limiting bypassed (dev mode)', { email, ip: req.ip });
    }
  } catch (rateLimiterRes) {
    logger.warn('Password reset rate limited', { email, ip: req.ip });
    return next(new AppError('Too many password reset attempts. Please try again later.', 429));
  }

  // NOTE: OTP verification logic is NOT bypassed in development - security is maintained
  const otpRecord = await OTP.findOne({
    email,
    otp,
    type: 'reset',
    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
  });

  if (!otpRecord) {
    logger.warn('Invalid or expired OTP for password reset', { email, ip: req.ip });
    return next(new AppError('Invalid or expired OTP. Please request a new one.', 400));
  }

  if (otpRecord.attempts >= 3) {
    await OTP.deleteOne({ _id: otpRecord._id });
    logger.warn('Password reset failed - OTP used too many times', { email, ip: req.ip });
    return next(new AppError('OTP has been used too many times. Please request a new one.', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    logger.error('User not found during password reset', { email, ip: req.ip });
    return next(new AppError('User not found', 404));
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await User.findOneAndUpdate(
    { email },
    {
      password: hashedPassword,
      loginAttempts: 0,
      blockExpires: null
    }
  );

  await OTP.deleteOne({ _id: otpRecord._id });

  logger.info('Password reset completed successfully', { email, ip: req.ip });

  res.json({
    success: true,
    message: 'Password reset successfully. You can now login with your new password.',
    data: {
      email,
      passwordUpdated: true
    }
  });
});