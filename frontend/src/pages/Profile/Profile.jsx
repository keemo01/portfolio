import React, { useState, useEffect, useCallback } from 'react';
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
            headers: { Authorization: `Bearer ${token}` },
          });
          updateUser(response.data);
        } catch (err) {
          console.error("Error fetching user data:", err);
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
      if (!user || !user.username) return;
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError("Authentication token not found");
          setLoadingBlogs(false);
          return;
        }
        const response = await axios.get(`${BASE_URL}/user-blogs/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Check if response.data is an array or an object
        setBlogs(response.data.blogs || response.data);
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

  // Extracted function to fetch user's bookmarked posts
  const fetchBookmarks = useCallback(async () => {
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
  }, [user?.id]);

  // Fetch bookmarks when the bookmarks tab becomes active
  useEffect(() => {
    if (activeTab === 'bookmarks' && user?.id) {
      fetchBookmarks();
    }
  }, [user?.id, activeTab, fetchBookmarks]);

  // Handler for updating profile info
  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.put(
        `${BASE_URL}/update-profile/`,
        { username, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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

  // Handler for adding a bookmark from any page
  const handleAddBookmark = async (blogId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${BASE_URL}/add-bookmark/${blogId}/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(response.data.detail);
      if (activeTab === 'bookmarks') {
        fetchBookmarks();
      }
    } catch (err) {
      console.error("Error adding bookmark:", err.response || err);
      setBookmarkError("Failed to add bookmark. Please try again.");
    }
  };

  // Handler for removing a bookmark from any page
  const handleRemoveBookmark = async (blogId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.delete(`${BASE_URL}/remove-bookmark/${blogId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(response.data.detail);
      if (activeTab === 'bookmarks') {
        fetchBookmarks();
      }
    } catch (err) {
      console.error("Error removing bookmark:", err.response || err);
      setBookmarkError("Failed to remove bookmark. Please try again.");
    }
  };

  return (
    <div className="profile-container">
      {/* Render the header with the user's profile name and an edit button */}
      <div className="profile-header">
        <h2>{user ? `${user.username}'s Profile` : "Profile"}</h2>
        <button onClick={() => setIsEditing(true)} className="edit-profile-button">
          Edit Profile
        </button>
      </div>
  
      {/* Render the edit profile popup when isEditing is true */}
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
              {/* Call the update function when the user clicks Save */}
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
  
      {/* Allows the tabs for switching between "Your Blogs" and "Bookmarked Posts" */}
      <div className="profile-tabs">
        <button 
          className={activeTab === 'blogs' ? 'active' : ''}
          onClick={() => setActiveTab('blogs')}
        >
          Your Posts
        </button>
        <button 
          className={activeTab === 'bookmarks' ? 'active' : ''}
          onClick={() => setActiveTab('bookmarks')}
        >
          Saved Posts
        </button>
      </div>
  
      {/* Display the user's blogs when the blogs tab is active */}
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
                  <p className="blog-excerpt">
                    {/* Before calling the substring meth ensure that blog.content is declared and of type string. */}
                    {blog.content && typeof blog.content === 'string'
                      ? blog.content.substring(0, 100)
                      : 'No content available.'}
                    ...
                  </p>
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
                    {/* Include a button to add the blog as a bookmark */}
                    <button
                      onClick={() => handleAddBookmark(blog.id)}
                      className="bookmark-button"
                    >
                      Bookmark
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-blogs-message">No blogs created yet.</p>
          )}
        </>
      )}
  
      {/* render the bookmarked posts when the bookmarks tab is active */}
      {activeTab === 'bookmarks' && (
  <>
    <h3>Bookmarked Posts</h3>
    {loadingBookmarks ? (
      <p className="message">Loading bookmarks...</p>
    ) : bookmarkError ? (
      <p className="message error">{bookmarkError}</p>
    ) : bookmarks.length > 0 ? (
      <div className="blog-grid">
        {bookmarks.map((bookmark) => {
          const blog = bookmark.blog; // Assuming bookmark has a 'blog' property
          return (
            <div key={bookmark.id} className="blog-card">
              <h4>{blog?.title}</h4>
              <p className="blog-excerpt">
                {blog?.content && typeof blog.content === 'string'
                  ? blog.content.substring(0, 100)
                  : 'No content available.'}
                ...
              </p>
              {blog?.media && blog.media.length > 0 && (
                <div className="post-media">
                  {blog.media.map((mediaObj, index) => (
                    mediaObj.file.endsWith('.mp4') || mediaObj.file.endsWith('.mov') ? (
                      <video key={index} controls className="blog-video">
                        <source src={mediaObj.file} type="video/mp4" />
                        Your browser does not support videos.
                      </video>
                    ) : (
                      <img
                        key={index}
                        src={mediaObj.file}
                        alt="Blog Media"
                        className="blog-image"
                      />
                    )
                  ))}
                </div>
              )}
              <div className="blog-metadata">
                <span>
                  Published: {new Date(blog.created_at).toLocaleDateString()}
                </span>
                <a href={`/blog/${blog.id}`} className="read-more-link">
                  Read More
                </a>
                <button
                  onClick={() => handleRemoveBookmark(blog.id)}
                  className="remove-bookmark-button"
                >
                  Remove Bookmark
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="no-blogs-message">No bookmarked posts found.</p>
    )}
  </>
)}

    </div>
  );
}
export default ProfilePage;