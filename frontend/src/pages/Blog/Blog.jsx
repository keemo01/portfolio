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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ users: [], blogs: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [news, setNews] = useState([]); // State for news articles
    const [mediaPreview, setMediaPreview] = useState([]);

    const { user } = useContext(UserContext);

    // Base URL for your Django backend
    const BASE_URL = 'http://127.0.0.1:8000/api';

    useEffect(() => {
        fetchBlogs();
        fetchNews(); // Fetch news articles
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

    // Fetch news articles from the News API
    const fetchNews = async () => {
        try {
            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    apiKey: '7e07333e33234db8ac28e319fd52cdd4',
                    q: 'cryptocurrency OR bitcoin OR crypto',
                    language: 'en',
                    sortBy: 'publishedAt',
                    pageSize: 5
                }
            });
    
            if (response.data && response.data.articles) {
                setNews(response.data.articles.slice(0, 10)); // Limit to 10 articles
            } else {
                console.error('No news results found');
                setNews([]);
            }
        } catch (error) {
            console.error('Error fetching crypto news:', error.response?.data || error.message);
            setNews([]); // Set to empty array on error
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
        const files = Array.from(e.target.files);
        setMedia(files);
        
        // Create preview URLs for the selected files
        const previews = files.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image'
        }));
        setMediaPreview(previews);
    };

    // Clean up preview URLs when component unmounts
    useEffect(() => {
        return () => {
            mediaPreview.forEach(preview => URL.revokeObjectURL(preview.url));
        };
    }, [mediaPreview]);

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

    const highlightText = (text, query) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() 
                ? <mark key={index}>{part}</mark> 
                : part
        );
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        setShowSuggestions(query.length > 0);
        
        if (!query.trim()) {
            setIsSearching(false);
            setSearchResults({ users: [], blogs: [] });
            return;
        }

        setIsSearching(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/search/?q=${query}`);
            setSearchResults({
                users: response.data.users || [],
                blogs: response.data.blogs || []
            });
        } catch (error) {
            console.error('Search error:', error);
            setError('Search failed. Please try again.');
        }
    };

    // Delay search while typing
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const filteredBlogs = blogs.filter(blog => 
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="blog-container">
            <div className="main-content">
                <h1>Cryptonia Blog</h1>

                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search posts and users..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                    />
                    
                    {showSuggestions && searchQuery && (
                        <div className="search-suggestions">
                            {/* Users suggestions */}
                            {searchResults.users?.length > 0 && (
                                <div className="suggestion-section">
                                    <h4>Users</h4>
                                    {searchResults.users.slice(0, 3).map(user => (
                                        <Link 
                                            to={`/profile/${user.id}`} 
                                            key={user.id} 
                                            className="suggestion-item"
                                            onClick={() => setShowSuggestions(false)}
                                        >
                                            <span className="username">
                                                {highlightText(user.username, searchQuery)}
                                            </span>
                                            {user.email && (
                                                <span className="email">{user.email}</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* Blog suggestions */}
                            {searchResults.blogs?.length > 0 && (
                                <div className="suggestion-section">
                                    <h4>Posts</h4>
                                    {searchResults.blogs.slice(0, 3).map(blog => (
                                        <Link 
                                            to={`/blog/${blog.id}`} 
                                            key={blog.id} 
                                            className="suggestion-item"
                                            onClick={() => setShowSuggestions(false)}
                                        >
                                            <span className="blog-title">
                                                {highlightText(blog.title, searchQuery)}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Search Results */}
                {searchQuery && (
                    <div className="search-results">
                        {/* Users Section */}
                        {searchResults.users && searchResults.users.length > 0 && (
                            <div className="search-section">
                                <h3>Users</h3>
                                <div className="users-list">
                                    {searchResults.users.map(user => (
                                        <Link 
                                            to={`/profile/${user.id}`} 
                                            key={user.id} 
                                            className="user-result"
                                        >
                                            <div className="user-item">
                                                <span className="username">{highlightText(user.username, searchQuery)}</span>
                                                {user.email && (
                                                    <span className="email">{user.email}</span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Posts Section */}
                        {searchResults.blogs && searchResults.blogs.length > 0 && (
                            <div className="search-section">
                                <h3>Posts</h3>
                                <div className="blog-posts search-posts">
                                    {searchResults.blogs.map(blog => (
                                        <div className="blog-post" key={blog.id}>
                                            <div className="post-header">
                                                <Link to={`/blog/${blog.id}`} className="post-title-link">
                                                    <h3>{highlightText(blog.title, searchQuery)}</h3>
                                                </Link>
                                                {/* Delete button only available for the blog author */}
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
                                                <span className="author">
                                                    By <Link to={`/profile/${blog.author_id}`} className="author-link">{blog.author}</Link>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!searchResults.users?.length && !searchResults.blogs?.length) && (
                            <div className="no-results">
                                No matching users or posts found
                            </div>
                        )}
                    </div>
                )}

                {/* Regular Blog Posts Section */}
                {!searchQuery && (
                    <div className="blog-posts">
                        {filteredBlogs.length === 0 ? (
                            <div className="empty-state">
                                {searchQuery ? "No matching posts found" : "No blog posts found"}
                            </div>
                        ) : (
                            filteredBlogs.map((blog) => (
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

                                    {blog.media && blog.media.length > 0 && (
                                        <div className="post-media-preview">
                                            {blog.media[0].file.endsWith('.mp4') || blog.media[0].file.endsWith('.mov') ? (
                                                <video controls className="media-preview">
                                                    <source src={blog.media[0].file} type="video/mp4" />
                                                    Your browser does not support videos.
                                                </video>
                                            ) : (
                                                <img 
                                                    src={blog.media[0].file} 
                                                    alt={`Preview for ${blog.title}`}
                                                    className="media-preview"
                                                />
                                            )}
                                            {blog.media.length > 1 && (
                                                <span className="media-count">+{blog.media.length - 1} more</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="post-footer">
                                        <span>{formatDateTime(blog.created_at)}</span>
                                        <span className="author">
                                            By <Link to={`/profile/${blog.author_id}`} className="author-link">{blog.author}</Link>
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

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
                            aria-label="Create new post"
                        >
                            {isFormOpen ? '×' : '+'}
                        </button>
                        {isFormOpen && (
                            <div className="modal-overlay">
                                <form className="create-blog-form" onSubmit={handleCreateBlog}>
                                    <div className="form-header">
                                        <button 
                                            type="button"
                                            className="close-button"
                                            onClick={() => setIsFormOpen(false)}
                                        >
                                            ×
                                        </button>
                                        <h3>Create Post</h3>
                                    </div>
                                    <div className="form-content">
                                        <div className="user-info">
                                            <div className="avatar">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <span className="username">{user.username}</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Post Title"
                                            required
                                            maxLength={200}
                                            className="title-input"
                                        />
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="What's on your mind?"
                                            required
                                            maxLength={5000}
                                            className="content-input"
                                        />
                                        <div className="media-upload-section">
                                            <div className="media-upload">
                                                <label className="media-label">
                                                    <i className="far fa-image"></i>
                                                    <input 
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        multiple
                                                        onChange={handleMediaChange}
                                                        className="media-input"
                                                    />
                                                    Add photos/videos
                                                </label>
                                                {media.length > 0 && (
                                                    <span className="media-count">
                                                        {media.length} file(s) selected
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {mediaPreview.length > 0 && (
                                                <div className="media-preview-grid">
                                                    {mediaPreview.map((file, index) => (
                                                        <div key={index} className="preview-item">
                                                            <button 
                                                                className="remove-media"
                                                                onClick={() => {
                                                                    setMediaPreview(prev => prev.filter((_, i) => i !== index));
                                                                    setMedia(prev => prev.filter((_, i) => i !== index));
                                                                }}
                                                            >
                                                                ×
                                                            </button>
                                                            {file.type === 'video' ? (
                                                                <video controls className="preview-content">
                                                                    <source src={file.url} type="video/mp4" />
                                                                    Your browser does not support videos.
                                                                </video>
                                                            ) : (
                                                                <img 
                                                                    src={file.url} 
                                                                    alt={`Preview ${index + 1}`}
                                                                    className="preview-content"
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-footer">
                                        <button 
                                            type="submit" 
                                            className="publish-button"
                                            disabled={!title.trim() || !content.trim()}
                                        >
                                            Post
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="news-container">
                <h2>Latest News</h2>
                {news.map((article, index) => (
                    <div key={index} className="news-item">
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                            <h4>{article.title}</h4>
                            <p>{article.description}</p>
                        </a>
                    </div>
                ))}
            </div>
        </div>        
    );
};

export default Blog;