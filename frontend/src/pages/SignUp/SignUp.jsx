import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignUp.css';

const SignUp = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const userData = { 
            username: username.trim(), 
            email: email.trim(), 
            password: password.trim() 
        };

        if (!userData.username || !userData.email || !userData.password) {
            setError('All fields are required');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/signup/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            console.log('Server Response:', data); // Debugging

            if (response.ok) {
                navigate('/login'); // Navigate to login page
            } else {
                setError(data.detail || data.error || 'Signup failed');
            }
        } catch (err) {
            console.error('Signup failed:', err);
            setError('Failed to sign up. Please try again.');
        }
    };

    return (
        <div className="signup">
            <h2>Sign Up</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Sign Up</button>
            </form>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default SignUp;