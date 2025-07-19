import apiClient from './apiService.js';
import logger from '../utils/logger.js';

const blogService = {
  fetchAll: async () => {
    try {
      const response = await apiClient.get('/blogs');
      const blogs = response.blogs || response;

      logger.success(`Fetched ${blogs.length} blogs`, null, 'BLOG_SERVICE');
      return blogs.map((blog) => ({
        ...blog,
        _id: blog._id || blog.id,
      }));
    } catch (error) {
      logger.error('Error fetching blogs', error, 'BLOG_SERVICE');
      throw error;
    }
  },

  fetchById: async (blogId) => {
    try {
      logger.debug(`Fetching blog by ID: ${blogId}`, null, 'BLOG_SERVICE');
      const response = await apiClient.get(`/blogs/${blogId}`);
      logger.success(`Fetched blog: ${response.title}`, { id: blogId }, 'BLOG_SERVICE');
      return response;
    } catch (error) {
      logger.error(`Error fetching blog by ID: ${blogId}`, error, 'BLOG_SERVICE');
      throw error;
    }
  },

  // New method to fetch blogs by user ID
  fetchByUserId: async (userId) => {
    try {
      logger.debug(`Fetching blogs for user: ${userId}`, null, 'BLOG_SERVICE');
      const response = await apiClient.get(`/blogs/user/${userId}`);
      const blogs = response.blogs || response;

      logger.success(`Fetched ${blogs.length} blogs for user`, { userId }, 'BLOG_SERVICE');
      return blogs.map((blog) => ({
        ...blog,
        _id: blog._id || blog.id,
      }));
    } catch (error) {
      logger.error(`Error fetching blogs by user ID: ${userId}`, error, 'BLOG_SERVICE');
      throw error;
    }
  },

  create: async (blogData) => {
    try {
      logger.debug('Creating new blog', { title: blogData.title }, 'BLOG_SERVICE');
      const response = await apiClient.post('/blogs', blogData);
      logger.success('Blog created successfully', { id: response._id || response.id }, 'BLOG_SERVICE');
      return response;
    } catch (error) {
      logger.error('Error creating blog', error, 'BLOG_SERVICE');
      throw error;
    }
  },

  update: async (blogId, blogData) => {
    try {
      logger.debug(`Updating blog: ${blogId}`, { title: blogData.title }, 'BLOG_SERVICE');
      const response = await apiClient.put(`/blogs/${blogId}`, blogData);
      logger.success('Blog updated successfully', { id: blogId }, 'BLOG_SERVICE');
      return response;
    } catch (error) {
      logger.error(`Error updating blog: ${blogId}`, error, 'BLOG_SERVICE');
      throw error;
    }
  },

  delete: async (blogId) => {
    try {
      logger.debug(`Deleting blog: ${blogId}`, null, 'BLOG_SERVICE');
      const response = await apiClient.delete(`/blogs/${blogId}`);
      logger.success('Blog deleted successfully', { id: blogId }, 'BLOG_SERVICE');
      return response;
    } catch (error) {
      logger.error(`Error deleting blog: ${blogId}`, error, 'BLOG_SERVICE');
      throw error;
    }
  },

  permanentlyDelete: async (blogId) => {
    try {
      const response = await apiClient.delete(`/blogs/permanent/${blogId}`);
      return response;
    } catch (error) {
      console.error('❌ Error permanently deleting blog:', error.message);
      throw error;
    }
  },

  restore: async (blogId) => {
    try {
      const response = await apiClient.post(`/blogs/restore/${blogId}`);
      return response;
    } catch (error) {
      console.error('❌ Error restoring blog:', error.message);
      throw error;
    }
  },

  incrementView: async (blogId) => {
    try {
      const response = await apiClient.post(`/blogs/increment-view/${blogId}`);
      return response;
    } catch (error) {
      console.error('❌ Error incrementing view:', error.message);
      throw error;
    }
  },

  fetchDeleted: async () => {
    try {
      const response = await apiClient.get('/blogs/deleted');
      const blogs = response.blogs || response;

      return blogs.map((blog) => ({
        ...blog,
        _id: blog._id || blog.id,
      }));
    } catch (error) {
      console.error('❌ Error fetching deleted blogs:', error.message);
      throw error;
    }
  },
};

export default blogService;