import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import './Login.css';

const Login = () => {
    // State variables for username, password, and error message
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    // Hook to navigate programmatically
    const navigate = useNavigate();
    
    // Access setUser from UserContext to update user state
    const { setUser } = useContext(UserContext);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        const userData = { username, password };

        try {
            // Send login request to the server
            const response = await fetch('http://127.0.0.1:8000/api/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            const data = await response.json();

            if (response.ok) {
                // Store token in local storage
                localStorage.setItem('token', data.token);
                
                // Update user state with the received data
                setUser({ username: data.user.username, email: data.user.email, token: data.token });
                
                // Redirect to home page
                navigate('/');
            } else {
                // Set error message if login fails
                setError(data.detail || 'Invalid credentials');
            }
        } catch (err) {
            console.error('Login failed:', err);
            setError('Failed to log in');
        }
    };

    return (
        <div className="login">
            <h2>Login</h2>
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
            {error && <p>{error}</p>}
        </div>
    );
};

export default Login;