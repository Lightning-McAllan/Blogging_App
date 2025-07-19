import User from '../models/User.js';
import { deleteUserAllBlogs } from './blogController.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';

const MAX_DB_TIMEOUT = 10000;

export const createUser = catchAsync(async (req, res, next) => {
  const { name, age } = req.body;

  logger.debug('Creating user', { name, age, ip: req.ip });

  if (!name || age === undefined) {
    return next(new AppError('Name and age are required', 400));
  }

  const user = await User.create({ name, age });
  
  logger.info('User created successfully', { userId: user._id, name });
  
  res.status(201).json({ success: true, user: user.toJSON() });
});

export const getAllUsers = catchAsync(async (req, res, next) => {
  logger.debug('Fetching all users', { requestUserId: req.user.id });

  const users = await User.find().populate('blogs');
  
  logger.info('Users fetched successfully', { 
    count: users.length, 
    requestUserId: req.user.id 
  });
  
  res.status(200).json({ success: true, users: users.map(user => user.toJSON()) });
});

export const getUserById = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  logger.debug('Fetching user by ID', { targetUserId: userId, requestUserId: req.user.id });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Database operation timed out')), MAX_DB_TIMEOUT)
  );

  const userPromise = User.findById(userId)
    .select('-password -__v -loginAttempts -blockExpires')
    .lean();

  const user = await Promise.race([userPromise, timeoutPromise]);

  if (!user) {
    logger.warn('User not found', { targetUserId: userId, requestUserId: req.user.id });
    return next(new AppError('User not found', 404));
  }

  logger.info('User fetched successfully', { targetUserId: userId, requestUserId: req.user.id });
  res.status(200).json({ success: true, user });
});

export const getUsersWithBlogs = catchAsync(async (req, res, next) => {
  logger.debug('Fetching users with blogs', { requestUserId: req.user.id });

  const users = await User.getUsersWithBlogs();
  
  logger.info('Users with blogs fetched successfully', { 
    count: users.length, 
    requestUserId: req.user.id 
  });
  
  res.status(200).json({ success: true, users: users.map(user => user.toJSON()) });
});

export const getUsersWithoutBlogs = catchAsync(async (req, res, next) => {
  logger.debug('Fetching users without blogs', { requestUserId: req.user.id });

  const users = await User.getUsersWithoutBlogs();
  
  logger.info('Users without blogs fetched successfully', { 
    count: users.length, 
    requestUserId: req.user.id 
  });
  
  res.status(200).json({ success: true, users: users.map(user => user.toJSON()) });
});

export const getCurrentUserProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  logger.debug('Fetching current user profile', { userId });

  if (!userId) {
    return next(new AppError('User ID not available from token', 400));
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Database operation timed out')), MAX_DB_TIMEOUT)
  );

  const userPromise = User.findById(userId)
    .select('-password -__v -loginAttempts -blockExpires')
    .lean();

  const user = await Promise.race([userPromise, timeoutPromise]);

  if (!user) {
    logger.warn('Current user not found', { userId });
    return next(new AppError('User not found', 404));
  }

  logger.info('Current user profile fetched successfully', { userId });
  res.status(200).json({ success: true, user });
});

export const updateUserProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { firstName, lastName, email, age, about } = req.body;

  logger.debug('Updating user profile', { userId, email });

  if (!userId) {
    return next(new AppError('User ID not found in token', 400));
  }

  const updateData = {};

  if (firstName !== undefined || lastName !== undefined) {
    const currentUser = await User.findById(userId);
    let currentFirstName = currentUser?.name?.split(' ')[0] || '';
    let currentLastName = currentUser?.name?.split(' ').slice(1).join(' ') || '';

    updateData.name = [
      firstName !== undefined ? firstName : currentFirstName,
      lastName !== undefined ? lastName : currentLastName
    ].join(' ').trim();
  }

  if (email !== undefined) updateData.email = email;
  if (age !== undefined) updateData.age = parseInt(age);
  if (about !== undefined) updateData.about = about;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password -__v');

  if (!updatedUser) {
    logger.warn('User not found for update', { userId });
    return next(new AppError('User not found or update failed', 404));
  }

  logger.info('User profile updated successfully', { 
    userId, 
    updatedFields: Object.keys(updateData) 
  });

  res.status(200).json({ 
    success: true, 
    message: 'Profile updated successfully!', 
    user: updatedUser.toJSON() 
  });
});

export const deleteUserById = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const { deleteBlogs } = req.body;
  
  logger.debug('Deleting user', { targetUserId: userId, deleteBlogs, requestUserId: req.user.id });

  const user = await User.findById(userId);

  if (!user) {
    logger.warn('User not found for deletion', { targetUserId: userId, requestUserId: req.user.id });
    return next(new AppError('User not found', 404));
  }

  if (deleteBlogs) {
    logger.info('Deleting user blogs', { targetUserId: userId });
    await deleteUserAllBlogs(userId);
  }

  await User.findByIdAndDelete(userId);
  
  logger.info('User account deleted successfully', { 
    targetUserId: userId, 
    deletedBlogs: deleteBlogs,
    requestUserId: req.user.id 
  });
  
  res.status(200).json({ success: true, message: "Account deleted successfully" });
});
