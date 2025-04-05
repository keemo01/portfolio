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
    e.preventDefault(); // Prevent form from refreshing the page
    setError(''); // Clear previous error messages

    try {
      await login({ username, password }); // Attempt to log in
      navigate('/'); // Redirect to homepage on success
    } catch (err) {
      console.error('Login error:', err);

      // Handle different errors
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>
      
      {/* Show error message if there is one */}
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