import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import { Container, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaExchangeAlt, FaChartLine, FaWallet } from 'react-icons/fa';
import './Portfolio.css';  

const Portfolio = () => {
  const { user } = useContext(UserContext);  // Accessing the current user context (login information)
  const navigate = useNavigate();  // For navigation programmatically
  const [portfolioData, setPortfolioData] = useState([]);  // State to hold portfolio data
  const [totalValue, setTotalValue] = useState(0);  // State to store the total value of the portfolio
  const [loading, setLoading] = useState(true);  // This is the loading state for fetching data
  const [error, setError] = useState(null);  //This is the state for error messages

  // Fetch portfolio data when the component mounts or when user info changes
  useEffect(() => {
    const fetchPortfolio = async () => {
      // Get token from localStorage instead of user context
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get('http://127.0.0.1:8000/api/portfolio/', {
          headers: { 
            'Authorization': `Bearer ${token}`, // Changed from Token to Bearer
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Portfolio response:', response.data);
        
        if (response.data.portfolio) {  // If portfolio data exists in the response
          const sortedHoldings = response.data.portfolio
            .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))  // Sort holdings by current value
            .map(holding => ({
              ...holding,
              current_value: parseFloat(holding.current_value).toFixed(2),  
              current_price: parseFloat(holding.current_price).toFixed(2)
            }));
            
          setPortfolioData(sortedHoldings);  // Update portfolio data state
          setTotalValue(response.data.total_value || 0);  // Set the total value of portfolio
          setError(null);  // Clear any previous error
        }
        
        if (response.data.errors?.length > 0) {  // If there are errors in the response
          console.error('Portfolio errors:', response.data.errors);
          setError(response.data.errors.join('. '));  // Display errors to the user
        }
      } catch (error) {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        console.error('Portfolio error:', error.response?.data || error);
        handlePortfolioError(error);  // Handle errors by setting appropriate error message
      } finally {
        setLoading(false);  // Set loading to false once data is fetched or error occurs
      }
    };

    fetchPortfolio();  // Call the function to fetch portfolio data
  }, [navigate]);  // Dependency array - re-run when user or navigate changes

  // Function to handle errors during portfolio fetch
  const handlePortfolioError = (error) => {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('API keys')) {
      setError('Please add your exchange API keys in your profile settings');  // Specific error if API keys are missing
    } else if (error.response?.data?.errors) {
      setError(error.response.data.errors.join('. '));  // Handle other errors
    } else {
      setError('Failed to load portfolio data. Please try again later.');  // Generic error message
    }
  };

  // Function to get the coin icon image based on symbol
  const getCoinIcon = (symbol) => {
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`;
  };

  // Function to format numbers with commas and decimals
  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(num);  // Format numbers with commas and specified decimals
  };

  // Return nothing if no user is logged in
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

      {/* Conditional rendering based on loading state and errors */}
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
