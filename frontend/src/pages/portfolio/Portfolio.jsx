import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import { Container, Card, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import './Portfolio.css';

const Portfolio = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!user?.token) {
        navigate('/login');
        return;
      }

      try {
        console.log('Fetching portfolio data...');
        const response = await axios.get('http://127.0.0.1:8000/api/portfolio/', {
          headers: { 'Authorization': `Token ${user.token}` }
        });
        
        console.log('Portfolio response:', response.data);
        
        if (response.data.portfolio) {
          setPortfolioData(response.data.portfolio);
          setTotalValue(response.data.total_value || 0);
        }
        setError(null);
      } catch (error) {
        console.error('Portfolio error:', error.response || error);
        if (error.response?.status === 400 && error.response?.data?.detail?.includes('API keys')) {
          setError('Please add your exchange API keys in your profile settings');
        } else {
          setError('Failed to load portfolio data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <Container className="portfolio-container py-4">
      <h1 className="mb-4">Cryptocurrency Portfolio</h1>
      
      {loading ? (
        <Alert variant="info">Loading your portfolio...</Alert>
      ) : error ? (
        <Alert variant="warning">
          {error}
          <div className="mt-3">
            <Link to="/profile" className="btn btn-primary">
              Manage API Keys
            </Link>
          </div>
        </Alert>
      ) : portfolioData.length === 0 ? (
        <Alert variant="info">
          <h4>No holdings found</h4>
          <p>Make sure you have:</p>
          <ul>
            <li>Added your exchange API keys in your profile</li>
            <li>Have cryptocurrency holdings in your exchange accounts</li>
          </ul>
          <Link to="/profile" className="btn btn-primary mt-2">
            Manage API Keys
          </Link>
        </Alert>
      ) : (
        <>
          <Card className="mb-4">
            <Card.Body>
              <h3>Total Portfolio Value: ${totalValue.toFixed(2)}</h3>
            </Card.Body>
          </Card>

          <Row>
            {portfolioData.map((holding, index) => (
              <Col key={index} md={6} lg={4} className="mb-4">
                <Card className="holding-card h-100">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{holding.coin}</h5>
                    <span className="badge bg-primary">{holding.exchange}</span>
                  </Card.Header>
                  <Card.Body>
                    <div className="holding-details">
                      <p><strong>Amount:</strong> {holding.amount}</p>
                      <p><strong>Current Price:</strong> ${Number(holding.current_price).toFixed(2)}</p>
                      <p><strong>Current Value:</strong> ${Number(holding.current_value).toFixed(2)}</p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
};

export default Portfolio;
