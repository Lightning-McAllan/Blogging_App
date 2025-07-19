import React, { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import { HomeIcon, UserIcon, SettingsIcon, Plus, Info } from 'lucide-react';
import NotifyBanner from '../components/ui/NotifyBanner.jsx';
import { getTimeBasedGreeting, getCurrentDateTime } from '../utils/utilityFunctions.js';
import { motion } from 'framer-motion';
import PostDetails from '../components/PostDetails.jsx';
import PostModal from '../components/ui/modals/PostModal.jsx';
import Footer from '../components/Footer.jsx';
import HomePageSkeleton from '../skeleton/pages/HomePageSkeleton.jsx';
import CreatePostModal from '../components/ui/modals/CreatePostModal.jsx';
import EditPostModal from '../components/ui/modals/EditPostModal.jsx';
import QuickStatsModal from '../components/ui/modals/QuickStatsModal.jsx';
import SingleStatModal from '../components/ui/modals/SingleStatModal.jsx';
import useAuth from '../hooks/useAuth';
import { useErrorNotification } from '../context/ErrorNotificationContext';
import blogService from '../api/blogService';
import userService from '../api/userService';
import ConfirmDeleteModal from '../components/ui/ConfirmDeleteModal.jsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "../components/ui/dropdown-menu.jsx";
import { useNavigate } from 'react-router';

export const HomePage = () => {
  const { user, token, setUser, logout } = useAuth();
  const { showError, showSuccess } = useErrorNotification();
  const [selectedStat, setSelectedStat] = useState(null);
  const [isStatModalOpen, setIsStatModalOpen] = useState(false);
  const [isAllStatsOpen, setIsAllStatsOpen] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [greeting, setGreeting] = useState('');
  const [displayedUserName, setDisplayedUserName] = useState('Guest');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentDateTime());
  const [blogToEdit, setBlogToEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allBlogs, setAllBlogs] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedBlogForModal, setSelectedBlogForModal] = useState(null);
  const navigate = useNavigate();
  const userBlogs = allBlogs.filter(blog => blog.author?._id === user?.id);
  const userBlogsCount = userBlogs.length;
  const totalViews = userBlogs.reduce((sum, blog) => sum + (Number(blog.views) || 0), 0);

  const stats = [
    { title: 'Your Blogs', count: userBlogsCount, subtitle: 'Published posts' },
    { title: 'Total Views', count: totalViews, subtitle: 'Page views' },
    { title: 'Last Updated', count: lastUpdated || 'Never', subtitle: 'Recent activity' }
  ];

  const colorMap = {
    'Your Blogs': 'text-blue-400',
    'Total Views': 'text-green-400',
    'Last Updated': 'text-purple-400'
  };

  useEffect(() => {
    const savedLastUpdated = localStorage.getItem(`lastUpdated_${user?.id}`);
    if (savedLastUpdated) {
      setLastUpdated(savedLastUpdated);
    }
  }, [user?.id]);

  useEffect(() => {
    if (token) {
      fetchAllBlogsData();
    }
  }, [token]);

  useEffect(() => {
    setGreeting(getTimeBasedGreeting());
    setDisplayedUserName(user?.name ? user.name.split(' ')[0] + '...' : 'Guest');
    const interval = setInterval(() => {
      setCurrentTime(getCurrentDateTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isEditPostOpen) {
      document.title = "Edit Post";
    } else if (isCreatePostOpen) {
      document.title = "Create Post";
    } else if (isPostModalOpen) {
      document.title = selectedBlogForModal?.title || "View Post";
    } else {
      document.title = "Home - Blog Web App";
    }
  }, [isEditPostOpen, isCreatePostOpen, isPostModalOpen, selectedBlogForModal]);

  useEffect(() => {
    setShowWelcomeBanner(true);
    const timer = setTimeout(() => {
      setShowWelcomeBanner(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const data = await userService.updateProfile();
        if (data.user) {
          setUser(data.user);
        } else {
          console.warn("Failed to fetch valid user data:", data);
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err.message);
        showError(err, { 
          context: 'user-profile',
          subMessage: 'Some features may not work properly.'
        });
      }
    };
    if (token && (!user?.age || !user?.about)) {
      fetchUserDetails();
    }
  }, [token, user?.age, user?.about, setUser, showError]);

  useEffect(() => {
    if (showNotificationBanner) {
      const timer = setTimeout(() => {
        setShowNotificationBanner(false);
        setNotificationMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotificationBanner]);

  const handleStatClick = (stat) => {
    setIsAllStatsOpen(false);
    setTimeout(() => {
      setSelectedStat(stat);
      setIsStatModalOpen(true);
    }, 300);
  };

  const handleEditPost = (blog) => {
    setBlogToEdit(blog);
    setIsEditPostOpen(true);
  };

  const handleDeleteClick = (blogId) => {
    setSelectedBlogId(blogId);
    setIsConfirmOpen(true);
  };

  const handlePostCreationSuccess = (message) => {
    showSuccess(message || "Post created successfully!");
    setIsCreatePostOpen(false);
    updateLastUpdatedTime();
    fetchAllBlogsData();
  };

  const handlePostUpdateSuccess = (message) => {
    showSuccess(message || "Post updated successfully!");
    setIsEditPostOpen(false);
    updateLastUpdatedTime();
    fetchAllBlogsData();
  };

  const handlePostDeleteSuccess = async (blogId) => {
    try {
      await blogService.delete(blogId);
      setAllBlogs((prev) => prev.filter((b) => b._id !== blogId));
      showSuccess("Post moved to trash successfully!");
      updateLastUpdatedTime();
    } catch (error) {
      console.error("Failed to move blog to trash:", error);
      showError(error, { 
        context: 'delete-post',
        subMessage: 'Please try again or refresh the page.'
      });
    }
  };

  const handleOpenPostModal = (blogData) => {
    setSelectedBlogForModal(blogData);
    setIsPostModalOpen(true);
  };


  const handleClosePostModal = () => {
    setIsPostModalOpen(false);
    setSelectedBlogForModal(null);
  };

  const handleViewIncrement = (blogId, newViews) => {
    setAllBlogs(prevBlogs =>
      prevBlogs.map(blog =>
        (blog._id === blogId || blog.id === blogId)
          ? { ...blog, views: newViews }
          : blog
      )
    );
  };

  const updateLastUpdatedTime = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    const dateString = now.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const lastUpdatedString = `${timeString}\n${dateString}`;
    setLastUpdated(lastUpdatedString);
    if (user?.id) {
      localStorage.setItem(`lastUpdated_${user.id}`, lastUpdatedString);
    }
  };

  const fetchAllBlogsData = async () => {
    const delay = new Promise((resolve) => setTimeout(resolve, 1200));
    setIsLoading(true);
    try {
      const [blogsData] = await Promise.all([
        blogService.fetchAll(),
        delay
      ]);
      setAllBlogs(blogsData);
    } catch (error) {
      console.error("Failed to fetch blogs", error);
      setAllBlogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#1A1C20] text-gray-100 flex flex-col">

      <Header
        title="Home"
        icons={[
          { icon: HomeIcon, link: '/home' },
          { icon: SettingsIcon, link: '/account-setting' },
        ]}
        customElements={[
          <DropdownMenu key="user-dropdown">
            <DropdownMenuTrigger asChild>
              <button>
                <UserIcon className="text-white hover:text-blue-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 mr-6 mt-3">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/your-posts')}>
                Your Posts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/account-setting')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
                style={{
                  '--hover-bg': '#7f1d1d',
                  '--hover-text': '#ffffff'
                }}
                className="hover:bg-[--hover-bg] hover:text-[--hover-text] focus:bg-[--hover-bg] focus:text-[--hover-text]"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ]}
      />

      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#2A2E36] rounded-lg p-6 shadow-lg mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {greeting}, <span className="text-blue-400">{displayedUserName}</span>!
          </h1>

          <p className="text-gray-400 mb-4">{currentTime}</p>

          <div className="flex items-center text-gray-300 mb-3">
            <UserIcon size={20} className="mr-2 text-blue-400" />
            <p>
              {user?.name || 'Loading Name...'}
              {user?.age && <span className="ml-2">( Age: {user?.age || 'N/A'} )</span>}
            </p>
          </div>

          {/* About Section */}
          {user?.about && (
            <div className="flex items-start text-gray-300 bg-[#1A1C20] rounded-lg p-4 mt-4">
              <div className="mr-2 mt-0.5 text-green-400 flex-shrink-0">
                <Info size={20} />
                <p className="text-green-400 font-mono text-sm ms-1 mt-3">&gt;</p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-400 mb-1">About</p>
                <div className="text-sm leading-relaxed whitespace-pre-line mt-3">
                  {user.about.split('\n').map((line, index) => (
                    <p key={index} className="about-line mb-2">
                      <span className="text-green-400 font-mono mr-2">&gt;</span>
                      {line
                        .split(/(?<=[\u0900-\u097F])(?=[^\u0900-\u097F])|(?<=[^\u0900-\u097F])(?=[\u0900-\u097F])/g)
                        .map((part, idx) => {
                          const isDevanagari = /[\u0900-\u097F]/.test(part);
                          const isEmpty = part.trim() === '';

                          if (isEmpty) return <span key={idx}>{part}</span>;

                          return (
                            <span
                              key={idx}
                              className={`hover-word ${isDevanagari ? 'devanagari-text' : 'english-text'}`}
                              style={{
                                marginRight: '0.2em',
                                display: 'inline-block'
                              }}
                            >
                              {part}
                            </span>
                          );
                        })}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Welcome Message */}
        {showWelcomeBanner && (
          <NotifyBanner
            message="Welcome to Your Blog Space"
            subMessage="Ready to share your thoughts with the world? Your creative journey continues here."
            onClose={() => setShowWelcomeBanner(false)}
          />
        )}

        {/* Quick Stats Container */}
        <div className="bg-[#323943] rounded-lg p-6 mb-6">
          {/* Header row with title and button */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Your Stats</h2>
            <button
              onClick={() => setIsAllStatsOpen(true)}
              className="text-blue-400 hover:text-blue-500 font-medium underline"
            >
              View All Stats
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleStatClick(stat)}
                className="bg-[#2A2E36] rounded-lg p-4 text-center hover:border-2 transition-all duration-100 cursor-pointer"
              >
                <h3 className="text-white font-semibold mb-2">{stat.title}</h3>
                <p className={`text-2xl font-bold ${colorMap[stat.title] || 'text-gray-300'} whitespace-pre-line`}>
                  {stat.count || stat.count === 0 ? stat.count : '-'}
                </p>
                <p className="text-gray-400 text-sm">{stat.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* All Posts Section */}
        <h2 className="text-2xl font-bold text-white mb-6">Recent Posts</h2>

        {allBlogs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-400 text-lg mt-10"
          >
            No blogs available yet.
          </motion.div>

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBlogs.map((blog) => (
              <PostDetails
                key={blog._id || blog.id}
                blog={blog}
                author={blog.author}
                userId={user?.id}
                token={token}
                onEdit={() => handleEditPost(blog)}
                onDelete={() => handleDeleteClick(blog.id || blog._id)}
                onOpenModal={handleOpenPostModal}
                onViewIncrement={handleViewIncrement}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsCreatePostOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg cursor-pointer transition-all duration-300"
        aria-label="Create New Post"
      >
        <Plus size={28} />
      </button>

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostSuccess={handlePostCreationSuccess}
      />

      <EditPostModal
        isOpen={isEditPostOpen}
        onClose={() => setIsEditPostOpen(false)}
        onUpdateSuccess={handlePostUpdateSuccess}
        title={blogToEdit?.title || ''}
        content={blogToEdit?.content || ''}
        blogId={blogToEdit?.id || blogToEdit?._id}
        userId={user?.id}
        token={token}
      />

      <QuickStatsModal
        isOpen={isAllStatsOpen}
        onClose={() => setIsAllStatsOpen(false)}
        stats={stats}
        onStatClick={handleStatClick}
      />

      <SingleStatModal
        isOpen={isStatModalOpen}
        onClose={() => setIsStatModalOpen(false)}
        stat={selectedStat}
      />

      {/* The PostModal to show full blog content */}
      {selectedBlogForModal && (
        <PostModal
          isOpen={isPostModalOpen}
          onClose={handleClosePostModal}
          blog={selectedBlogForModal}
          userId={user?.id}
          token={token}
          onEdit={() => handleEditPost(selectedBlogForModal)}
          onDelete={() => {
            const blogId = selectedBlogForModal.id || selectedBlogForModal._id;
            handleDeleteClick(blogId);
            handleClosePostModal();
          }}
          onViewIncrement={handleViewIncrement}
        />
      )}

      <Footer />

      {/* Notification Banners */}
      {showWelcomeBanner && (
        <NotifyBanner
          message="Welcome to Your Blog Space"
          subMessage="Ready to share your thoughts with the world? Your creative journey continues here."
          onClose={() => setShowWelcomeBanner(false)}
        />
      )}
      {showNotificationBanner && notificationMessage && (
        <NotifyBanner
          message={notificationMessage}
          type="success"
          onClose={() => setShowNotificationBanner(false)}
        />
      )}
      <ConfirmDeleteModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setSelectedBlogId(null);
        }}
        onCancel={() => {
          setIsConfirmOpen(false);
          setSelectedBlogId(null);
        }}
        content={"Are you sure you want to delete this post?"}
        onConfirm={async () => {
          try {
            setIsConfirmOpen(false);
            await handlePostDeleteSuccess(selectedBlogId);
          } catch (error) {
            console.error("Failed to delete blog:", error);
          } finally {
            setSelectedBlogId(null);
          }
        }}
      />
    </div>
  );
};

export default HomePage;