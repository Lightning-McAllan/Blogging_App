import { useState } from "react";
import { CreatePostSkeleton } from "../skeleton/component/CreatePostSkeleton";
import useAuth from "../hooks/useAuth";
import useErrorHandler from "../hooks/useErrorHandler";
import { useErrorNotification } from "../context/ErrorNotificationContext";
import blogService from "../api/blogService";

export const CreatePost = ({ onPostSuccess, isLoading = false }) => {
  const { user, token } = useAuth();
  const { error, handleApiError, clearError, withErrorHandling } = useErrorHandler('create-post');
  const { showError, showSuccess } = useErrorNotification();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const postBlog = withErrorHandling(async (e) => {
    e.preventDefault();
    setIsCreating(true);

    console.log("🔐 User from useAuth:", user ? user.name : 'No user', "Token exists:", !!token);

    // Validation
    if (!title.trim() || !content.trim()) {
      throw new Error("Title and content are required.");
    }

    if (!token) {
      throw new Error("Authentication required. Please log in again.");
    }

    if (!user?.id) {
      throw new Error("User information not available. Please refresh and try again.");
    }

    console.log("📝 Attempting to create post with:", { title: title.trim(), content: content.trim() });

    // Use the blogService
    const response = await blogService.create({
      title: title.trim(),
      content: content.trim()
    });

    console.log("✅ Blog created successfully:", response);

    // Call success callback
    if (onPostSuccess) {
      onPostSuccess("Blog Uploaded Successfully!");
    }

    // Reset form
    setTitle("");
    setContent("");
    clearError();
  }, { customMessage: "Failed to create blog post. Please try again." });

  const handleSubmit = async (e) => {
    try {
      await postBlog(e);
      showSuccess("Blog created successfully!");
    } catch (error) {
      // Error is already handled by withErrorHandling
      console.error("Create post error:", error);
      showError(error, { 
        context: 'create-post',
        subMessage: 'Please try again or check your connection.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <CreatePostSkeleton />;
  }

  return (
    <div className="text-white">
      <h2 className="text-lg font-bold mb-4">Create New Post</h2>
      
      {error && (
        <div id="post-error" className={`border p-3 rounded-lg mb-4 ${
          error.type === 'warning' 
            ? 'bg-yellow-900/50 border-yellow-500 text-yellow-300'
            : 'bg-red-900/50 border-red-500 text-red-300'
        }`}>
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="post-title" className="block mb-2 font-medium">
            Title
          </label>
          <input
            id="post-title"
            name="title"
            type="text"
            className="w-full p-2 bg-[#1C222A] border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-describedby={error ? "post-error" : undefined}
            disabled={isCreating}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="post-content" className="block mb-2 font-medium">
            Content
          </label>
          <textarea
            id="post-content"
            name="content"
            rows={4}
            className="w-full p-2 bg-[#1C222A] border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 text-white resize-none"
            placeholder="Write your content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-describedby={error ? "post-error" : undefined}
            disabled={isCreating}
          />
        </div>

        <button
          type="submit"
          disabled={isCreating || !title.trim() || !content.trim()}
          className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          aria-label="Submit post"
        >
          {isCreating ? "Creating..." : "Post"}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;