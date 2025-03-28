import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Navbar.css';

const Navbar = () => {
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();

    const BASE_URL = 'http://127.0.0.1:8000/api';

    const handleLogout = async () => {
        try {
            await axios.post(`${BASE_URL}/logout/`, {}, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Clear user context and local storage
            setUser(null);
            localStorage.removeItem('user');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Logout user anyway on frontend
            setUser(null);
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    Cryptonia
                </Link>
                <div className="navbar-links">
                    <Link to="/blog" className="navbar-link">Blog</Link>
                    {user ? (
                        <>
                            <span className="navbar-user">Hello, {user.username}</span>
                            <button className="navbar-logout" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="navbar-link">Login</Link>
                            <Link to="/register" className="navbar-link">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;