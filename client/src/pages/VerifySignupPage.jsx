import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import authService from '../api/authService';

export const VerifySignupPage = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [resendTimer, setResendTimer] = useState(60);
  const [accountExpiryTimer, setAccountExpiryTimer] = useState(300); // 5 minutes in seconds
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { state } = useLocation();
  const email = state?.email;
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) navigate('/signup');

    // Resend timer
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [email, navigate, resendTimer]);

  useEffect(() => {
    // Account expiry countdown
    if (accountExpiryTimer > 0) {
      const timer = setTimeout(() => setAccountExpiryTimer(accountExpiryTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Account expired, redirect to signup
      navigate('/signup', { 
        state: { 
          message: 'Your account has been deleted due to email not being verified. Please sign up again.' 
        } 
      });
    }
  }, [accountExpiryTimer, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      setErrors({ otp: 'OTP is required' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const response = await authService.verifySignup(email, otp);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Show success modal instead of directly navigating
      setShowSuccessModal(true);
      
      // Auto-redirect to login after 7 seconds
      setTimeout(() => {
        navigate('/login');
      }, 7000);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await authService.resendOTP(email, 'signup');
      setResendTimer(60);
      // Reset account timer when OTP is resent
      setAccountExpiryTimer(300);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C222A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#2A2E36] p-8 rounded-lg shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/signup')}
              className="text-white hover:text-blue-400 transition-colors mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-white text-2xl font-bold">Verify Your Email</h1>
          </div>

          {/* Shield Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-blue-500">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>

          <p className="text-gray-300 text-center mb-4">
            Enter the OTP sent to <strong>{email}</strong> to verify your account.
          </p>

          {/* Account Expiry Warning */}
          <div className={`mb-6 p-4 rounded-lg border ${
            accountExpiryTimer <= 60 
              ? 'bg-red-900/30 border-red-500 text-red-300' 
              : accountExpiryTimer <= 180 
              ? 'bg-yellow-900/30 border-yellow-500 text-yellow-300'
              : 'bg-blue-900/30 border-blue-500 text-blue-300'
          }`}>
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 mr-2" />
              <span className="font-semibold">Account Security Notice</span>
            </div>
            <p className="text-center text-sm">
              {accountExpiryTimer <= 60 
                ? '⚠️ Your account will be deleted very soon! Please verify immediately.'
                : accountExpiryTimer <= 180
                ? '⏰ Your account will be deleted if not verified soon.'
                : 'ℹ️ Your account will be automatically deleted if not verified within 5 minutes.'
              }
            </p>
            <p className="text-center text-xs mt-1 font-mono">
              Time remaining: {Math.floor(accountExpiryTimer / 60)}m {accountExpiryTimer % 60}s
            </p>
          </div>

          {/* OTP Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-white font-semibold mb-2">
                OTP Code
              </label>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength="6"
                  placeholder="Enter 6-digit OTP"
                  className="w-full p-3 bg-[#1C222A] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 hover:border-white hover:border-2 transition duration-200"
                  required
                />
              </motion.div>
              {errors.otp && (
                <p className="text-red-500 text-sm mt-1">{errors.otp}</p>
              )}

              {/* Resend Button */}
              <div className="mt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0 || isLoading}
                  className="text-blue-400 hover:underline text-sm disabled:text-gray-500"
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>

            {errors.form && (
              <p className="text-red-500 text-sm text-center">{errors.form}</p>
            )}

            {/* Submit Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </motion.div>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already verified?{' '}
              <a href="/login" className="text-blue-400 hover:underline">
                Login
              </a>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-[#2A2E36] p-8 rounded-lg shadow-xl max-w-md w-full"
          >
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="p-4 rounded-full bg-green-500"
              >
                <CheckCircle className="h-12 w-12 text-white" />
              </motion.div>
            </div>

            {/* Success Message */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                Email Verified Successfully!
              </h2>
              <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-6">
                <p className="text-green-300 text-lg font-semibold mb-2">
                  ✅ Verification Complete
                </p>
                <p className="text-green-200 text-sm">
                  Your account has been successfully verified. You can now access all features of the blog platform.
                </p>
              </div>
              
              <p className="text-gray-300 text-sm mb-4">
                You will be redirected to the login page in a moment...
              </p>

              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
              >
                Continue to Login
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default VerifySignupPage;