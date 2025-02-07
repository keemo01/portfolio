import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import { Container, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaExchangeAlt, FaChartLine, FaWallet } from 'react-icons/fa';
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
        setLoading(true);
        console.log('Fetching portfolio with token:', user.token);
        const response = await axios.get('http://127.0.0.1:8000/api/portfolio/', {
          headers: { 
            'Authorization': `Token ${user.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Portfolio response:', response.data);
        
        if (response.data.portfolio) {
          // Sort holdings by value
          const sortedHoldings = response.data.portfolio
            .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))
            .map(holding => ({
              ...holding,
              current_value: parseFloat(holding.current_value).toFixed(2),
              current_price: parseFloat(holding.current_price).toFixed(2)
            }));
            
          setPortfolioData(sortedHoldings);
          setTotalValue(response.data.total_value || 0);
          setError(null);
        }
        
        if (response.data.errors?.length > 0) {
          console.error('Portfolio errors:', response.data.errors);
          setError(response.data.errors.join('. '));
        }
      } catch (error) {
        console.error('Portfolio error:', error.response?.data || error);
        handlePortfolioError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [user, navigate]);

  const handlePortfolioError = (error) => {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('API keys')) {
      setError('Please add your exchange API keys in your profile settings');
    } else if (error.response?.data?.errors) {
      setError(error.response.data.errors.join('. '));
    } else {
      setError('Failed to load portfolio data. Please try again later.');
    }
  };

  const getCoinIcon = (symbol) => {
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`;
  };

  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (!user) return null;

  return (
    <Container fluid className="portfolio-container">
      <div className="portfolio-header">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1><FaWallet className="me-2" />Crypto Portfolio</h1>
          {!loading && !error && portfolioData.length > 0 && (
            <Card className="total-value-card">
              <Card.Body>
                <h3 className="mb-0">Total Value: ${formatNumber(totalValue)}</h3>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spinner animation="border" variant="primary" />
          <p>Loading your portfolio...</p>
        </div>
      ) : error ? (
        <Alert variant="warning" className="custom-alert">
          <Alert.Heading><FaExchangeAlt className="me-2" />API Connection Required</Alert.Heading>
          <p>{error}</p>
          <Link to="/profile" className="btn btn-primary mt-2">
            Connect Exchange
          </Link>
        </Alert>
      ) : portfolioData.length === 0 ? (
        <div className="empty-portfolio">
          <FaCoins size={50} className="mb-3" />
          <h3>No Holdings Found</h3>
          <p>Time to start your crypto journey!</p>
          <Link to="/profile" className="btn btn-primary mt-2">
            Add Exchange API Keys
          </Link>
        </div>
      ) : (
        <Row>
          {portfolioData.map((holding, index) => (
            <Col key={index} xs={12} md={6} lg={4} xl={3} className="mb-4">
              <Card className="asset-card">
                <div className="asset-card-header">
                  <img
                    src={getCoinIcon(holding.coin)}
                    alt={holding.coin}
                    className="coin-icon"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://via.placeholder.com/32/6c757d/FFFFFF?text=${holding.coin.charAt(0)}`;
                    }}
                  />
                  <div className="asset-card-title">
                    <h4>{holding.coin}</h4>
                    <span className="exchange-badge">{holding.exchange}</span>
                  </div>
                </div>
                
                <Card.Body>
                  <div className="asset-details">
                    <div className="detail-row">
                      <span>Amount</span>
                      <span className="value">{formatNumber(parseFloat(holding.amount), 8)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Price</span>
                      <span className="value">${formatNumber(holding.current_price)}</span>
                    </div>
                    <div className="detail-row total-value">
                      <span>Value</span>
                      <span className="value">${formatNumber(holding.current_value)}</span>
                    </div>
                    {holding.transferable && (
                      <div className="detail-row">
                        <span>Available</span>
                        <span className="value">{formatNumber(parseFloat(holding.transferable), 8)}</span>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default Portfolio;
