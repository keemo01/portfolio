import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import axios from 'axios';
import './Profile.css'; // Ensure this file exists

const BASE_URL = 'http://127.0.0.1:8000/api';

const ProfilePage = () => {
  const { user } = useUser();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    const fetchUserBlogs = async () => {
        // Check if the user is logged in
        if (!user) {
            console.warn("User not logged in");
            setError("Please login to view your blogs"); // Show error if no user is logged in
            setLoading(false); // Stop loading
            return;
        }

        setLoading(true); // Start loading state
        setError(null); // Reset any previous errors
        
        try {
            // Get the authentication token from localStorage
            const token = localStorage.getItem('access_token');

            // Fetch user blogs from the API with the token for authorization
            const response = await axios.get(`${BASE_URL}/user-blogs/`, {
                headers: {
                    'Authorization': `Bearer ${token}` // Include the token in the request headers
                }
            });

            // Check if response data is an array or an object and extract blogs
            let blogsData = Array.isArray(response.data) ? response.data : response.data.blogs || [];
            setBlogs(blogsData); // Set blogs data to state
        } catch (err) {
            // Handle any errors during the API request
            console.error("Error fetching user blogs:", err.response || err);
            setError("Failed to fetch blogs. Please try again."); // Show error message to user
        } finally {
            setLoading(false); // Stop loading state regardless of success or failure
        }
    };

    fetchUserBlogs(); // Call the function to fetch blogs
}, [user]); // Re-run this effect when the `user` value changes


const handleUpdateProfile = async () => {
  try {
      // Get the authentication token from local storage
      const token = localStorage.getItem('access_token');
      // Send updated profile data to the API, along with the authentication token
      const response = await axios.put(`${BASE_URL}/update-profile/`, 
          { username, password },  // Profile data to update
          { headers: { 'Authorization': `Bearer ${token}` } } // Include token in headers for authentication
      );
      setUpdateMessage("Profile updated successfully!"); // Show success message
      setIsEditing(false); // Close the editing form or state
  } catch (err) {
      setUpdateMessage("Failed to update profile. Please try again."); // Show error message if update fails
      console.error("Profile update error:", err.response || err); // Log the error for debugging
  }
};


  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>{user ? `${user.username}'s Profile` : "Profile"}</h2>
        <button onClick={() => setIsEditing(true)} className="edit-profile-button">Edit Profile</button>
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