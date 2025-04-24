import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './Login.css';

const Login = () => {
  // State for username, password, and error messages
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login } = useUser(); // Get the login function from context
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();              // Prevent form from refreshing the page
    setError('');                   // Clear any previous error

    try {
      // Attempt to log in via context's login()
      await login({ username, password });
      navigate('/');               // Redirect to homepage on success
    } catch (err) {
      console.error('Login error:', err);

      // Django REST Framework returns { detail: '…' } on bad creds
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else {
        setError('An xerror occurred during login. Please try again.');
      }
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>

      {/* Show error message if there is one */}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
