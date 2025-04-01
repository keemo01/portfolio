import React, { createContext, useState, useContext } from 'react';

export const AuthContext = createContext({
  auth: null,
  login: () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const savedAuth = localStorage.getItem('auth');
      if (!savedAuth) return null;
      return JSON.parse(savedAuth);
    } catch (error) {
      console.error('Error parsing auth data:', error);
      localStorage.removeItem('auth'); // Clear invalid data
      return null;
    }
  });

  const login = (authData) => {
    localStorage.setItem('auth', JSON.stringify(authData));
    setAuth(authData);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
