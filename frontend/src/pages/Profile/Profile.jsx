// src/pages/Profile/Profile.jsx
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
    const { user, setUser } = useContext(UserContext);
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
    });
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user && user.token) {
            const fetchProfile = async () => {
                try {
                    const response = await axios.get('http://127.0.0.1:8000/api/profile/', {
                        headers: {
                            Authorization: `Token ${user.token}`,
                        },
                    });
                    setProfileData({
                        username: response.data.username,
                        email: response.data.email,
                    });
                } catch (error) {
                    console.error('Error fetching profile:', error);
                }
            };
            fetchProfile();
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (user && user.token) {
            try {
                const response = await axios.put('http://127.0.0.1:8000/api/profile/', profileData, {
                    headers: {
                        Authorization: `Token ${user.token}`,
                    },
                });
                setUser({ ...user, ...response.data });
                setMessage('Profile updated successfully!');
            } catch (error) {
                setMessage('Error updating profile');
                console.error('Profile update error:', error);
            }
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (user && user.token) {
            try {
                await axios.post('http://127.0.0.1:8000/api/change-password/', passwordData, {
                    headers: {
                        Authorization: `Token ${user.token}`,
                    },
                });
                setMessage('Password changed successfully!');
                setPasswordData({ old_password: '', new_password: '' });
            } catch (error) {
                setMessage('Error changing password');
                console.error('Password change error:', error);
            }
        }
    };

    return (
        <div className="profile-container">
            <h2>Profile Settings</h2>
            
            <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-group">
                    <label>Username:</label>
                    <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>Email:</label>
                    <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    />
                </div>
                <button type="submit" className="update-button">
                    Update Profile
                </button>
            </form>

            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                    <label>Old Password:</label>
                    <input
                        type="password"
                        value={passwordData.old_password}
                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label>New Password:</label>
                    <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    />
                </div>
                <button type="submit" className="password-button">
                    Change Password
                </button>
            </form>

            {message && <div className="message">{message}</div>}
        </div>
    );
};

export default Profile;