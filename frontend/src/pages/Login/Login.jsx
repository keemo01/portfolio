import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login...');
      const response = await login({ username, password });
      console.log('Login successful:', response);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      // More specific error handling
      if (err.response) {
        // The request was made and the server responded with a status code
        setError(err.response.data.detail || 'Login failed');
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server');
      } else {
        // Something happened in setting up the request
        setError('Error during login');
      }
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;