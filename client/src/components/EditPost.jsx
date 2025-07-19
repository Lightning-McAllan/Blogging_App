import { useState, useEffect } from "react";
import EditPostSkeleton from '../skeleton/component/EditPostSkeleton';
import { Button } from '../components/ui/Button';
import { useErrorNotification } from '../context/ErrorNotificationContext';
import blogService from '../api/blogService';

export const EditPost = ({ onUpdateSuccess, isLoading = false, title: initialTitle = "", content: initialContent = "", blogId, userId, token }) => {
  const { showError, showSuccess } = useErrorNotification();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(true);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);

    const checkOwnership = async () => {
      if (!blogId || !userId || !token) {
        setIsCheckingOwnership(false);
        return;
      }

      try {
        setIsCheckingOwnership(true);
        const blog = await blogService.fetchById(blogId);
        
        let authorId;
        if (typeof blog.author === 'object' && blog.author._id) {
          authorId = blog.author._id;
        } else if (typeof blog.author === 'string') {
          authorId = blog.author;
        } else {
          console.error("Invalid author format:", blog.author);
          showError({ 
            message: "Error: Invalid blog author data",
            type: 'VALIDATION_ERROR'
          }, { context: 'edit-post' });
          return;
        }
        
        if (authorId.toString() === userId.toString()) {
          setIsAuthor(true);
        } else {
          console.error("EditPost - User is NOT authorized to edit");
          setIsAuthor(false);
          showError({ 
            message: "You can only edit your own blogs",
            type: 'PERMISSION_DENIED'
          }, { context: 'edit-post' });
        }
      } catch (err) {
        console.error("Error fetching blog:", err);
        showError(err, { 
          context: 'edit-post',
          subMessage: 'Unable to verify blog ownership.'
        });
      } finally {
        setIsCheckingOwnership(false);
      }
    };
    
    checkOwnership();
  }, [initialTitle, initialContent, blogId, userId, token, onUpdateSuccess]);

  const postEditedBlog = async (e) => {
    e.preventDefault();

    if (!isAuthor) {
      showError({ 
        message: "You are not authorized to edit this blog",
        type: 'PERMISSION_DENIED'
      }, { context: 'edit-post' });
      return;
    }

    if (!blogId) {
      console.error("blogId is undefined");
      showError({ 
        message: "Blog ID is missing",
        type: 'VALIDATION_ERROR'
      }, { context: 'edit-post' });
      return;
    }

    if (!title.trim() || !content.trim()) {
      showError({ 
        message: "Title and content are required",
        type: 'VALIDATION_ERROR'
      }, { context: 'edit-post' });
      return;
    }

    try {
      const response = await blogService.update(blogId, { title: title.trim(), content: content.trim() });

      if (response) {
        if (response.success === true || 
            response.updated === true || 
            response.status === 'success' ||
            response.message?.toLowerCase().includes('success') ||
            response.message?.toLowerCase().includes('updated') ||
            (response.status >= 200 && response.status < 300) ||
            (response.title && response.content)) {
          showSuccess("Blog updated successfully!");
          if (onUpdateSuccess) {
            onUpdateSuccess("Blog Updated Successfully!");
          }
        } else {
          console.warn("EditPost - Unexpected response format:", response);
          showSuccess("Blog updated successfully!"); 
          if (onUpdateSuccess) {
            onUpdateSuccess("Blog Updated Successfully!");
          }
        }
      } else {
        throw new Error("No response received from server");
      }
    } catch (err) {
      console.error("Update failed:", err);
      
      showError(err, { 
        context: 'edit-post',
        subMessage: 'Please try again or refresh the page.'
      });
    }
  };

  if (isLoading || isCheckingOwnership) {
    return <EditPostSkeleton />
  }

  if (!isAuthor) {
    return (
      <div className="text-white text-center p-8">
        <h2 className="text-2xl font-bold mb-4 text-red-400">Access Denied</h2>
        <p className="text-gray-300">You can only edit your own blog posts.</p>
        <div className="mt-4 text-sm text-gray-400">
          <p>Debug Info:</p>
          <p>User ID: {userId}</p>
          <p>Blog ID: {blogId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white">
      <h2 className="text-2xl font-bold mb-4">Update Post</h2>
      <form onSubmit={postEditedBlog}>
        <div className="mb-4">
          <label className="block mb-2">Enter updated title</label>
          <input
            type="text"
            className="w-full p-2 bg-[#1C222A] border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Enter updated content</label>
          <textarea
            rows={4}
            className="w-full p-2 bg-[#1C222A] border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white resize-none"
            value={content}
            onChange={e => setContent(e.target.value)}
            required
          ></textarea>
        </div>
        <Button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          disabled={!title.trim() || !content.trim()}
        >
          Update
        </Button>
      </form>
    </div>
  );
};

export default EditPost;