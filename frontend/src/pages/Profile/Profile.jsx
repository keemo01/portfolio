import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import axios from 'axios';
import './Profile.css';

const BASE_URL = 'http://127.0.0.1:8000/api';

const ProfilePage = () => {
  const { user, updateUser } = useUser();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    // Check if we need to fetch user data
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

  // Update username when user data is available
  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    const fetchUserBlogs = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError("Authentication token not found");
          setLoading(false);
          return;
        }

        const response = await axios.get(`${BASE_URL}/user-blogs/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let blogsData = Array.isArray(response.data) ? response.data : response.data.blogs || [];
        setBlogs(blogsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching blogs:", err.response || err);
        setError("Failed to fetch blogs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserBlogs();
  }, [user?.id]);

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
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
            
            <label>New Password:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            
            <div className="popup-actions">
              <button onClick={handleUpdateProfile} className="save-button">Save</button>
              <button onClick={() => setIsEditing(false)} className="cancel-button">Cancel</button>
            </div>
            
            {updateMessage && <p className="update-message">{updateMessage}</p>}
          </div>
        </div>
      )}

      <h3>Your Blogs</h3>

      {loading ? (
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
              <a href={`/blog/${blog.id}`} className="read-more-link">Read More</a>
            </div>
          </div>          
          ))}
        </div>
      ) : (
        <p className="no-blogs-message">No blogs created yet.</p>
      )}
    </div>
  );
};

export default ProfilePage;
