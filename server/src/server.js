import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import usersRoutes from './routes/usersRoutes.js';
import blogsRoutes from './routes/blogsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import initMiddleware from './middleware/initMiddleware.js';
import './config/passport.js';
import cron from 'node-cron';
import User from './models/User.js';
import OTP from './models/OTP.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import logger, { requestLogger } from './utils/logger.js';
import { globalErrorHandler } from './utils/errorHandler.js';
import AppError from './utils/AppError.js';
import accountCleanupService from './utils/accountCleanupService.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', true);

// Database connection
await connectDB()
  .then(() => {
    logger.info("Database connected successfully");
    
    // Start account cleanup service after DB connection
    logger.info("🚀 Starting account cleanup service for unverified accounts");
    accountCleanupService.start();
  })
  .catch(err => {
    logger.error("Database connection error", { error: err.message });
    process.exit(1);
  });

// Initialize middleware
initMiddleware(app);

// Add request logging middleware
app.use(requestLogger);

app.use(passport.initialize());
app.use(passport.session());

// Cron job for cleanup
cron.schedule('0 0 * * *', async () => {
  try {
    logger.info("Running scheduled cleanup tasks");
    
    const deletedOTPs = await OTP.deleteMany({ 
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    
    const unlockedUsers = await User.updateMany(
      { blockExpires: { $lt: new Date() } },
      { $set: { loginAttempts: 0, blockExpires: null } }
    );

    logger.info("Cleanup completed", { 
      deletedOTPs: deletedOTPs.deletedCount,
      unlockedUsers: unlockedUsers.modifiedCount 
    });
  } catch (error) {
    logger.error("Cleanup task failed", { error: error.message });
  }
});

// Routes
app.use("/api/users", usersRoutes);
app.use("/api/blogs", blogsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", otpRoutes);

// Admin/Debug endpoint for cleanup stats
app.get('/api/admin/cleanup-stats', async (req, res) => {
  try {
    const stats = await accountCleanupService.getCleanupStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching cleanup stats', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cleanup statistics'
    });
  }
});

// Manual cleanup trigger (for testing)
app.post('/api/admin/manual-cleanup', async (req, res) => {
  try {
    await accountCleanupService.manualCleanup();
    res.json({
      success: true,
      message: 'Manual cleanup completed'
    });
  } catch (error) {
    logger.error('Error during manual cleanup', error);
    res.status(500).json({
      success: false,
      message: 'Error during manual cleanup'
    });
  }
});

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT signal, shutting down gracefully...');
  
  // Stop cleanup service
  accountCleanupService.stop();
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM signal, shutting down gracefully...');
  
  // Stop cleanup service
  accountCleanupService.stop();
  
  process.exit(0);
});