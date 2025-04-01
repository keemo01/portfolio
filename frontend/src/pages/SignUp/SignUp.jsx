import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import './SignUp.css';

const SignUp = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { signup } = useUser();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const userData = { 
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            dob: dob.trim(),
            username: username.trim(), 
            email: email.trim(), 
            password: password.trim() 
        };

        if (!userData.firstName || !userData.lastName || !userData.dob || !userData.username || !userData.email || !userData.password) {
            setError('All fields are required');
            return;
        }

        try {
            const response = await signup(userData);
            console.log('Signup successful:', response);
            navigate('/login');
        } catch (err) {
            console.error('Signup error:', err);
            if (err.response?.data) {
                // Handle specific backend validation errors
                const backendErrors = err.response.data;
                if (typeof backendErrors === 'object') {
                    const errorMessage = Object.entries(backendErrors)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                    setError(errorMessage);
                } else {
                    setError(backendErrors);
                }
            } else {
                setError('Failed to sign up. Please try again.');
            }
        }
    };

    return (
        <div className="signup">
            <h2>Sign Up</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                />
                <input
                    type="date"
                    placeholder="Date of Birth"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                />
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