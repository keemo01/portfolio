import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import axios from 'axios';
import './Profile.css';

const BASE_URL = 'http://127.0.0.1:8000/api';

const ProfilePage = () => {
  const { user, updateUser } = useUser();
  const [blogs, setBlogs] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTab, setActiveTab] = useState('blogs'); // 'blogs' or 'bookmarks'
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [error, setError] = useState(null);
  const [bookmarkError, setBookmarkError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [updateMessage, setUpdateMessage] = useState(null);

  // Fetch user data if not already loaded
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !user) {
      const fetchUserData = async () => {
        try {
          const response = await axios.get(`${BASE_URL}/user/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          updateUser(response.data);
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to load user profile");
        }
      };
      fetchUserData();
    }
  }, [user, updateUser]);

  // Set initial username from user data
  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  // Fetch user's own blogs
  useEffect(() => {
    const fetchUserBlogs = async () => {
      if (!user || !user.username) {
        // User is not logged in or username is not available
        return;
      }
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError("Authentication token not found");
          setLoadingBlogs(false);
          return;
        }
        
        // Make the API call to fetch blogs
        const response = await axios.get(`${BASE_URL}/user-blogs/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Check if the response is valid
        setBlogs(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching blogs:", err.response || err);
        setError("Failed to fetch blogs. Please try again.");
      } finally {
        setLoadingBlogs(false);
      }
    };

    if (activeTab === 'blogs') {
      fetchUserBlogs();
    }
  }, [user?.id, activeTab]);

  // Fetch user's bookmarked posts
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user?.id) {
        setLoadingBookmarks(false);
        return;
      }
      setLoadingBookmarks(true);
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${BASE_URL}/user-bookmarks/`, {
          headers: { Authorization: `Bearer ${token}` },
        });        
        setBookmarks(response.data);
        setBookmarkError(null);
      } catch (err) {
        console.error("Error fetching bookmarks:", err.response || err);
        setBookmarkError("Failed to fetch bookmarks. Please try again.");
      } finally {
        setLoadingBookmarks(false);
      }
    };

    if (activeTab === 'bookmarks') {
      fetchBookmarks();
    }
  }, [user?.id, activeTab]);

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.put(
        `${BASE_URL}/update-profile/`,
        { username, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the user context with the new data
      updateUser({
        ...user,
        username: username
      });
      
      setUpdateMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setUpdateMessage("Failed to update profile. Please try again.");
      console.error("Profile update error:", err);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        {/* Display user profile information */}
        <h2>{user ? `${user.username}'s Profile` : "Profile"}</h2>
        <button onClick={() => setIsEditing(true)} className="edit-profile-button">
          Edit Profile
        </button>
      </div>

      {isEditing && (
        <div className="popup">
          <div className="popup-content">
            <h3>Edit Profile</h3>
            <label>Username:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
            
            <label>New Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            
            <div className="popup-actions">
              <button onClick={handleUpdateProfile} className="save-button">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="cancel-button">
                Cancel
              </button>
            </div>
            
            {updateMessage && <p className="update-message">{updateMessage}</p>}
          </div>
        </div>
      )}

      {/* Tabs for switching between user blogs and bookmarks */}
      <div className="profile-tabs">
        <button 
          className={activeTab === 'blogs' ? 'active' : ''}
          onClick={() => setActiveTab('blogs')}
        >
          Your Blogs
        </button>
        <button 
          className={activeTab === 'bookmarks' ? 'active' : ''}
          onClick={() => setActiveTab('bookmarks')}
        >
          Bookmarked Posts
        </button>
      </div>

      {activeTab === 'blogs' && (
        <>
          <h3>Your Blogs</h3>
          {loadingBlogs ? (
            <p className="message">Loading...</p>
          ) : error ? (
            <p className="message error">{error}</p>
          ) : blogs.length > 0 ? (
            <div className="blog-grid">
              {blogs.map(blog => (
                <div key={blog.id} className="blog-card">
                  <h4>{blog.title}</h4>
                  <p className="blog-excerpt">{blog.content.substring(0, 100)}...</p>
                  {blog.media && blog.media.length > 0 && (
                    <div className="post-media">
                      {blog.media.map((mediaObj, index) => (
                        mediaObj.file.endsWith('.mp4') || mediaObj.file.endsWith('.mov') ? (
                          <video key={index} controls className="blog-video">
                            <source src={mediaObj.file} type="video/mp4" />
                            Your browser does not support videos.
                          </video>
                        ) : (
                          <img key={index} src={mediaObj.file} alt="Blog Media" className="blog-image" />
                        )
                      ))}
                    </div>
                  )}
                  <div className="blog-metadata">
                    <span>Published: {new Date(blog.created_at).toLocaleDateString()}</span>
                    <a href={`/blog/${blog.id}`} className="read-more-link">
                      Read More
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-blogs-message">No blogs created yet.</p>
          )}
        </>
      )}

      {activeTab === 'bookmarks' && (
        <>
          <h3>Bookmarked Posts</h3>
          {loadingBookmarks ? (
            <p className="message">Loading bookmarks...</p>
          ) : bookmarkError ? (
            <p className="message error">{bookmarkError}</p>
          ) : bookmarks.length > 0 ? (
            <div className="blog-grid">
              {bookmarks.map(blog => (
                <div key={blog.id} className="blog-card">
                  <h4>{blog.title}</h4>
                  <p className="blog-excerpt">{blog.content.substring(0, 100)}...</p>
                  {blog.media && blog.media.length > 0 && (
                    <div className="post-media">
                      {blog.media.map((mediaObj, index) => (
                        mediaObj.file.endsWith('.mp4') || mediaObj.file.endsWith('.mov') ? (
                          <video key={index} controls className="blog-video">
                            <source src={mediaObj.file} type="video/mp4" />
                            Your browser does not support videos.
                          </video>
                        ) : (
                          <img key={index} src={mediaObj.file} alt="Blog Media" className="blog-image" />
                        )
                      ))}
                    </div>
                  )}
                  <div className="blog-metadata">
                    <span>Published: {new Date(blog.created_at).toLocaleDateString()}</span>
                    <a href={`/blog/${blog.id}`} className="read-more-link">
                      Read More
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-blogs-message">No bookmarked posts found.</p>
          )}
        </>
      )}
    </div>
  );
};

export default ProfilePage;