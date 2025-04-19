import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api/auth';

// create and export the context
export const UserContext = createContext({
  user: null,
  loading: true,
  login:  () => {},
  logout: () => {},
  signup: () => {},
});

export const UserProvider = ({ children }) => {
  const [user, setUser]     = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Attach token to every request
  useEffect(() => {
    const i = axios.interceptors.request.use(cfg => {
      const t = localStorage.getItem('access_token');
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return () => axios.interceptors.request.eject(i);
  }, []);

  // Verify token on load
  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return setLoading(false);

      try {
        const { data } = await axios.get(`${BASE_URL}/test-token/`);
        setUser({ ...data.user, token });
      } catch {
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  // Keep localStorage in sync
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else     localStorage.removeItem('user');
  }, [user]);

  // Handle signup, login, and logout
  const handleSignup = async (creds) => {
    const { data } = await axios.post(`${BASE_URL}/signup/`, creds);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    setUser({ ...data.user, token: data.access });
    return data;
  };

  const handleLogin = async (creds) => {
    const { data } = await axios.post(`${BASE_URL}/login/`, creds);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    const { data: verifyData } = await axios.get(`${BASE_URL}/test-token/`);
    setUser({ ...verifyData.user, token: data.access });
    return data;
  };

  const handleLogout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      await axios.post(`${BASE_URL}/logout/`, { refresh });
    }
    localStorage.clear();
    setUser(null);
  };

  // Auto‐refresh 401s
  useEffect(() => {
    const respI = axios.interceptors.response.use(
      r => r,
      async err => {
        const orig = err.config;
        if (err.response?.status === 401 && !orig._retry) {
          orig._retry = true;
          const rTok = localStorage.getItem('refresh_token');
          const { data } = await axios.post(`${BASE_URL}/refresh/`, { refresh: rTok });
          localStorage.setItem('access_token', data.access);
          orig.headers.Authorization = `Bearer ${data.access}`;
          return axios(orig);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(respI);
  }, []);

  // Auto‐refresh 403s
  useEffect(() => {
    const respI = axios.interceptors.response.use(
      r => r,
      async err => {
        const orig = err.config;
        if (err.response?.status === 403 && !orig._retry) {
          orig._retry = true;
          const rTok = localStorage.getItem('refresh_token');
          const { data } = await axios.post(`${BASE_URL}/refresh/`, { refresh: rTok });
          localStorage.setItem('access_token', data.access);
          orig.headers.Authorization = `Bearer ${data.access}`;
          return axios(orig);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(respI);
  }, []);
  // Provide context to children
  return (
    <UserContext.Provider value={{
      user,
      loading,
      signup: handleSignup,
      login:  handleLogin,
      logout: handleLogout
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};
