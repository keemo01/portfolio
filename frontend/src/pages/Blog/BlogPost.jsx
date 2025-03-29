import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './Blog.css';

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
                <span className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
            <p className="comment-content">{comment.content}</p>
            <div className="comment-actions">
                {currentUser && (
                    <button className="reply-button" onClick={() => setShowReplyForm(!showReplyForm)}>
                        Reply
                    </button>
                )}
                {currentUser && currentUser.username === comment.author && (
                    <button className="delete-button" onClick={() => onDelete(comment.id)}>
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
                        <button type="button" onClick={() => setShowReplyForm(false)}>Cancel</button>
                        <button type="submit">Reply</button>
                    </div>
                </form>
            )}
            {comment.replies && comment.replies.map(reply => (
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

const BlogPost = () => {
    const { id } = useParams();  // Get the blog post ID from the URL parameters
    const [blog, setBlog] = useState(null);  // State to store the blog post data
    const [comments, setComments] = useState([]);  // State to store the comments for the blog post
    const [newComment, setNewComment] = useState('');  // State to store the new comment input
    const { user } = useContext(UserContext); // Get the currently logged-in user from context
    const [notFound, setNotFound] = useState(false);  // Add this new state

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
    };

    // Fetch blog post and comments when component mounts or when `id` or `user` changes
    useEffect(() => {
        const fetchBlogPost = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const [blogResponse, commentsResponse] = await Promise.all([
                    axios.get(`http://127.0.0.1:8000/api/blogs/${id}/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }),
                    axios.get(`http://127.0.0.1:8000/api/blogs/${id}/comments/`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                ]);

                setBlog(blogResponse.data);
                setComments(commentsResponse.data || []);
                setNotFound(false);
            } catch (error) {
                console.error('Error fetching blog post:', error);
                if (error.response?.status === 404) {
                    setNotFound(true);
                }
                setBlog(null);
            }
        };

        fetchBlogPost();
    }, [id]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/api/blogs/${id}/comments/`,
                { content: newComment, blog: id },
                { 
                    headers: { 
                        'Authorization': `Bearer ${token}`
                    } 
                }
            );
            setComments([response.data, ...comments]);
            setNewComment('');
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    };

    const handleReply = async (parentId, content) => {
        const token = localStorage.getItem('access_token');
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/api/blogs/${id}/comments/`,
                { content, parent: parentId },
                { 
                    headers: { 
                        'Authorization': `Bearer ${token}`
                    } 
                }
            );
            const commentsResponse = await axios.get(
                `http://127.0.0.1:8000/api/blogs/${id}/comments/`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            setComments(commentsResponse.data);
        } catch (error) {
            console.error('Error posting reply:', error);
        }
    };

    const handleDeleteComment = async (commentId) => {
        const token = localStorage.getItem('access_token');
        try {
            await axios.delete(`http://127.0.0.1:8000/api/comments/${commentId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setComments(comments.filter(comment => comment.id !== commentId));
        } catch (error) {
            console.error('Error deleting comment:', error);
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
            <div className={`blog-post detailed-post`}>
                <div className="post-header">
                    <h1>{blog.title}</h1>
                </div>
                <div className="post-content">
                    {blog.content.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>
                {blog.media && blog.media.length > 0 && (
                    <div className="blog-media-container">
                        {blog.media.map((file, index) => (
                            <div key={index} className="blog-media-item">
                                {file.file.endsWith('.mp4') || file.file.endsWith('.mov') ? (
                                    <video controls className="blog-media-content">
                                        <source src={file.file} type="video/mp4" />
                                        Your browser does not support videos.
                                    </video>
                                ) : (
                                    <img 
                                        src={file.file} 
                                        alt={`Blog media ${index + 1}`} 
                                        className="blog-media-content"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div className="post-footer">
                    <span>
                        {formatDate(blog.created_at)} - {formatTime(blog.created_at)}
                    </span>
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
                    {comments.map(comment => (
                        <Comment
                            key={comment.id}
                            comment={comment}
                            onReply={handleReply}
                            onDelete={handleDeleteComment}
                            currentUser={user}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogPost;