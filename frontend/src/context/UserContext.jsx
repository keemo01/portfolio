import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Set the base URL for your Django backend API
const BASE_URL = 'http://127.0.0.1:8000/api';

// Creating a context that holds user-related data and functions
const UserContext = createContext({
  user: null,
  setUser: () => {},
  loading: true,
  login: () => {},
  logout: () => {},
  signup: () => {}
});

const UserProvider = ({ children }) => {
  // Load user data from localStorage when the app starts
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Error loading user data:', error);
      localStorage.removeItem('user'); // Clear invalid data if any
      return null;
    }
  });

  const [loading, setLoading] = useState(true); // Keep track of loading state

  // Add JWT token to requests if available
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

    // Remove the interceptor when the component is no longer in use
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Verify the token when the app loads
  useEffect(() => {
    const verifyToken = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/test-token/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response?.data?.status === 'success') {
          setUser(response.data.user);
        } else {
          throw new Error('Invalid token');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Keep the localStorage synced with the user data state
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user)); // Save the user to localStorage
    } else {
      localStorage.removeItem('user'); // Remove user data if there's no user
    }
  }, [user]);

  // Handle user signup
  const signup = async (userData) => {
    try {
      console.log('Attempting signup:', { username: userData.username, email: userData.email });
      const response = await axios.post(`${BASE_URL}/signup/`, userData);
      console.log('Signup response:', response.data);

      const { access_token, refresh_token, user } = response.data;

      // Store the access and refresh tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      // Set the user data and update state
      const userState = {
        username: user.username,
        email: user.email,
        id: user.id
      };

      setUser(userState); // Update user state
      localStorage.setItem('user', JSON.stringify(userState)); // Save user to localStorage

      return response.data;
    } catch (error) {
      console.error('Signup error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  // Handle user login
  const login = async (credentials) => {
    try {
      const response = await axios.post(`${BASE_URL}/login/`, credentials);
      const { access, refresh, user: userData } = response.data;

      if (!access || !refresh || !userData) {
        throw new Error('Invalid response from server');
      }

      // Store tokens in localStorage
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);

      // Set user state
      const userState = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      };

      setUser(userState);
      localStorage.setItem('user', JSON.stringify(userState)); // Save user to localStorage

      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  // Handle user logout
  const logout = async () => {
    try {
      const refresh_token = localStorage.getItem('refresh_token');
      if (refresh_token) {
        try {
          await axios.post(`${BASE_URL}/logout/`, { refresh_token });
        } catch (error) {
          console.log('Logout backend call failed, clearing local data anyway');
        }
      }
    } finally {
      // Clear tokens and user data from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null); // Reset the user state
    }
  };

  // Refresh the JWT token using the refresh token
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      logout(); // If no refresh token, logout the user
      return null;
    }

    try {
      const response = await axios.post(`${BASE_URL}/token/refresh/`, {
        refresh: refreshToken
      });

      // Save the new access token to localStorage
      localStorage.setItem('access_token', response.data.access);
      return response.data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout(); // If refreshing fails, log the user out
      return null;
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, login, logout, signup }}>
      {!loading && children} {/* Makes children after loading is done */}
    </UserContext.Provider>
  );
};

// Custom hook for consuming the UserContext in other components
const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('User must be used within UserProvider');
  }
  return context;
};

export { UserContext, UserProvider, useUser };