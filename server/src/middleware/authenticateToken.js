import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logger.warn('Authentication failed - no token provided', { 
        ip: req.ip, 
        url: req.originalUrl 
      });
      return res.status(401).json({ 
        message: 'Access token required',
        expired: false 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists in database
    const foundUser = await User.findById(decoded.id);
    if (!foundUser) {
      logger.error('Authentication failed - user not found in DB', { 
        userId: decoded.id, 
        ip: req.ip 
      });
      return res.status(401).json({ 
        message: 'User not found',
        expired: false 
      });
    }

    if (!foundUser.isEmailVerified) {
      logger.warn('Authentication failed - account not verified', { 
        userId: decoded.id, 
        ip: req.ip 
      });
      return res.status(403).json({ 
        message: 'Account not verified',
        expired: false 
      });
    }

    // Attach user to request object
    req.user = {
      id: foundUser._id.toString(),
      email: foundUser.email,
      name: foundUser.name,
      isEmailVerified: foundUser.isEmailVerified
    };

    logger.debug('Authentication successful', { 
      userId: req.user.id, 
      url: req.originalUrl 
    });

    next();

  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error.message, 
      ip: req.ip, 
      url: req.originalUrl 
    });

    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expired', { ip: req.ip });
      return res.status(401).json({ 
        message: 'Token expired',
        expired: true 
      });
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token', { ip: req.ip });
      return res.status(401).json({ 
        message: 'Invalid token',
        expired: false 
      });
    }

    if (error.name === 'NotBeforeError') {
      logger.warn('Token not active', { ip: req.ip });
      return res.status(401).json({ 
        message: 'Token not active',
        expired: false 
      });
    }

    // Database or other errors
    logger.error('Database error during authentication', { 
      error: error.message, 
      ip: req.ip 
    });
    return res.status(500).json({ 
      message: 'Internal server error during authentication',
      expired: false 
    });
  }
};

export default authenticateToken;