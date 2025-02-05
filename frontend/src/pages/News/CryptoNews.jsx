import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import './CryptoNews.css';

const CryptoNews = () => {
    const { user } = useContext(UserContext);
    const [newsArticles, setNewsArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    // You can later replace this with a call to your backend or a news API with filtering logic.
    const fetchNews = async () => {
        try {
            // Example using a public news API endpoint (replace with your own filtered endpoint)
            const response = await axios.get('https://api.example.com/crypto-news');
            setNewsArticles(response.data.articles);
        } catch (error) {
            console.error('Error fetching crypto news:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    return (
        <div className="crypto-news-page">
            <h1>Crypto News</h1>
            {loading ? (
                <p>Loading news...</p>
            ) : (
                <div className="news-list">
                    {newsArticles.map((article, index) => (
                        <div key={index} className="news-item">
                            <h2>{article.title}</h2>
                            <p>{article.description}</p>
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                                Read more
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CryptoNews;
