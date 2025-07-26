import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useErrorHandler from "../hooks/useErrorHandler";
import { useErrorNotification } from "../context/ErrorNotificationContext";
import { extractValidationErrors, ERROR_TYPES } from "../utils/errorHandler";
import authService from '../api/authService';
import { Button } from "../components/ui/Button";

export const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Initialize isSignUp based on current URL
  const [isSignUp, setIsSignUp] = useState(() => {
    return location.pathname.includes('signup');
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, loginUser, user, token, isAuthLoading, isAuthenticated } = useAuth();
  const { error, handleApiError, clearError } = useErrorHandler(isSignUp ? 'signup' : 'login');
  const { showError, showSuccess } = useErrorNotification();
  const [validationErrors, setValidationErrors] = useState({});

  // Login form data
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Signup form data
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    age: '',
  });

  useEffect(() => {
    document.title = isSignUp ? "Sign Up - Blog App" : "Login - Blog App";

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
        context: isSignUp ? 'signup' : 'login',
        persistent: false 
      });
    }

    // Handle signup page messages
    if (location.state?.message) {
      showError({ 
        message: location.state.message, 
        type: ERROR_TYPES.AUTH_ERROR,
        statusCode: 410 
      }, { 
        context: 'signup',
        persistent: true 
      });
      
      navigate(location.pathname, { replace: true });
    }
  }, [isSignUp, location, searchParams, showError, navigate]);

  // Handle URL changes to sync state
  useEffect(() => {
    const shouldBeSignUp = location.pathname.includes('signup');
    if (shouldBeSignUp !== isSignUp) {
      setIsSignUp(shouldBeSignUp);
    }
  }, [location.pathname, isSignUp]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && token) {
      navigate('/home');
    }
  }, [isAuthenticated, user, token, navigate]);

  // Handle autofill styling
  useEffect(() => {
    const handleAutofill = () => {
      const inputs = document.querySelectorAll('.auth-input');
      inputs.forEach(input => {
        // Check if input has autofilled value
        if (input.matches(':-webkit-autofill') || input.value) {
          input.style.backgroundColor = '#374151';
          input.style.color = 'white';
          input.style.border = '1px solid #4b5563';
        }
      });
    };

    // Initial check
    handleAutofill();

    // Listen for autofill events
    const inputs = document.querySelectorAll('.auth-input');
    inputs.forEach(input => {
      input.addEventListener('input', handleAutofill);
      input.addEventListener('animationstart', (e) => {
        if (e.animationName === 'onAutoFillStart') {
          handleAutofill();
        }
      });
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('input', handleAutofill);
        input.removeEventListener('animationstart', handleAutofill);
      });
    };
  }, [isSignUp]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    setValidationErrors({});

    try {
      const response = await login(loginData.email, loginData.password, rememberMe);
      
      if (response.success) {
        showSuccess({ 
          message: `Welcome back, ${response.user.firstName}!` 
        });
        navigate('/home');
      }
    } catch (err) {
      const apiError = handleApiError(err);
      
      if (apiError.type === ERROR_TYPES.VALIDATION_ERROR) {
        const fieldErrors = extractValidationErrors(err);
        setValidationErrors(fieldErrors);
      }
      
      showError(apiError, { 
        context: 'login', 
        persistent: false 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.signup(signupData);
      
      if (response.success) {
        showSuccess({ 
          message: 'Account created successfully! Please check your email for verification.' 
        });
        navigate('/verify-signup');
      }
    } catch (err) {
      const errorData = err.response?.data;
      
      if (errorData?.errors) {
        const fieldErrors = {};
        errorData.errors.forEach((error) => {
          if (error.path) {
            fieldErrors[error.path] = error.msg;
          }
        });
        setValidationErrors(fieldErrors);
      } else {
        showError({ 
          message: errorData?.message || 'Signup failed. Please try again.',
          type: ERROR_TYPES.AUTH_ERROR,
          statusCode: err.response?.status || 500
        }, { 
          context: 'signup',
          persistent: false 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Mobile Layout */}
      <div className="block md:hidden w-full max-w-md mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
                {isSignUp ? "Create Account" : "Welcome Back!"}
              </h1>
              <p className="text-blue-100 text-sm font-medium">
                {isSignUp 
                  ? "Join our community and start your journey" 
                  : "Sign in to access your account"
                }
              </p>
            </div>
          </div>

          {/* Mobile Form */}
          <div className="p-8">
            {isSignUp ? (
              // Mobile Signup Form
              <form onSubmit={handleSignupSubmit} className="space-y-5">
                {/* Social Login */}
                <button 
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl px-6 py-4 text-gray-700 font-medium transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group"
                  title="Continue with Google"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" className="group-hover:scale-110 transition-transform duration-200">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700 font-semibold">Continue with Google</span>
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">or sign up with email</span>
                  </div>
                </div>
                
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={signupData.firstName}
                      onChange={handleSignupChange}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={signupData.lastName}
                      onChange={handleSignupChange}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email address"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      name="age"
                      placeholder="Age"
                      value={signupData.age}
                      onChange={handleSignupChange}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Create password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    className="w-full px-4 py-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {Object.keys(validationErrors).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    {Object.values(validationErrors).map((error, index) => (
                      <p key={index} className="text-red-600 text-sm font-medium">{error}</p>
                    ))}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </button>
                
                <div className="text-center pt-4">
                  <button 
                    type="button"
                    onClick={() => navigate('/login', { replace: true })}
                    className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
                  >
                    Already have an account? <span className="text-blue-600 font-semibold">Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              // Mobile Login Form
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {/* Social Login */}
                <button 
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 rounded-xl px-6 py-4 text-gray-700 font-medium transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group"
                  title="Continue with Google"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" className="group-hover:scale-110 transition-transform duration-200">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700 font-semibold">Continue with Google</span>
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">or sign in with email</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                    required
                  />

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      className="w-full px-4 py-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900 font-medium transition-all duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {(validationErrors.email || validationErrors.password) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    {validationErrors.email && (
                      <p className="text-red-600 text-sm font-medium">{validationErrors.email}</p>
                    )}
                    {validationErrors.password && (
                      <p className="text-red-600 text-sm font-medium">{validationErrors.password}</p>
                    )}
                  </div>
                )}
                
                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-colors duration-200"
                    />
                    <span className="text-gray-600 text-sm font-medium">Remember me</span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                  >
                    Forgot password?
                  </button>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={isLoading || isAuthLoading}
                >
                  {(isLoading || isAuthLoading) ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </button>
                
                <div className="text-center pt-4">
                  <button 
                    type="button"
                    onClick={() => navigate('/signup', { replace: true })}
                    className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
                  >
                    Don't have an account? <span className="text-blue-600 font-semibold">Sign Up</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Original Animated Design */}
      <div className={`hidden md:block auth-container ${isSignUp ? 'right-panel-active' : ''}`}>
        {/* Sign Up Form */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleSignupSubmit} className="auth-form">
            <h1 className="text-4xl font-bold text-white mb-6">Create Account</h1>
            
            {/* Social Login */}
            <div className="social-container">
              <button 
                type="button"
                onClick={handleGoogleAuth}
                className="modern-google-btn"
                title="Continue with Google"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
            
            <span className="text-gray-300 text-sm mb-6 font-medium">or create account with email</span>
            
            {/* Name Fields */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={signupData.firstName}
                onChange={handleSignupChange}
                className="auth-input flex-1"
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={signupData.lastName}
                onChange={handleSignupChange}
                className="auth-input flex-1"
                required
              />
            </div>
            
            {/* Email and Age Fields */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signupData.email}
                onChange={handleSignupChange}
                className="auth-input flex-[3]"
                required
              />
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={signupData.age}
                onChange={handleSignupChange}
                className="auth-input flex-[1] min-w-[80px]"
                required
              />
            </div>
            
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={signupData.password}
                onChange={handleSignupChange}
                className="auth-input pr-10"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
                  showPassword 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {Object.keys(validationErrors).length > 0 && (
              <div className="text-red-400 text-sm">
                {Object.values(validationErrors).map((error, index) => (
                  <p key={index}>{error}</p>
                ))}
              </div>
            )}
            
            <button 
              type="submit" 
              className="modern-auth-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        {/* Sign In Form */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <h1 className="text-4xl font-bold text-white mb-6">Welcome Back</h1>
            
            {/* Social Login */}
            <div className="social-container">
              <button 
                type="button"
                onClick={handleGoogleAuth}
                className="modern-google-btn"
                title="Continue with Google"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
            
            <span className="text-gray-300 text-sm mb-6 font-medium">or sign in with your account</span>
            
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={loginData.email}
              onChange={handleLoginChange}
              className="auth-input"
              required
            />

            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleLoginChange}
                className="auth-input pr-10"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
                  showPassword 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {validationErrors.email && (
              <p className="text-red-400 text-sm">{validationErrors.email}</p>
            )}
            {validationErrors.password && (
              <p className="text-red-400 text-sm">{validationErrors.password}</p>
            )}
            
            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between w-full mt-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">Remember me</span>
              </label>
              <button 
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-blue-400 hover:underline text-sm"
              >
                Forgot your password?
              </button>
            </div>
            
            <button 
              type="submit" 
              className="modern-auth-button"
              disabled={isLoading || isAuthLoading}
            >
              {(isLoading || isAuthLoading) ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1 className="text-4xl font-bold text-white mb-4">Welcome Back!</h1>
              <p className="text-white/90 mb-8 text-center text-lg leading-relaxed">
                Sign in to access your personal dashboard and continue your journey with us
              </p>
              <button 
                className="modern-ghost-button" 
                onClick={() => {
                  navigate('/login', { replace: true });
                }}
              >
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1 className="text-4xl font-bold text-white mb-4">Hello, Friend!</h1>
              <p className="text-white/90 mb-8 text-center text-lg leading-relaxed">
                Join our community today and start your amazing journey with us
              </p>
              <button 
                className="modern-ghost-button" 
                onClick={() => {
                  navigate('/signup', { replace: true });
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
