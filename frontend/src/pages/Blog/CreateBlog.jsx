import React, { useState, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import './CreateBlog.css'; // Add CSS for styling

const CreateBlog = () => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        axios.post('http://127.0.0.1:8000/api/blogs/create/', { title, content }, {
            headers: {
                Authorization: `Token ${user.token}`,
            },
        })
        .then(() => {
            navigate('/blog'); // Redirect to the blog page after creation
        })
        .catch((error) => console.error('Error creating blog:', error));
    };

    return (
        <div className="create-blog-container">
            <h1>Create a New Blog Post</h1>
            <button className="back-button" onClick={() => navigate('/blog')}>
                Back to Blog
            </button>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Title:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Content:</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Post Blog</button>
            </form>
        </div>
    );
};

export default CreateBlog;