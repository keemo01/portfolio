import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserProfile.css';

const BASE_URL = 'http://127.0.0.1:8000/api';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate(); 
  const [userProfile, setUserProfile] = useState(null);
  const [userBlogs, setUserBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Get the current user from local storage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token'); // Get the token from local storage
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      };

      try {
        // Fetch the user profile (using the updated serializer that returns followers_count and is_following)
        const profileResponse = await axios.get(
          `${BASE_URL}/user/profile/${userId}/`,
          config
        );
        const profileData = profileResponse.data.data;
        setUserProfile(profileData);
        setFollowersCount(profileData.followers_count || 0);
        setIsFollowing(profileData.is_following);

        // Fetch the user's blog posts
        const postsResponse = await axios.get(
          `${BASE_URL}/user/${userId}/posts/`,
          config
        );
        setUserBlogs(postsResponse.data.data);
      } catch (err) {
        console.error("Error fetching user data:", err);
        if (err.response?.status === 401) {
          setError("Please login to view this profile");
        } else {
          setError("Failed to load user profile. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, currentUser]);

  const handleFollow = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
      };

      const response = await axios.post(
        `${BASE_URL}/follow/${userId}/`,
        {},
        config
      );
      alert(response.data.detail);
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    } catch (err) {
      console.error("Error following user:", err.response || err);
      alert("Failed to follow user. Please try again.");
    }
  };

  const handleUnfollow = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
      };

      const response = await axios.post(
        `${BASE_URL}/unfollow/${userId}/`,
        {},
        config
      );
      alert(response.data.detail);
      setIsFollowing(false);
      setFollowersCount(prev => (prev > 0 ? prev - 1 : 0));
    } catch (err) {
      console.error("Error unfollowing user:", err.response || err);
      alert("Failed to unfollow user. Please try again.");
    }
  };

  return (
    <div className="user-profile-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {loading ? (
        <p className="message">Loading...</p>
      ) : error ? (
        <p className="message error">{error}</p>
      ) : userProfile ? (
        <>
          <div className="profile-header">
            <h2>{userProfile.username}'s Profile</h2>
            {userProfile.email && <p className="profile-email">{userProfile.email}</p>}
            {userProfile.bio && <p className="profile-bio">{userProfile.bio}</p>}
            <p>Followers: {followersCount}</p>
          </div>

          {/* Show follow/unfollow only if not viewing your own profile */}
          {currentUser?.id !== userProfile.id && (
            <div className="follow-button-container">
              {isFollowing ? (
                <button onClick={handleUnfollow} className="unfollow-button">
                  Unfollow
                </button>
              ) : (
                <button onClick={handleFollow} className="follow-button">
                  Follow
                </button>
              )}
            </div>
          )}

          <h3>Blog Posts</h3>
          {userBlogs.length > 0 ? (
            <div className="blog-grid">
              {userBlogs.map(blog => (
                <div key={blog.id} className="blog-card">
                  <Link to={`/blog/${blog.id}`} className="blog-title">
                    <h4>{blog.title}</h4>
                  </Link>
                  <p className="blog-excerpt">
                    {blog.content.length > 150 ? `${blog.content.substring(0, 150)}...` : blog.content}
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
                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                    <Link to={`/blog/${blog.id}`} className="read-more-link">
                      Read More
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-blogs-message">This user hasn't created any blogs yet.</p>
          )}
        </>
      ) : (
        <p className="message error">User not found</p>
      )}
    </div>
  );
};

export default UserProfile;