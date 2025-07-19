import { useEffect, useState } from "react";
import FeaturesSidebar from "../components/FeaturesSidebar";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoginPageSkeleton } from "../skeleton/pages/LoginPageSkelton";
import { useAuth } from '../context/AuthContext';
import useErrorHandler from "../hooks/useErrorHandler";
import { useErrorNotification } from "../context/ErrorNotificationContext";
import { extractValidationErrors, ERROR_TYPES } from "../utils/errorHandler";

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rememberMe, setRememberMe] = useState(false);
  const { login, user, token, isAuthLoading, isAuthenticated } = useAuth();
  const { error, handleApiError, clearError } = useErrorHandler('login');
  const { showError, showSuccess } = useErrorNotification();
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    document.title = "Login - Blog App";

    // Handle URL error parameters
    const urlError = searchParams.get('error');
    if (urlError) {
      const errorMessages = {
        google_auth_failed: 'Google authentication failed. Please try again.',
        no_user: 'Authentication failed. Please try again.',
        session_expired: 'Your session has expired. Please log in again.'
      };
      
      const message = errorMessages[urlError] || 'An error occurred during authentication.';
      showError({ 
        message, 
        type: ERROR_TYPES.AUTH_ERROR,
        statusCode: 401 
      }, { 
        context: 'login',
        persistent: false 
      });
    }

    if (!isAuthLoading) {
      if (isAuthenticated) {
        navigate('/home', { replace: true });
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, navigate, searchParams, showError]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!formData.email) newErrors.email = "Email is required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password is required";
    else if (!passwordRegex.test(formData.password))
      newErrors.password = "Password must be 8+ chars, include 1 capital letter & 1 symbol";

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    clearError();
    setValidationErrors({});

    try {
      await login(formData.email, formData.password, rememberMe);
      showSuccess('Login successful! Welcome back.');
    } catch (err) {
      // Extract validation errors if present
      const validationErrs = extractValidationErrors(err);
      if (Object.keys(validationErrs).length > 0) {
        setValidationErrors(validationErrs);
      } else {
        // Show error notification
        showError(err, { 
          context: 'login',
          subMessage: 'Please check your credentials and try again.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return <LoginPageSkeleton />;
  }

  if (!isAuthLoading && isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1C222A] flex flex-col xl:flex-row">
      {/* Features Sidebar - Top on mobile/tablet, Left on desktop */}
      <div className="xl:w-1/2 w-full xl:min-h-screen">
        <FeaturesSidebar />
      </div>

      {/* Login Form - Bottom on mobile/tablet, Right on desktop */}
      <div className="flex flex-col items-center justify-center xl:w-1/2 w-full bg-[#2A2E36] px-4 py-8 xl:py-0">
        <div className="w-full max-w-md xl:max-w-lg">
          <p className="text-white text-2xl xl:text-3xl font-bold mb-6 xl:mb-8 text-center">
            Welcome to Your Blog Space
          </p>
          <h1 className="text-white text-3xl xl:text-4xl font-bold mb-8 xl:mb-10 text-center">
            Login Here
          </h1>

          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="flex flex-col xl:grid xl:grid-cols-4 xl:gap-4 xl:items-center space-y-2 xl:space-y-0">
              <label
                className="xl:col-span-1 text-white transform transition-transform duration-200 hover:scale-110"
                htmlFor="email"
              >
                <b>Email:</b>
              </label>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="xl:col-span-3 w-full"
              >
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#1C222A] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 hover:border-white hover:border-2 transition duration-200"
                  placeholder="Enter your email"
                  required
                />
                {validationErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                )}
              </motion.div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col xl:grid xl:grid-cols-4 xl:gap-4 xl:items-start space-y-2 xl:space-y-0">
              <label
                className="xl:col-span-1 text-white transform transition-transform duration-200 hover:scale-110 xl:pt-3"
                htmlFor="password"
              >
                <b>Password:</b>
              </label>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="xl:col-span-3 w-full"
              >
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-3 pr-10 bg-[#1C222A] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 hover:border-white hover:border-2 transition duration-200"
                    placeholder="Enter your password"
                    required
                  />
                  <div
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-white" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-white" />
                    )}
                  </div>
                </div>
                {validationErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
                )}
              </motion.div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 bg-[#1C222A] border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-white hover:border-2 transition duration-200"
                />
                <label htmlFor="remember" className="text-white">
                  <b>Remember Me</b>
                </label>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-center">
              <a
                href="/forgot-password"
                className="text-blue-400 hover:underline text-sm"
              >
                Forgot Password?
              </a>
            </div>

            {validationErrors.form && (
              <p className="text-red-500 text-sm mt-1 mb-2 text-center">{validationErrors.form}</p>
            )}

            {validationErrors.form?.includes('Email not verified') && (
              <div className="text-center mt-2">
                <button
                  onClick={() => navigate('/resend-verification', { state: { email: formData.email } })}
                  className="text-blue-400 hover:underline"
                >
                  Resend verification email
                </button>
              </div>
            )}

            {/* Login Button */}
            <div className="flex justify-center mt-6">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                  type="submit"
                  disabled={isLoading || isAuthLoading}
                >
                  {(isLoading || isAuthLoading) ? "Logging in..." : "Log in"}
                </Button>
              </motion.div>
            </div>
          </form>

          {/* Google Sign-in Button */}
          <div className="flex justify-center mt-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
              >
                Sign in with Google
              </Button>
            </motion.div>
          </div>

          <p className="text-white mt-6 text-center">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-400 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;