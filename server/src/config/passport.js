import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    proxy: true,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {      
      if (!profile.emails || !profile.emails[0]) {
        logger.error('Google OAuth - No email found in profile', { 
          profileId: profile.id 
        });
        throw new Error('No email found in Google profile');
      }

      const email = profile.emails[0].value;
      
      logger.debug('Google OAuth profile received', { 
        email, 
        profileId: profile.id,
        displayName: profile.displayName 
      });
      
      let user = await User.findOne({ email });
      
      if (!user) {
        user = await User.create({
          name: profile.displayName,
          email,
          age: 18, // Default age for Google OAuth users
          isEmailVerified: true,
          authMethod: 'google'
        });
        logger.info('New user created via Google OAuth', { 
          userId: user._id, 
          email: user.email 
        });
      } else {
        // Update existing user to mark as Google auth if not already set
        if (!user.authMethod) {
          user.authMethod = 'google';
          await user.save();
          logger.info('Updated existing user with Google auth method', { 
            userId: user._id, 
            email: user.email 
          });
        }
        logger.debug('Existing user found via Google OAuth', { 
          userId: user._id, 
          email: user.email 
        });
      }
      
      return done(null, user);
    } catch (err) {
      logger.error('Google OAuth error', { 
        error: err.message, 
        stack: err.stack 
      });
      return done(err, null, { message: 'Error processing Google authentication' });
    }
  }
));

// Enhanced serialization
passport.serializeUser((user, done) => {
  logger.debug('Serializing user', { userId: user.id });
  done(null, {
    id: user.id,
    authMethod: user.authMethod
  });
});

// Enhanced deserialization
passport.deserializeUser(async (obj, done) => {
  try {
    const user = await User.findById(obj.id);
    if (!user) {
      logger.warn('User not found during deserialization', { userId: obj.id });
      return done(new Error('User not found'));
    }
    logger.debug('User deserialized successfully', { userId: user._id });
    done(null, user);
  } catch (err) {
    logger.error('Deserialization error', { 
      error: err.message, 
      userId: obj.id 
    });
    done(err);
  }
});