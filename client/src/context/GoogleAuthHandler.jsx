import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    const userParam = query.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        loginUser({ token, user }, true);
        navigate('/home');
      } catch (error) {
        console.error('Error parsing user data from Google auth:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [location.search, loginUser, navigate]);

  return <p className="text-white text-center">Signing you in via Google...</p>;
};

export default GoogleAuthHandler;