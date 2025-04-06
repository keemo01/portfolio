import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

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

  // Axios request interceptor to include JWT token
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
        if (response?.data && response.data.user) {
          setUser({
            id: response.data.user.id, // Ensure user ID is included
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

  // Update localStorage when user state changes
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
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      setUser({
        id: response.data.user.id, // Include user ID
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
      const response = await axios.post(`${BASE_URL}/login/`, credentials);
      const accessToken = response.data.access || response.data.access_token;
      const refreshToken = response.data.refresh || response.data.refresh_token;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      // Fetch user details after login using test-token endpoint
      const testResponse = await axios.get(`${BASE_URL}/test-token/`);
      const userData = {
        id: testResponse.data.user.id, // Include user ID
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
      await axios.post(`${BASE_URL}/logout/`, { refresh_token: refreshToken });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Token refresh mechanism
  const refreshTokenFunc = async () => {
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

  // Response interceptor to handle 401 errors
  // and refresh the token if needed
  // This interceptor will retry the request with a new access token
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const newAccessToken = await refreshTokenFunc();
          if (newAccessToken) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
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
      refreshToken: refreshTokenFunc 
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export { UserContext, UserProvider, useUser };
