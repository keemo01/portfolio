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
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [profileData, setProfileData] = useState({
        username: '',
        email: '',
    });
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
    });
    const [userBlogs, setUserBlogs] = useState([]);
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
                        // Check if response.data.blogs exists, otherwise use response.data directly
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

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (user && user.token) {
            try {
                const response = await axios.put('http://127.0.0.1:8000/api/profile/', profileData, {
                    headers: { Authorization: `Token ${user.token}` },
                });
                setUser({ ...user, ...response.data });
                setMessage('Profile updated successfully!');
                setShowEditModal(false);
            } catch (error) {
                setMessage('Error updating profile');
            }
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>{profileData.username}'s Profile</h2>
                <button 
                    className="edit-profile-btn"
                    onClick={() => setShowEditModal(true)}
                >
                    <FaEdit size={20} />
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
                        </div>
                        <div className="form-group">
                            <label>Email:</label>
                            <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            />
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

            {message && <div className="message">{message}</div>}
        </div>
    );
};

export default Profile;