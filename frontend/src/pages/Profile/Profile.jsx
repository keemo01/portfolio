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

  useEffect(() => {
    const fetchUserBlogs = async () => {
      // Check if the user is authenticated.
      if (!user) {
        console.warn("User not logged in");
        setError("Please login to view your blogs");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${BASE_URL}/user-blogs/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log("User blogs response:", response.data);
        
        // Determine shape of response data.
        // Your backend may return an object with a 'blogs' key or an array directly.
        let blogsData = [];
        if (Array.isArray(response.data)) {
          blogsData = response.data;
        } else if (response.data.blogs) {
          blogsData = response.data.blogs;
        } else {
          blogsData = response.data;
        }
        
        setBlogs(blogsData);
      } catch (err) {
        console.error("Error fetching user blogs:", err.response || err);
        setError("Failed to fetch blogs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserBlogs();
  }, [user]);

  console.log("Rendering ProfilePage with blogs:", blogs);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>{user ? `${user.username}'s Profile` : "Profile"}</h2>
      </div>

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
              <p className="blog-excerpt">
                {blog.content.substring(0, 100)}...
              </p>
              
              {/* Render media if available */}
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
                <span>
                  Published: {new Date(blog.created_at).toLocaleDateString()}
                </span>
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
    </div>
  );
};

export default ProfilePage;
