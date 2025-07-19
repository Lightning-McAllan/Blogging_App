import express from 'express';
import { 
  getBlogByIdWithAuthor, 
  getNonDeletedBlogs, 
  getAllDeletedBlogsByUser, 
  createBlog, 
  updateBlog, 
  safeDeleteBlog, 
  permanentlyDeleteBlog, 
  restoreDeletedBlog, 
  incrementBlogView,
  getUserBlogs
} from '../controllers/blogController.js';
import authenticateToken from '../middleware/authenticateToken.js';
import { globalErrorHandler } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Routes
router.get('/user/:userId', authenticateToken, getUserBlogs);
router.get('/', authenticateToken, getNonDeletedBlogs);
router.get('/deleted', authenticateToken, getAllDeletedBlogsByUser);
router.post('/increment-view/:id', authenticateToken, incrementBlogView);
router.get('/:id', authenticateToken, getBlogByIdWithAuthor);
router.post('/', authenticateToken, createBlog);
router.put('/:id', authenticateToken, updateBlog);
router.delete('/:id', authenticateToken, safeDeleteBlog);
router.delete('/permanent/:id', authenticateToken, permanentlyDeleteBlog);
router.post('/restore/:id', authenticateToken, restoreDeletedBlog);

// Use global error handler for blog routes
router.use(globalErrorHandler);

logger.info('Blog routes initialized successfully');

export default router;