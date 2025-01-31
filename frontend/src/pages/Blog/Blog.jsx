import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Blog.css';

const Blog = () => {
    const [blogs, setBlogs] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { user } = useContext(UserContext);

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = () => {
        axios.get('http://127.0.0.1:8000/api/blogs/')
            .then((response) => setBlogs(response.data))
            .catch((error) => console.error('Error fetching blogs:', error));
    };

    const handleDelete = (blogId) => {
        axios.delete(`http://127.0.0.1:8000/api/blogs/delete/${blogId}/`, {
            headers: { Authorization: `Token ${user.token}` },
        })
        .then(() => fetchBlogs())
        .catch((error) => console.error('Error deleting blog:', error));
    };

    const handleCreateBlog = (e) => {
        e.preventDefault();
        axios.post('http://127.0.0.1:8000/api/blogs/create/', { title, content }, {
            headers: { Authorization: `Token ${user.token}` },
        })
        .then(() => {
            setTitle('');
            setContent('');
            setIsFormOpen(false);
            fetchBlogs();
        })
        .catch((error) => console.error('Error creating blog:', error));
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        }).replace(' ', '');
    };

    return (
        <div className="blog-container">
            <h1>Cryptonia Blog</h1>
            
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
                            />
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your content here..."
                                required
                            />
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
                                {user && user.username === blog.author && (
                                    <button 
                                        className="delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(blog.id);
                                        }}
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
                            <div className="post-footer">
                                <span>
                                    {formatDate(blog.createdAt)} - {formatTime(blog.createdAt)}
                                </span>
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