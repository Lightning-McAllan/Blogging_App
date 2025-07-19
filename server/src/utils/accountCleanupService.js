/**
 * Cleanup Service for Unverified Accounts
 * Automatically deletes accounts that haven't been verified within 5 minutes
 */

import User from '../models/User.js';
import OTP from '../models/OTP.js';
import logger from './logger.js';

class AccountCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.cleanupInterval = 60 * 1000; // Run every minute
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Account cleanup service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🧹 Starting account cleanup service', { 
      interval: `${this.cleanupInterval / 1000}s`,
      expiryTime: '5 minutes'
    });

    // Run immediately on start
    this.performCleanup();

    // Set up recurring cleanup
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Account cleanup service is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('🛑 Account cleanup service stopped');
  }

  /**
   * Perform the cleanup of expired unverified accounts
   */
  async performCleanup() {
    try {
      const now = new Date();
      
      // Find accounts that are:
      // 1. Not email verified
      // 2. Past their registration expiry time
      // 3. Not already marked for pending deletion
      const expiredAccounts = await User.find({
        isEmailVerified: false,
        registrationExpires: { $lte: now },
        pendingDeletion: { $ne: true }
      }).select('_id name email registrationExpires createdAt');

      if (expiredAccounts.length === 0) {
        logger.debug('🧹 No expired unverified accounts to clean up');
        return;
      }

      logger.info(`🗑️ Found ${expiredAccounts.length} expired unverified accounts to delete`, {
        count: expiredAccounts.length
      });

      const deletionResults = [];

      for (const account of expiredAccounts) {
        try {
          // Mark for pending deletion first (in case of any issues)
          await User.findByIdAndUpdate(account._id, { 
            pendingDeletion: true 
          });

          // Delete related OTP records first
          const otpDeletionResult = await OTP.deleteMany({ 
            email: account.email 
          });

          // Delete the user account
          const userDeletionResult = await User.findByIdAndDelete(account._id);

          if (userDeletionResult) {
            deletionResults.push({
              userId: account._id,
              email: account.email,
              name: account.name,
              createdAt: account.createdAt,
              expiredAt: account.registrationExpires,
              otpsDeleted: otpDeletionResult.deletedCount,
              status: 'success'
            });

            logger.info('🗑️ Deleted expired unverified account', {
              userId: account._id,
              email: account.email,
              name: account.name,
              ageMinutes: Math.round((now - account.createdAt) / (1000 * 60)),
              otpsDeleted: otpDeletionResult.deletedCount
            });
          } else {
            deletionResults.push({
              userId: account._id,
              email: account.email,
              status: 'failed',
              reason: 'User not found during deletion'
            });

            logger.warn('⚠️ Failed to delete expired account - user not found', {
              userId: account._id,
              email: account.email
            });
          }
        } catch (error) {
          deletionResults.push({
            userId: account._id,
            email: account.email,
            status: 'error',
            error: error.message
          });

          logger.error('❌ Error deleting expired account', error, {
            userId: account._id,
            email: account.email
          });
        }
      }

      // Log summary
      const successCount = deletionResults.filter(r => r.status === 'success').length;
      const failureCount = deletionResults.length - successCount;

      logger.info('🧹 Account cleanup completed', {
        total: expiredAccounts.length,
        successful: successCount,
        failed: failureCount,
        summary: deletionResults
      });

    } catch (error) {
      logger.error('❌ Error during account cleanup process', error);
    }
  }

  /**
   * Manually trigger cleanup (for testing or manual intervention)
   */
  async manualCleanup() {
    logger.info('🔧 Manual account cleanup triggered');
    await this.performCleanup();
  }

  /**
   * Get statistics about pending cleanup
   */
  async getCleanupStats() {
    try {
      const now = new Date();
      
      const stats = await User.aggregate([
        {
          $match: {
            isEmailVerified: false
          }
        },
        {
          $group: {
            _id: null,
            totalUnverified: { $sum: 1 },
            expired: {
              $sum: {
                $cond: [
                  { $lte: ['$registrationExpires', now] },
                  1,
                  0
                ]
              }
            },
            pendingExpiry: {
              $sum: {
                $cond: [
                  { $gt: ['$registrationExpires', now] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalUnverified: 0,
        expired: 0,
        pendingExpiry: 0
      };

      return {
        ...result,
        serviceRunning: this.isRunning,
        nextCleanupIn: this.isRunning ? 
          Math.round((this.cleanupInterval - (Date.now() % this.cleanupInterval)) / 1000) : 
          null
      };
    } catch (error) {
      logger.error('Error getting cleanup stats', error);
      return null;
    }
  }
}

// Create singleton instance
const accountCleanupService = new AccountCleanupService();

export default accountCleanupService;

// Named exports for convenience
export {
  accountCleanupService as cleanupService
};
