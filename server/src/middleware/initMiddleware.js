import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import logger from '../utils/logger.js';

export default function initMiddleware(app) {
  logger.info('Initializing middleware...');

  // Configure CORS to allow requests from the frontend
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173', // Use env variable
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true, // Allow cookies and session data
    })
  );
  logger.debug('CORS middleware configured', { origin: process.env.CLIENT_URL });

  // Parse JSON bodies
  app.use(express.json());
  logger.debug('JSON parser middleware configured');

  // Configure session with MongoStore
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || (() => {
      logger.warn('SESSION_SECRET not found, using default - NOT SECURE for production!');
      return 'your-secret-key';
    })(),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  };

  app.use(session(sessionConfig));
  logger.debug('Session middleware configured', { 
    secure: sessionConfig.cookie.secure,
    maxAge: sessionConfig.cookie.maxAge 
  });

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  logger.debug('Passport middleware configured');

  logger.info('All middleware initialized successfully');
}