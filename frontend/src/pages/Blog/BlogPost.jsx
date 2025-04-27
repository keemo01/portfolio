import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Blog.css';
const BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Comment = ({ comment, onReply, onDelete, currentUser }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmitReply = (e) => {
    e.preventDefault();
    onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div className={`comment ${comment.parent ? 'reply' : ''}`}>
      <div className="comment-header">
        <span className="comment-author">{comment.author}</span>
        <span className="comment-date">
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="comment-content">{comment.content}</p>
      <div className="comment-actions">
        {currentUser && (
          <button
            className="reply-button"
            onClick={() => setShowReplyForm(!showReplyForm)}
          >
            Reply
          </button>
        )}
        {currentUser && currentUser.username === comment.author && (
          <button
            className="delete-button"
            onClick={() => onDelete(comment.id)}
          >
            Delete
          </button>
        )}
      </div>
      {showReplyForm && (
        <form className="comment-form reply-form" onSubmit={handleSubmitReply}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            required
          />
          <div className="form-buttons">
            <button type="button" onClick={() => setShowReplyForm(false)}>
              Cancel
            </button>
            <button type="submit">Reply</button>
          </div>
        </form>
      )}
      {comment.replies &&
        comment.replies.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onDelete={onDelete}
            currentUser={currentUser}
          />
        ))}
    </div>
  );
};

export default function BlogPost() {
  const { id } = useParams();
  const { user } = useContext(UserContext);
  const [blog, setBlog] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [notFound, setNotFound] = useState(false);
 



  const handleDownloadMedia = async (url) => {
    try {
      // Fetch the file
      const response = await fetch(url, { mode: 'cors' });
      // Convert to blob
      const blob = await response.blob();
      // Create a temporary URL
      const objectURL = URL.createObjectURL(blob);
      // Extract filename
      const filename = url.split('/').pop().split('?')[0];
      // Build download link
      const link = document.createElement('a');
      link.href = objectURL;
      link.download = filename;
      // Click to download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Release URL
      URL.revokeObjectURL(objectURL);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };
  

  // Format a date string 
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',  
      day: 'numeric',   
      year: 'numeric', 
    });
  };
  
  // Format a time string as “5:30PM”
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date
      .toLocaleTimeString('en-US', {
        hour: 'numeric',    
        minute: '2-digit', 
        hour12: true,
      })
      .replace(' ', ''); 
  };
  
  useEffect(() => {
    const fetchBlogPost = async () => {
      const token = localStorage.getItem('access_token');
      try {
        // load post data and its comments in parallel
        const [blogRes, commentsRes] = await Promise.all([
          axios.get(`${BASE_URL}/blogs/${id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BASE_URL}/blogs/${id}/comments/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
  
        setBlog(blogRes.data);              // store the post
        setComments(commentsRes.data || []); // store comments
        setNotFound(false);                  // clear any 404 state
      } catch (err) {
        console.error('Error fetching blog post:', err);
        if (err.response?.status === 404) setNotFound(true); // show “not found”
        setBlog(null);
      }
    };
  
    fetchBlogPost();
  }, [id]);  // re-run when the post ID changes

  
  
  // Handle new comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();                            // stop the form from reloading
    const token = localStorage.getItem('access_token');
    try {
      const res = await axios.post(
        `${BASE_URL}/blogs/${id}/comments/`,
        { content: newComment, blog: id },         // comment payload
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([res.data, ...comments]);        // add new comment
      setNewComment('');                           // clear input
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };
  

// Post a reply to a comment, then refresh the list
const handleReply = async (parentId, content) => {
    const token = localStorage.getItem('access_token');  // grab auth token
    try {
      // send reply data
      await axios.post(
        `${BASE_URL}/blogs/${id}/comments/`,
        { content, parent: parentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // reload comments after reply
      const commentsRes = await axios.get(
        `${BASE_URL}/blogs/${id}/comments/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(commentsRes.data);  // update state
    } catch (err) {
      console.error('Error posting reply:', err);  // log failures
    }
  };
  
  // Delete a comment and remove it from view
  const handleDeleteComment = async (commentId) => {
    const token = localStorage.getItem('access_token');  // grab auth token
    try {
      // request deletion
      await axios.delete(
        `${BASE_URL}/comments/${commentId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // filter out the deleted comment
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);  // log failures
    }
  };
  
  if (notFound) {
    return (
      <div className="blog-container">
        <Link to="/blog" className="back-link">← Back to Blog</Link>
        <div className="error-message">
          <h2>Blog Post Not Found</h2>
          <p>The blog post you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!blog) return <div className="blog-container">Loading...</div>;

  return (
    <div className="blog-container">
      <Link to="/blog" className="back-link">← Back to Blog</Link>
      <div className="blog-post detailed-post">


        {blog.media && blog.media.length > 0 && (
          <div className="blog-media-container">
            {blog.media.map((file, idx) => (
              <div key={idx} className="blog-media-item">
                {/\.(mp4|mov)$/i.test(file.file) ? (
                  <video controls className="blog-media-content">
                    <source src={file.file} type="video/mp4" />
                    Your browser does not support videos.
                  </video>
                ) : (
                  <img
                    src={file.file}
                    alt={`Blog media ${idx + 1}`}
                    className="blog-media-content"
                  />
                )}
                <button
                  type="button"
                  className="download-media-button"
                  onClick={() => handleDownloadMedia(file.file)}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="post-footer">
          <span>{formatDate(blog.created_at)} - {formatTime(blog.created_at)}</span>
          <span className="author">By {blog.author}</span>
        </div>
      </div>

      <div className="comments-section">
        <h3>Comments</h3>
        {user && (
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              required
            />
            <button type="submit">Comment</button>
          </form>
        )}
        <div className="comments-list">
          {comments.map((c) => (
            <Comment
              key={c.id}
              comment={c}
              onReply={handleReply}
              onDelete={handleDeleteComment}
              currentUser={user}
            />
          ))}
        </div>
      </div>
    </div>
  );
}