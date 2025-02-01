import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Blog.css';

const BlogPost = () => {
    const { id } = useParams();
    const [blog, setBlog] = useState(null);

    useEffect(() => {
        const fetchBlogPost = async () => {
            try {
                const response = await axios.get(`http://127.0.0.1:8000/api/blogs/${id}/`);
                setBlog(response.data);
            } catch (error) {
                console.error('Error fetching blog post:', error);
            }
        };
        fetchBlogPost();
    }, [id]);

    if (!blog) return <div className="blog-container">Loading...</div>;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
    };

    return (
        <div className="blog-container">
            <Link to="/blog" className="back-link">← Back to Blog</Link>
            <div className="blog-post detailed-post">
                <div className="post-header">
                    <h1>{blog.title}</h1>
                </div>
                <div className="post-content">
                    {blog.content.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>
                <div className="post-media">
                    {blog.media.map((file, index) => (
                        file.file.endsWith('.mp4') || file.file.endsWith('.mov') ? (
                            <video key={index} controls>
                                <source src={file.file} type="video/mp4" />
                                Your browser does not support videos.
                            </video>
                        ) : (
                            <img key={index} src={file.file} alt="Blog Media" />
                        )
                    ))}
                </div>
                <div className="post-footer">
                    <span>
                        {formatDate(blog.created_at)} - {formatTime(blog.created_at)}
                    </span>
                    <span className="author">By {blog.author}</span>
                </div>
            </div>
        </div>
    );
};

export default BlogPost;
