import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import axios from 'axios';
import './Profile.css';

const BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProfilePage = () => {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  // 'blogs', 'bookmarks'
  const [activeTab, setActiveTab] = useState('blogs');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [error, setError] = useState(null);
  const [bookmarkError, setBookmarkError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [updateMessage, setUpdateMessage] = useState(null);
  
  // State variables for modals
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
 
  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // This function checks if the user is logged in and fetches their data
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

  useEffect(() => {
    if (user?.username) {
      setUsername(user.username); // Set the username from user data
    }
  }, [user]);

  // This function fetches the blogs of the current user
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

  // This function fetches the bookmarks of the current user
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

  // This function fetches the followers of the current user
  const fetchFollowers = useCallback(async () => {
    if (!user?.id) return;
    setLoadingFollowers(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}/user/${user.id}/followers/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFollowers(response.data.followers);
    } catch (err) {
      console.error("Error fetching followers:", err.response || err);
    } finally {
      setLoadingFollowers(false);
    }
  }, [user?.id]);

  // This function fetches the users that the current user is following
  const fetchFollowing = useCallback(async () => {
    if (!user?.id) return;
    setLoadingFollowing(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}/user/${user.id}/following/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFollowing(response.data.following);
    } catch (err) {
      console.error("Error fetching following:", err.response || err);
    } finally {
      setLoadingFollowing(false);
    }
  }, [user?.id]);

  // Always fetch followers and following on user load
  useEffect(() => {
    if (user?.id) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [user?.id, fetchFollowers, fetchFollowing]);

  useEffect(() => {
    if (activeTab === 'bookmarks' && user?.id) {
      fetchBookmarks();
    }
  }, [user?.id, activeTab, fetchBookmarks]);

  // This function handles the profile update
  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.put(
        `${BASE_URL}/update-profile/`,
        { username, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser({ ...user, username });
      setUpdateMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      setUpdateMessage("Failed to update profile. Please try again.");
      console.error("Profile update error:", err);
    }
  };

  // This function adds a bookmark to the current user's bookmarks
  const handleAddBookmark = async (blogId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${BASE_URL}/add-bookmark/${blogId}/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(response.data.detail);
      if (activeTab === 'bookmarks') {
        fetchBookmarks(); // Refresh bookmarks after adding
      }
    } catch (err) {
      console.error("Error adding bookmark:", err.response || err);
      setBookmarkError("Failed to add bookmark. Please try again.");
    }
  };

  // This function removes a bookmark from the current user's bookmarks
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
      <div className="profile-header"> 
        <div className="header-info">
          <h2>{user ? `${user.username}'s Profile` : "Profile"}</h2>
          <div className="profile-stats">
            {/* Display followers and following counts */}
            <span onClick={() => setShowFollowersModal(true)} style={{ cursor: 'pointer' }}>
              <strong>{followers.length}</strong> Followers
            </span>
            {/* Add a separator */}
            <span onClick={() => setShowFollowingModal(true)} style={{ cursor: 'pointer' }}>
              <strong>{following.length}</strong> Following
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsEditing(true)} className="edit-profile-button">
            Edit Profile
          </button>
        </div>
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

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="popup" onClick={() => setShowFollowersModal(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3>Followers</h3>
            {loadingFollowers ? (
              <p className="message">Loading...</p>
            ) : followers.length > 0 ? (
              <div className="followers-list">
                {followers.map(follower => (
                  <Link 
                    key={follower.id} 
                    to={`/profile/${follower.id}`}
                    onClick={() => setShowFollowersModal(false)}
                    className="suggestion-item"
                  >
                    <p>{follower.username}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p>No followers found.</p>
            )}
            <button onClick={() => setShowFollowersModal(false)} className="cancel-button">Close</button>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="popup" onClick={() => setShowFollowingModal(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h3>Following</h3>
            {loadingFollowing ? (
              <p className="message">Loading...</p>
            ) : following.length > 0 ? (
              <div className="following-list">
                {following.map(userFollowing => (
                  <Link 
                    key={userFollowing.id} 
                    to={`/profile/${userFollowing.id}`}
                    onClick={() => setShowFollowingModal(false)}
                    className="suggestion-item"
                  >
                    <p>{userFollowing.username}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p>Not following anyone.</p>
            )}
            <button onClick={() => setShowFollowingModal(false)} className="cancel-button">Close</button>
          </div>
        </div>
      )}

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
                const blog = bookmark.blog;
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
                      <span>Published: {new Date(blog.created_at).toLocaleDateString()}</span>
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
};

export default ProfilePage;