import express from 'express';
import { forgotPassword, verifyResetOtp, resetPassword } from '../controllers/otpController.js';
import { globalErrorHandler } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Use global error handler for OTP routes
router.use(globalErrorHandler);

logger.info('OTP routes initialized successfully');

export default router;