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
                <div className="post-footer">
                    <span>
                        {new Date(blog.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                        })} - {new Date(blog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="author">By {blog.author}</span>
                </div>
            </div>
        </div>
    );
};

export default BlogPost;