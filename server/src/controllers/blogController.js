import Blog from '../models/Blog.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const getBlogByIdWithAuthor = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  logger.debug('Fetching blog by ID', { blogId: id, userId: req.user.id });

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid blog ID format', 400));
  }

  const blog = await Blog.findOne({
    _id: id,
    isDeleted: false
  }).populate('author', 'name email');

  if (!blog) {
    logger.warn('Blog not found', { blogId: id, userId: req.user.id });
    return next(new AppError('Blog not found', 404));
  }

  logger.info('Blog fetched successfully', { blogId: id, userId: req.user.id });
  res.json(blog);
});

export const getNonDeletedBlogs = catchAsync(async (req, res, next) => {
  logger.debug('Fetching all non-deleted blogs', { userId: req.user.id });

  const blogs = await Blog.find({ isDeleted: false })
    .populate('author', 'name email')
    .sort({ createdAt: -1 });

  logger.info('Blogs fetched successfully', { 
    count: blogs.length, 
    userId: req.user.id 
  });

  res.json(blogs);
});

export const getAllDeletedBlogsByUser = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  logger.debug('Fetching deleted blogs for user', { userId });

  if (!isValidObjectId(userId)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  const deletedBlogs = await Blog.find({
    author: userId,
    isDeleted: true
  }).populate('author', 'name email').sort({ updatedAt: -1 });

  logger.info('Deleted blogs fetched successfully', { 
    count: deletedBlogs.length, 
    userId 
  });

  res.json(deletedBlogs);
});

export const createBlog = catchAsync(async (req, res, next) => {
  const { title, content } = req.body;
  const userId = req.user.id;

  logger.debug('Creating new blog', { userId, title: title?.substring(0, 50) });

  if (!title || !content) {
    return next(new AppError('Title and content are required', 400));
  }

  if (!isValidObjectId(userId)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  const newBlog = new Blog({
    title: title.trim(),
    content: content.trim(),
    author: userId
  });

  const savedBlog = await newBlog.save();
  const populatedBlog = await Blog.findById(savedBlog._id).populate('author', 'name email');

  logger.info('Blog created successfully', { 
    blogId: savedBlog._id, 
    userId, 
    title: title.substring(0, 50) 
  });

  res.status(201).json(populatedBlog);
});

export const updateBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const userId = req.user.id;

  logger.debug('Updating blog', { blogId: id, userId });

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid blog ID format', 400));
  }

  if (!title || !content) {
    return next(new AppError('Title and content are required', 400));
  }

  const blog = await Blog.findOne({ _id: id, isDeleted: false });

  if (!blog) {
    logger.warn('Blog not found for update', { blogId: id, userId });
    return next(new AppError('Blog not found', 404));
  }

  if (blog.author.toString() !== userId) {
    logger.warn('Unauthorized blog update attempt', { blogId: id, userId, authorId: blog.author });
    return next(new AppError('Not authorized to update this blog', 403));
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    id,
    { title: title.trim(), content: content.trim() },
    { new: true }
  ).populate('author', 'name email');

  logger.info('Blog updated successfully', { blogId: id, userId });

  res.json({
    success: true,
    message: 'Blog updated successfully',
    blog: updatedBlog
  });
});

export const safeDeleteBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  logger.debug('Soft deleting blog', { blogId: id, userId });

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid blog ID format', 400));
  }

  const blog = await Blog.findOne({ _id: id, isDeleted: false });

  if (!blog) {
    logger.warn('Blog not found for deletion', { blogId: id, userId });
    return next(new AppError('Blog not found', 404));
  }

  if (blog.author.toString() !== userId) {
    logger.warn('Unauthorized blog deletion attempt', { blogId: id, userId, authorId: blog.author });
    return next(new AppError('Not authorized to delete this blog', 403));
  }

  blog.isDeleted = true;
  await blog.save();

  logger.info('Blog moved to trash successfully', { blogId: id, userId });

  res.json({ message: 'Blog moved to trash successfully' });
});

export const permanentlyDeleteBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  logger.debug('Permanently deleting blog', { blogId: id, userId });

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid blog ID format', 400));
  }

  const blog = await Blog.findOne({ _id: id, isDeleted: true });

  if (!blog) {
    logger.warn('Blog not found in trash for permanent deletion', { blogId: id, userId });
    return next(new AppError('Blog not found in trash', 404));
  }

  if (blog.author.toString() !== userId) {
    logger.warn('Unauthorized permanent blog deletion attempt', { blogId: id, userId, authorId: blog.author });
    return next(new AppError('Not authorized to permanently delete this blog', 403));
  }

  await Blog.findByIdAndDelete(id);

  logger.info('Blog permanently deleted successfully', { blogId: id, userId });

  res.json({ message: 'Blog permanently deleted successfully' });
});

export const restoreDeletedBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  logger.debug('Restoring deleted blog', { blogId: id, userId });

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid blog ID format', 400));
  }

  const blog = await Blog.findOne({ _id: id, isDeleted: true });

  if (!blog) {
    logger.warn('Blog not found in trash for restoration', { blogId: id, userId });
    return next(new AppError('Blog not found in trash', 404));
  }

  if (blog.author.toString() !== userId) {
    logger.warn('Unauthorized blog restoration attempt', { blogId: id, userId, authorId: blog.author });
    return next(new AppError('Not authorized to restore this blog', 403));
  }

  blog.isDeleted = false;
  await blog.save();

  const restoredBlog = await Blog.findById(id).populate('author', 'name email');

  logger.info('Blog restored successfully', { blogId: id, userId });

  res.json({
    message: 'Blog restored successfully',
    blog: restoredBlog
  });
});

export const incrementBlogView = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  logger.debug('Incrementing blog view', { blogId: id, userId: req.user.id });

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid blog ID format', 400));
  }

  const blog = await Blog.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!blog) {
    logger.warn('Blog not found for view increment', { blogId: id, userId: req.user.id });
    return next(new AppError('Blog not found', 404));
  }

  logger.debug('Blog view incremented', { blogId: id, newViews: blog.views });

  res.json({ views: blog.views });
});

export const deleteUserAllBlogs = async (userId) => {
  logger.info('Deleting all blogs for user', { userId });
  const result = await Blog.deleteMany({ author: userId });
  logger.info('User blogs deleted', { userId, deletedCount: result.deletedCount });
  return result;
};

export const getUserBlogs = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  logger.debug('Fetching user blogs', { targetUserId: userId, requestUserId: req.user.id });

  if (!isValidObjectId(userId)) {
    return next(new AppError('Invalid user ID format', 400));
  }

  const blogs = await Blog.find({ 
    author: userId, 
    isDeleted: false 
  }).populate('author', 'name email').sort({ createdAt: -1 });

  logger.info('User blogs fetched successfully', { 
    targetUserId: userId, 
    count: blogs.length, 
    requestUserId: req.user.id 
  });

  res.json(blogs);
});