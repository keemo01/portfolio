import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create a context with default values
const UserContext = createContext({
  user: null,
  setUser: () => console.warn('No UserProvider found'),
  loading: true
});

const UserProvider = ({ children }) => {
  // This is to hold the user data and loading status
  const [user, setUser] = useState(() => {
    // Check localStorage for existing user data
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  // Add axios interceptor to include token in requests
  axios.interceptors.request.use(
    (config) => {
      const userToken = localStorage.getItem('token');
      if (userToken) {
        config.headers.Authorization = `Token ${userToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    // Function to verify the token and fetch user data
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false); // No token, stop loading
        return;
      }
      
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/test_token/', {
          headers: { Authorization: `Token ${token}` }
        });
        
        if (response?.data?.user) {
          // Set the user data if token is valid
          setUser({
            token,
            username: response.data.user.username,
            email: response.data.user.email
          });
        }
      } catch (error) {
        // Remove invalid token and reset user data
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false); // Stop loading after verification
      }
    };

    verifyToken();
  }, []);

  useEffect(() => {
    // Update localStorage whenever user state changes
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    // Give the user's data and loading status to the context
    <UserContext.Provider value={{ user, setUser, loading, logout }}>
      {!loading && children} {/* Render children only when not loading */}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };