import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { Modal, Button, Container, Row, Col, Card } from 'react-bootstrap';
import { FaEdit } from 'react-icons/fa';
import axios from 'axios';
import './Profile.css';
import { Link } from 'react-router-dom';

const Profile = () => {
    const { user, setUser } = useContext(UserContext);
    const [showEditModal, setShowEditModal] = useState(false);
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
    });
    const [userBlogs, setUserBlogs] = useState([]);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeys, setApiKeys] = useState({
        binance_api_key: '',
        binance_secret_key: '',
        bybit_api_key: '',
        bybit_secret_key: ''
    });
    const [apiKeyStatus, setApiKeyStatus] = useState({
        hasBinanceKeys: false,
        hasBybitKeys: false,
        loading: true
    });

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

    useEffect(() => {
        const fetchUserBlogs = async () => {
            if (user?.token) {
                try {
                    console.log('Fetching user blogs...');
                    const response = await axios.get('http://127.0.0.1:8000/api/user-blogs/', {
                        headers: {
                            'Authorization': `Token ${user.token}`,
                            'Content-Type': 'application/json',
                        }
                    });
                    
                    if (response.data) {
                        console.log('Received user blogs:', response.data);
                        const blogsData = response.data.blogs || response.data;
                        setUserBlogs(blogsData);
                    }
                } catch (error) {
                    console.error('Error fetching user blogs:', error.response || error);
                    setMessage('Error loading blog posts');
                }
            }
        };

        fetchUserBlogs();
    }, [user]);

    const fetchApiKeys = async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/api/profile/api-keys/', {
                headers: { Authorization: `Token ${user.token}` }
            });
            const { has_api_keys, binance_api_key, bybit_api_key } = response.data;
            setApiKeyStatus({
                hasBinanceKeys: !!binance_api_key,
                hasBybitKeys: !!bybit_api_key,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching API keys:', error);
            setApiKeyStatus(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchApiKeys();
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setErrors({}); // Clear previous errors

        if (!profileData.username.trim()) {
            setErrors({ username: 'Username is required' });
            return;
        }

        if (!profileData.email.trim()) {
            setErrors({ email: 'Email is required' });
            return;
        }

        if (user && user.token) {
            try {
                const response = await axios.put('http://127.0.0.1:8000/api/profile/', profileData, {
                    headers: { Authorization: `Token ${user.token}` },
                });
                setUser({ ...user, ...response.data });
                setMessage('Profile updated successfully!');
                setShowEditModal(false);
            } catch (error) {
                if (error.response && error.response.data) {
                    setErrors(error.response.data);
                } else {
                    setMessage('Error updating profile');
                }
            }
        }
    };

    const handleApiKeySubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        
        try {
            await axios.post('http://127.0.0.1:8000/api/profile/api-keys/', apiKeys, {
                headers: { Authorization: `Token ${user.token}` }
            });
            
            setMessage('API keys saved successfully!');
            setShowApiKeyModal(false);
            // Refresh API key status
            fetchApiKeys();
            
            // Clear sensitive data from state
            setApiKeys({
                binance_api_key: '',
                binance_secret_key: '',
                bybit_api_key: '',
                bybit_secret_key: ''
            });
        } catch (error) {
            console.error('Error saving API keys:', error);
            setErrors({ apiKeys: 'Failed to save API keys. Please try again.' });
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>{profileData.username}'s Profile</h2>
                <button 
                    className="edit-profile-btn"
                    onClick={() => setShowEditModal(true)}
                    title="Edit Profile" // Tooltip for better UX
                >
                    <FaEdit size={20} />
                    <span className="edit-profile-label">Edit Profile</span>
                </button>
            </div>

            <div className="user-blogs-section">
                <h3>My Blog Posts</h3>
                <div className="blog-grid">
                    {userBlogs && userBlogs.length > 0 ? (
                        userBlogs.map(blog => (
                            <article key={blog.id} className="blog-card">
                                <h4>{blog.title}</h4>
                                <div className="blog-content">
                                    <p className="blog-excerpt">
                                        {blog.content?.length > 150 
                                            ? `${blog.content.substring(0, 150)}...` 
                                            : blog.content}
                                    </p>
                                    {blog.media && blog.media.length > 0 && (
                                        <img 
                                            src={blog.media[0].file} 
                                            alt={blog.title}
                                            className="blog-image"
                                        />
                                    )}
                                </div>
                                <div className="blog-metadata">
                                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                                    <div className="blog-actions">
                                        <Link to={`/blog/${blog.id}`} className="read-more-link">
                                            Read More
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <p className="no-blogs-message">
                            {userBlogs ? 'You haven\'t created any blog posts yet.' : 'Loading your blog posts...'}
                        </p>
                    )}
                </div>
            </div>

            {/* Add API Key Management Button */}
            <div className="api-key-section mt-4">
                <h3>Exchange API Keys</h3>
                <div className="api-key-status mb-3">
                    {apiKeyStatus.loading ? (
                        <p>Loading API key status...</p>
                    ) : (
                        <>
                            <p>Binance API Keys: {apiKeyStatus.hasBinanceKeys ? '✅ Connected' : '❌ Not Connected'}</p>
                            <p>Bybit API Keys: {apiKeyStatus.hasBybitKeys ? '✅ Connected' : '❌ Not Connected'}</p>
                        </>
                    )}
                </div>
                <button 
                    className="manage-api-keys-btn btn btn-primary"
                    onClick={() => setShowApiKeyModal(true)}
                >
                    Manage API Keys
                </button>
            </div>

            {/* Edit Profile Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="sm">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleProfileUpdate} className="edit-profile-form">
                        <div className="form-group">
                            <label>Username:</label>
                            <input
                                type="text"
                                value={profileData.username}
                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                            />
                            {errors.username && <span className="error-message">{errors.username}</span>}
                        </div>
                        <div className="form-group">
                            <label>Email:</label>
                            <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            />
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>

            {/* API Keys Modal */}
            <Modal show={showApiKeyModal} onHide={() => setShowApiKeyModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Manage Exchange API Keys</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleApiKeySubmit}>
                        <div className="exchange-section mb-4">
                            <h4>Binance {apiKeyStatus.hasBinanceKeys && <span className="text-success">(Connected)</span>}</h4>
                            <div className="form-group mb-3">
                                <label>API Key:</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={apiKeys.binance_api_key}
                                    onChange={(e) => setApiKeys({
                                        ...apiKeys,
                                        binance_api_key: e.target.value
                                    })}
                                    placeholder={apiKeyStatus.hasBinanceKeys ? "••••••••" : "Enter Binance API Key"}
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label>Secret Key:</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={apiKeys.binance_secret_key}
                                    onChange={(e) => setApiKeys({
                                        ...apiKeys,
                                        binance_secret_key: e.target.value
                                    })}
                                    placeholder={apiKeyStatus.hasBinanceKeys ? "••••••••" : "Enter Binance Secret Key"}
                                />
                            </div>
                        </div>

                        {/* Repeat similar structure for Bybit */}
                        <div className="exchange-section mb-4">
                            <h4>Bybit {apiKeyStatus.hasBybitKeys && <span className="text-success">(Connected)</span>}</h4>
                            <div className="form-group mb-3">
                                <label>API Key:</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={apiKeys.bybit_api_key}
                                    onChange={(e) => setApiKeys({
                                        ...apiKeys,
                                        bybit_api_key: e.target.value
                                    })}
                                    placeholder={apiKeyStatus.hasBybitKeys ? "••••••••" : "Enter Bybit API Key"}
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label>Secret Key:</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={apiKeys.bybit_secret_key}
                                    onChange={(e) => setApiKeys({
                                        ...apiKeys,
                                        bybit_secret_key: e.target.value
                                    })}
                                    placeholder={apiKeyStatus.hasBybitKeys ? "••••••••" : "Enter Bybit Secret Key"}
                                />
                            </div>
                        </div>

                        {errors.apiKeys && (
                            <div className="alert alert-danger">{errors.apiKeys}</div>
                        )}

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowApiKeyModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
                                Save API Keys
                            </Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>

            {message && (
                <div className="alert alert-success position-fixed bottom-0 end-0 m-3">
                    {message}
                </div>
            )}
        </div>
    );
};

export default Profile;