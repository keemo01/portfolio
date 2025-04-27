import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Blog.css';

const BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;



// Function to format date and time
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  return `${date.toLocaleDateString('en-US', dateOptions)} - ${date
    .toLocaleTimeString('en-US', timeOptions)
    .replace(' ', '')}`;
};

// Function to highlight search query in text
const highlightText = (text, query) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index}>{part}</mark>
    ) : (
      part
    )
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
    isLoading: true,
  });
  const [likeData, setLikeData] = useState({});
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  // Fetch blogs & like‐counts
  // Fetch blog posts
  const fetchBlogs = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/blogs/`);
      console.log('Got /blogs/ →', response.data);
      const data = response.data;

      // Normalize to an array
      const blogsArray = Array.isArray(data)
        ? data
        : Array.isArray(data.blogs)
        ? data.blogs
        : [];
      
      // Set blogs in state
      setState((prev) => ({ ...prev, blogs: blogsArray }));

      // Fetch like counts in parallel
      const updatedLikeData = {};
      await Promise.all(
        blogsArray.map(async (blog) => {
          const config = user
            ? { headers: { Authorization: `Bearer ${user.token}` } }
            : {};
          try {
            // Fetch like count for each blog
            const res = await axios.get(
              `${BASE_URL}/blogs/${blog.id}/like/count/`,
              config
            );
            updatedLikeData[blog.id] = {
              likeCount: res.data.like_count,
              liked: res.data.liked,
            };
          } catch {
            updatedLikeData[blog.id] = { likeCount: 0, liked: false };
          }
        })
      );
      // Set like data in state
      setLikeData(updatedLikeData);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to load blogs. Please refresh the page.',
      }));
    }
  };

  // Fetch latest news
  const fetchNews = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/news/`);
      console.log('Got /news/ →', response.data);
      const data = response.data;

      // Normalize to an array
      const newsArray = Array.isArray(data)
        ? data
        : Array.isArray(data.articles)
        ? data.articles
        : [];

      setState((prev) => ({ ...prev, news: newsArray }));
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  // On mount, fetch both
  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    const fetchData = async () => {
      try {
        await Promise.all([fetchBlogs(), fetchNews()]);
      } catch {
        setState((prev) => ({
          ...prev,
          error: 'Failed to load data. Please refresh the page.',
        }));
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (user) fetchBlogs();
    else setLikeData({});
  }, [user]);

  // Handle search input and fetch results
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

  // Handle bookmarking a blog post
  const handleBookmark = async (blogId) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/add-bookmark/${blogId}/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        }
      );
      alert(res.data.detail);
    } catch (error) {
      console.error("Error bookmarking blog:", error);
      alert("Error bookmarking blog. Please try again.");
    }
  };

  // Handle deleting a blog post
  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await axios.delete(`${BASE_URL}/blogs/delete/${blogId}/`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
      });
      setState(prev => ({
        ...prev,
        blogs: prev.blogs.filter(blog => blog.id !== blogId)
      }));
    } catch (error) {
      console.error('Error deleting blog:', error);
      setState(prev => ({
        ...prev,
        error: 'Unable to delete blog. Try again.'
      }));
    }
  };

  // Handle creating a new blog post
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
          Authorization: `Bearer ${user.token}`,
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
      fetchBlogs(); // Refresh the blog list
    } catch (error) {
      console.error('Error creating blog:', error);
      setState(prev => ({
        ...prev,
        error: 'Unable to create blog. Please try again.'
      }));
    }
  };

  // Handle media file selection
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

  // Toggle like/unlike and refresh count
  const toggleLike = async (blogId) => {
    if (!user) {
      alert("Please log in to like posts.");
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`${BASE_URL}/blogs/${blogId}/like/`, {}, config);
      const countRes = await axios.get(
        `${BASE_URL}/blogs/${blogId}/like/count/`,
        config
      );
      setLikeData(prev => ({
        ...prev,
        [blogId]: {
          likeCount: countRes.data.like_count,
          liked: countRes.data.liked
        }
      }));
    } catch (error) {
      console.error("Error toggling like:", error);
      alert("Error processing like. Please try again.");
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(state.searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [state.searchQuery]);

  const filteredBlogs = state.blogs.filter(blog =>
    blog.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
    blog.content.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  // Renders a single post (used in both search and main list)
  const renderPost = (blog, highlight = false) => (
    <div className="blog-post" key={blog.id}>
      <div className="post-header">
        <div className="title-section">
          <span className="author">
            By <Link to={`/profile/${blog.author_id}`} className="author-link">
              {highlight ? highlightText(blog.author, state.searchQuery) : blog.author}
            </Link>
          </span>
          <Link to={`/blog/${blog.id}`} className="post-title-link">
            <h3>{highlight ? highlightText(blog.title, state.searchQuery) : blog.title}</h3>
          </Link>
        </div>
        <span className="date-created">{formatDateTime(blog.created_at)}</span>
        {user && user.username === blog.author && (
          <button className="delete-btn" onClick={() => handleDeleteBlog(blog.id)}>
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
          {(blog.media[0].file.endsWith('.mp4') || blog.media[0].file.endsWith('.mov')) ? (
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

      <div className="post-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          className={`like-btn ${likeData[blog.id]?.liked ? 'liked' : ''}`}
          onClick={() => toggleLike(blog.id)}
          aria-label={likeData[blog.id]?.liked ? 'Unlike' : 'Like'}
        >
          {likeData[blog.id]?.liked ? '💔' : '❤️'} {likeData[blog.id]?.likeCount ?? 0}
        </button>
        {user && (
          <button className="bookmark-btn" onClick={() => handleBookmark(blog.id)}>
            🔖
          </button>
        )}
      </div>
    </div>
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

        {state.searchQuery ? (
          <div className="search-results">
            {state.searchResults.blogs.length > 0
              ? state.searchResults.blogs.map(b => renderPost(b, true))
              : <div className="no-results">No matching posts found</div>
            }
          </div>
        ) : (
          <div className="blog-posts">
            {filteredBlogs.length > 0
              ? filteredBlogs.map(b => renderPost(b))
              : <div className="empty-state">No blog posts found</div>
            }
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
                      <span className="username">{user.username}</span>
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
