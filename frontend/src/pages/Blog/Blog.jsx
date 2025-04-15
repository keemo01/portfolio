import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Blog.css';

const BASE_URL = 'http://127.0.0.1:8000/api';
const NEWS_API_KEY = '7e07333e33234db8ac28e319fd52cdd4';

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  return `${date.toLocaleDateString('en-US', dateOptions)} - ${date.toLocaleTimeString('en-US', timeOptions).replace(' ', '')}`;
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

const Blog = () => {
  const [state, setState] = useState({
    blogs: [],
    title: '',
    content: '',
    media: [],
    isFormOpen: false,
    error: null,
    searchQuery: '',
    searchResults: { users: [], blogs: [] },
    isSearching: false,
    showSuggestions: false,
    news: [],
    mediaPreview: [],
    isLoading: true
  });

  // likeData holds an object with blogId keys mapped to { likeCount, liked }
  const [likeData, setLikeData] = useState({});

  const { user } = useContext(UserContext);

  // Fetch blogs along with their like counts
  const fetchBlogs = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/blogs/`);
      const blogs = response.data;
      setState(prev => ({ ...prev, blogs }));
      // For each blog, fetch like count
      const updatedLikeData = {};
      await Promise.all(
        blogs.map(async (blog) => {
          try {
            const res = await axios.get(`${BASE_URL}/blogs/${blog.id}/like/count/`);
            updatedLikeData[blog.id] = { 
              likeCount: res.data.like_count, 
              liked: false // default value; toggled when user clicks the button
            };
          } catch (error) {
            updatedLikeData[blog.id] = { likeCount: 0, liked: false };
          }
        })
      );
      setLikeData(updatedLikeData);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load blogs. Please refresh the page.'
      }));
    }
  };

  const fetchNews = async () => {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          apiKey: NEWS_API_KEY,
          q: 'cryptocurrency OR bitcoin OR crypto',
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 8,
        }
      });
      setState(prev => ({
        ...prev,
        news: response.data?.articles?.slice(0, 10) || []
      }));
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchBlogs(), fetchNews()]);
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to load data. Please refresh the page.'
        }));
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    fetchData();
    return () => {
      state.mediaPreview.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, []);

  // Search handler with a slight delay
  const handleSearch = async (query) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      showSuggestions: query.length > 0
    }));
    
    if (!query.trim()) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        searchResults: { users: [], blogs: [] }
      }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true }));
    try {
      const response = await axios.get(`${BASE_URL}/api/search/?q=${query}`);
      setState(prev => ({
        ...prev,
        searchResults: {
          users: response.data.users || [],
          blogs: response.data.blogs || []
        }
      }));
    } catch (error) {
      console.error('Search error:', error);
      setState(prev => ({
        ...prev,
        error: 'Search failed. Please try again.'
      }));
    }
  };

  // Bookmark handler
  const handleBookmark = async (blogId) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/add-bookmark/${blogId}/`, 
        {},
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          }
        }
      );
      alert(res.data.detail); // Display success message
    } catch (error) {
      console.error("Error bookmarking blog:", error);
      if (error.response) {
        console.error("Server response:", error.response.data);
      }
      alert("Error bookmarking blog. Please try again.");
    }
  };

  // Delete blog handler (only available to the blog author)
  const handleDeleteBlog = async (blogId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this blog post?');
    if (!confirmDelete) return;
    try {
      await axios.delete(`${BASE_URL}/blogs/delete/${blogId}/`, {
        headers: { 
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
      });
      setState(prev => ({
        ...prev,
        blogs: prev.blogs.filter(blog => blog.id !== blogId)
      }));
    } catch (error) {
      console.error('Error deleting blog:', error);
      if (error.response && error.response.status === 403) {
        setState(prev => ({
          ...prev,
          error: 'You can only delete your own blog posts.'
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: 'Unable to delete blog. Try again.'
        }));
      }
    }
  };

  // Create blog handler
  const handleCreateBlog = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', state.title.trim());
    formData.append('content', state.content.trim());
    state.media.forEach((file) => {
      formData.append('media', file);
    });
    
    try {
      await axios.post(`${BASE_URL}/blogs/create/`, formData, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setState(prev => ({
        ...prev,
        title: '',
        content: '',
        media: [],
        isFormOpen: false
      }));
      fetchBlogs();
    } catch (error) {
      console.error('Error creating blog:', error.response?.data || error.message);
      setState(prev => ({
        ...prev,
        error: 'Unable to create blog. Please check your input and try again.'
      }));
    }
  };

  // Handle media file change and create preview URLs
  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));
    setState(prev => ({
      ...prev,
      media: files,
      mediaPreview: previews
    }));
  };

  // Toggle like functionality for a blog post
    const toggleLike = async (blogId) => {
        if (!user) {
        alert("Please log in to like posts.");
        return;
        }
        try {
        // Check if the user has already liked the post
        const currentLiked = likeData[blogId]?.liked || false;
        // Send a request to toggle the like status
        await axios.post(`${BASE_URL}/blogs/${blogId}/like/`, {}, {
            headers: {
            'Authorization': `Bearer ${user.token}`
            }
        });
        // Update the local state
        const newLiked = !currentLiked;
        // Fetch the updated like count
        const countRes = await axios.get(`${BASE_URL}/blogs/${blogId}/like/count/`);
        setLikeData(prev => ({
            ...prev,
            [blogId]: {
            likeCount: countRes.data.like_count,
            liked: newLiked
            }
        }));
        } catch (error) {
        console.error("Error toggling like:", error);
        alert("Error processing like. Please try again.");
        }
    };
  

  // Delay search while typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(state.searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [state.searchQuery]);

  // Filter blogs locally based on the search query (if not using API results)
  const filteredBlogs = state.blogs.filter(blog => 
    blog.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
    blog.content.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  return (
    <div className="blog-container">
      <div className="main-content">
        <h1>
          {!state.isLoading && user ? `Welcome ${user.username}` : 'Welcome'}
        </h1>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search posts and users..."
            value={state.searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setState(prev => ({ ...prev, showSuggestions: true }))}
          />
          
          {state.showSuggestions && state.searchQuery && (
            <div className="search-suggestions">
              {state.searchResults.users?.length > 0 && (
                <div className="suggestion-section">
                  <h4>Users</h4>
                  {state.searchResults.users.slice(0, 3).map(userItem => (
                    <Link 
                      to={`/profile/${userItem.id}`} 
                      key={userItem.id} 
                      className="suggestion-item"
                      onClick={() => setState(prev => ({ ...prev, showSuggestions: false }))}
                    >
                      <span className="username">
                        {highlightText(userItem.username, state.searchQuery)}
                      </span>
                      {userItem.email && (
                        <span className="email">{userItem.email}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {state.searchResults.blogs?.length > 0 && (
                <div className="suggestion-section">
                  <h4>Posts</h4>
                  {state.searchResults.blogs.slice(0, 3).map(blog => (
                    <Link 
                      to={`/blog/${blog.id}`} 
                      key={blog.id} 
                      className="suggestion-item"
                      onClick={() => setState(prev => ({ ...prev, showSuggestions: false }))}
                    >
                      <span className="blog-title">
                        {highlightText(blog.title, state.searchQuery)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Display search results if there is a query */}
        {state.searchQuery && (
          <div className="search-results">
            {state.searchResults.users && state.searchResults.users.length > 0 && (
              <div className="search-section">
                <h3>Users</h3>
                <div className="users-list">
                  {state.searchResults.users.map(userItem => (
                    <Link 
                      to={`/profile/${userItem.id}`} 
                      key={userItem.id} 
                      className="user-result"
                    >
                      <div className="user-item">
                        <span className="username">{highlightText(userItem.username, state.searchQuery)}</span>
                        {userItem.email && (
                          <span className="email">{userItem.email}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {state.searchResults.blogs && state.searchResults.blogs.length > 0 && (
              <div className="search-section">
                <h3>Posts</h3>
                <div className="blog-posts search-posts">
                  {state.searchResults.blogs.map(blog => (
                    <div className="blog-post" key={blog.id}>
                      <div className="post-header">
                        <Link to={`/blog/${blog.id}`} className="post-title-link">
                          <h3>{highlightText(blog.title, state.searchQuery)}</h3>
                        </Link>
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

                      <div className="post-footer">
                        <span>{formatDateTime(blog.created_at)}</span>
                        <span className="author">
                            By <Link to={`/profile/${blog.author_id}`} className="author-link">{blog.author}</Link>
                        </span>
                        {user && (
                            <>
                            <button 
                                className="bookmark-btn"
                                onClick={() => handleBookmark(blog.id)}
                            >
                                Bookmark
                            </button>
                            <div className="like-container">
                                <button 
                                className={`like-btn ${likeData[blog.id]?.liked ? 'liked' : ''}`} 
                                onClick={() => toggleLike(blog.id)}
                                aria-label="Like"
                                ></button>
                                <span className="like-count">
                                {likeData[blog.id]?.likeCount || 0}
                                </span>
                            </div>
                            </>
                        )}
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!state.searchResults.users?.length && !state.searchResults.blogs?.length) && (
              <div className="no-results">
                No matching users or posts found
              </div>
            )}
          </div>
        )}

        {/* Display regular blog posts when there's no search query */}
        {!state.searchQuery && (
          <div className="blog-posts">
            {filteredBlogs.length === 0 ? (
              <div className="empty-state">
                {state.searchQuery ? "No matching posts found" : "No blog posts found"}
              </div>
            ) : (
              filteredBlogs.map((blog) => (
                <div className="blog-post" key={blog.id}>
                  <div className="post-header">
                    <Link to={`/blog/${blog.id}`} className="post-title-link">
                      <h3>{blog.title}</h3>
                    </Link>
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
                    {user && (
                      <>
                        <button 
                          className="bookmark-btn"
                          onClick={() => handleBookmark(blog.id)}
                        >
                          Bookmark
                        </button>
                        <button className="like-btn" onClick={() => toggleLike(blog.id)}>
                          {likeData[blog.id]?.liked ? 'Unlike' : 'Like'} ({likeData[blog.id]?.likeCount || 0})
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {state.error && (
          <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
            {state.error}
          </div>
        )}

        {user && (
          <>
            <button 
              className={`fab ${state.isFormOpen ? 'fab-close' : ''}`}
              onClick={() => setState(prev => ({ ...prev, isFormOpen: !prev.isFormOpen }))}
              aria-label="Create new post"
            >
              {state.isFormOpen ? '×' : '+'}
            </button>
            {state.isFormOpen && (
              <div className="modal-overlay">
                <form className="create-blog-form" onSubmit={handleCreateBlog}>
                  <div className="form-header">
                    <button 
                      type="button"
                      className="close-button"
                      onClick={() => setState(prev => ({ ...prev, isFormOpen: false }))}
                    >
                      ×
                    </button>
                    <h3>Create Post</h3>
                  </div>
                  <div className="form-content">
                    <div className="user-info">
                      <div className="avatar">
                        {user && user.username ? user.username[0].toUpperCase() : ''}
                      </div>
                      <span className="username">{user?.username}</span>
                    </div>
                    <input
                      type="text"
                      value={state.title}
                      onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Post Title"
                      required
                      maxLength={200}
                      className="title-input"
                    />
                    <textarea
                      value={state.content}
                      onChange={(e) => setState(prev => ({ ...prev, content: e.target.value }))}
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
                        {state.media.length > 0 && (
                          <span className="media-count">
                            {state.media.length} file(s) selected
                          </span>
                        )}
                      </div>
                      
                      {state.mediaPreview.length > 0 && (
                        <div className="media-preview-grid">
                          {state.mediaPreview.map((file, index) => (
                            <div key={index} className="preview-item">
                              <button 
                                className="remove-media"
                                onClick={() => {
                                  setState(prev => ({
                                    ...prev,
                                    mediaPreview: prev.mediaPreview.filter((_, i) => i !== index),
                                    media: prev.media.filter((_, i) => i !== index)
                                  }));
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
                      disabled={!state.title.trim() || !state.content.trim()}
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
        {state.news.map((article, index) => (
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
