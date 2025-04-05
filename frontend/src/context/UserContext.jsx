import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Base URL for your Django backend
const BASE_URL = 'http://127.0.0.1:8000/api';

// Create a context with default values
const UserContext = createContext({
  user: null,
  setUser: () => console.warn('No UserProvider found'),
  loading: true,
  login: () => {},
  logout: () => {},
  signup: () => {}
});

const UserProvider = ({ children }) => {
  // Initialize user state from localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loading, setLoading] = useState(true);

  // Axios interceptor to include JWT token in requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Cleanup interceptor on component unmount
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Token verification on initial load
  useEffect(() => {
    const verifyToken = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/test-token/`);
        
        if (response?.data) {
          // Changed: Extract user info from response.data.user
          setUser({
            username: response.data.user.username,
            email: response.data.user.email
          });
        }
      } catch (error) {
        console.error('Token verification error:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Update localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Signup function
  const signup = async (userData) => {
    try {
      const response = await axios.post(`${BASE_URL}/signup/`, userData);
      
      // Store tokens
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);

      // Set user data
      setUser({
        username: response.data.user.username,
        email: response.data.user.email
      });

      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      // Call the default login endpoint, which returns only tokens
      const response = await axios.post(`${BASE_URL}/login/`, credentials);
      
      // Extract tokens (adjust keys if needed)
      const accessToken = response.data.access || response.data.access_token;
      const refreshToken = response.data.refresh || response.data.refresh_token;
      
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // After login, fetch user details from the test-token endpoint
      const testResponse = await axios.get(`${BASE_URL}/test-token/`);
      const userData = {
        username: testResponse.data.user.username,
        email: testResponse.data.user.email
      };
      
      setUser(userData);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  

  // Logout function
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      // Optional: Call backend logout endpoint
      await axios.post(`${BASE_URL}/logout/`, { refresh_token: refreshToken });
      
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Reset user state
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if backend logout fails, clear local data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Token refresh mechanism
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await axios.post(`${BASE_URL}/token/refresh/`, {
        refresh: refreshToken
      });

      localStorage.setItem('access_token', response.data.access);
      return response.data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return null;
    }
  };

  // Add axios response interceptor for handling token refresh
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If the error is due to an unauthorized access and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          const newAccessToken = await refreshToken();
          if (newAccessToken) {
            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => axios.interceptors.response.eject(responseInterceptor);
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      loading, 
      login, 
      logout,
      signup,
      refreshToken 
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

// Custom hook for using UserContext
const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export { UserContext, UserProvider, useUser };