import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Blog.css';

const Blog = () => {
    const [blogs, setBlogs] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [media, setMedia] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [error, setError] = useState(null);
    
    const { user } = useContext(UserContext);

    // Base URL for your Django backend
    const BASE_URL = 'http://127.0.0.1:8000/api';

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/blogs/`);
            setBlogs(response.data);
        } catch (error) {
            console.error('Error fetching blogs:', error);
            setError('Unable to fetch blogs. Please try again later.');
        }
    };

    const handleDeleteBlog = async (blogId) => {
        // Confirm deletion
        const confirmDelete = window.confirm('Are you sure you want to delete this blog post?');
        if (!confirmDelete) return;

        try {
            await axios.delete(`${BASE_URL}/blogs/delete/${blogId}/`, {
                headers: { 
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
            });
            // Remove the deleted blog from the local state
            setBlogs(blogs.filter(blog => blog.id !== blogId));
        } catch (error) {
            console.error('Error deleting blog:', error);
            
            if (error.response && error.response.status === 403) {
                setError('You can only delete your own blog posts.');
            } else {
                setError('Unable to delete blog. Please try again.');
            }
        }
    };

    const handleMediaChange = (e) => {
        setMedia([...e.target.files]);
    };

    const handleCreateBlog = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('content', content.trim());
    
        media.forEach((file, index) => {
            formData.append('media', file);
        });
    
        try {
            await axios.post(`${BASE_URL}/blogs/create/`, formData, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            // Reset form state
            setTitle('');
            setContent('');
            setMedia([]);
            setIsFormOpen(false);
            fetchBlogs();
        } catch (error) {
            console.error('Error creating blog:', error.response?.data || error.message);
            setError('Unable to create blog. Please check your input and try again.');
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')}`;
    };

    return (
        <div className="blog-container">
            <h1>Cryptonia Blog</h1>

            {error && (
                <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>
                    {error}
                </div>
            )}

            {user && (
                <>
                    <button 
                        className={`fab ${isFormOpen ? 'fab-close' : ''}`}
                        onClick={() => setIsFormOpen(!isFormOpen)}
                    >
                        {isFormOpen ? '×' : '+'}
                    </button>
                    {isFormOpen && (
                        <form className="create-blog-form" onSubmit={handleCreateBlog}>
                            <h3>Create New Post</h3>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Post Title"
                                required
                                maxLength={200}  // Add a reasonable max length
                            />
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your content here..."
                                required
                                maxLength={5000}  // Add a reasonable max content length
                            />
                            <div>
                                <label>Upload Images/Videos:</label>
                                <input 
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleMediaChange}
                                />
                                <small>{media.length} file(s) selected</small>
                            </div>
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="fab-close"
                                    onClick={() => setIsFormOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="fab">
                                    Publish
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}

            <div className="blog-posts">
                {blogs.length === 0 ? (
                    <div className="empty-state">No blog posts found</div>
                ) : (
                    blogs.map((blog) => (
                        <div className="blog-post" key={blog.id}>
                            <div className="post-header">
                                <Link to={`/blog/${blog.id}`} className="post-title-link">
                                    <h3>{blog.title}</h3>
                                </Link>
                                {/* Delete button only for the blog author */}
                                {user && user.username === blog.author && (
                                    <button 
                                        className="delete-btn"
                                        onClick={() => handleDeleteBlog(blog.id)}
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>

                            <Link to={`/blog/${blog.id}`} className="post-content-link">
                                <p>
                                    {blog.content.length > 150 
                                        ? `${blog.content.substring(0, 150)}...` 
                                        : blog.content}
                                </p>
                            </Link>

                            <div className="post-media">
                                {blog.media.map((file, index) => (
                                    file.file.endsWith('.mp4') || file.file.endsWith('.mov') ? (
                                        <video key={index} controls>
                                            <source src={file.file} type="video/mp4" />
                                            Your browser does not support videos.
                                        </video>
                                    ) : (
                                        <img key={index} src={file.file} alt="Blog Media" />
                                    )
                                ))}
                            </div>

                            <div className="post-footer">
                                <span>{formatDateTime(blog.created_at)}</span>
                                <span className="author">By {blog.author}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Blog;