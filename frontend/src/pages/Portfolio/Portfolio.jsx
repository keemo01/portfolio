import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { UserContext } from '../../context/UserContext';
import { Container, Card, Row, Col, Alert, Spinner, Modal, Form, Button, Badge } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaExchangeAlt, FaChartLine, FaWallet } from 'react-icons/fa';
import './Portfolio.css';  
import PortfolioChart from '../../components/Chart/PortfolioChart';

const Portfolio = () => {
  const { user } = useContext(UserContext);  // Get user context
  const navigate = useNavigate();  // For navigation 
  const [portfolioData, setPortfolioData] = useState([]);  // State that stores portfolio data
  const [totalValue, setTotalValue] = useState(0);  // State that stores the total value of the portfolio
  const [loading, setLoading] = useState(true);  // This is the loading state for fetching data
  const [error, setError] = useState(null);  //This is the state for error messages
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    binance_api_key: '',
    binance_secret_key: '',
    bybit_api_key: '',
    bybit_secret_key: ''
  });
  const [apiKeyStatus, setApiKeyStatus] = useState({
    binance: false,
    bybit: false
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  // Fetch portfolio data when user info changes
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
            'Authorization': `Bearer ${token}`, // Bearer
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Portfolio response:', response.data);
        
        if (response.data.portfolio) {  // If portfolio data exists in the response
          const sortedHoldings = response.data.portfolio
            .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))  // Sorts holdings by current value
            .map(holding => ({
              ...holding,
              current_value: parseFloat(holding.current_value).toFixed(2),  
              current_price: parseFloat(holding.current_price).toFixed(2)
            }));
            
          setPortfolioData(sortedHoldings);  // Update portfolio data state
          setTotalValue(response.data.total_value || 0);  // Establish the entire worth of portfolio
          setError(null);  // Clear any previous error
        }
        
        if (response.data.errors?.length > 0) {  // If there are errors in the response
          console.error('Portfolio errors:', response.data.errors);
          setError(response.data.errors.join('. '));  // Display errors to the user
        }
      } catch (error) {
        if (error.response?.status === 401) {
          // Token expired or invalid - redirect to login
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        console.error('Portfolio error:', error.response?.data || error);
        handlePortfolioError(error);  // Handle errors by setting appropriate error message
      } finally {
        setLoading(false);  // Set the loading to false once data is fetched or error occurs
      }
    };

    fetchPortfolio();  // Call the function to fetch portfolio data
  }, [navigate]);  // Dependency array includes navigate to avoid infinite loop

  // Function to handle errors during the  portfolio fetch
  const handlePortfolioError = (error) => {
    if (error.response?.status === 400 && error.response?.data?.detail?.includes('API keys')) {
      setError('Please add your exchange API keys in your profile settings');  // Error if API keys are missing
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

  // Function for formatting numbers with commas and decimals
  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(num);  //Format numbers using commas and specified decimals
  };

  // Add this function to fetch existing API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/profile/api-keys/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data) {
          setApiKeyStatus({
            binance: !!response.data.binance_api_key,
            bybit: !!response.data.bybit_api_key
          });
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
      }
    };

    fetchApiKeys();
  }, []);

  // Add new function to fetch historical data
  const fetchHistoricalData = async (days = 30) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/portfolio/history/?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.history) {
        setHistoricalData(response.data.history);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  // Update handleSubmitApiKeys function
  const handleSubmitApiKeys = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    setSavingKeys(true);
    setApiError(null);
    
    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/profile/api-keys/',
        apiKeys,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setApiKeyStatus({
          binance: !!response.data.binance_api_key,
          bybit: !!response.data.bybit_api_key
        });
        setShowApiModal(false);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      setApiError(
        error.response?.data?.detail || 
        'Failed to save API keys. Please check your keys and try again.'
      );
    } finally {
      setSavingKeys(false);
    }
  };

  // Function to remove API keys
  // This function is called when the user clicks the "Remove" button for API keys
  const handleRemoveApiKeys = async (exchange) => {
    const token = localStorage.getItem('access_token');
    setSavingKeys(true);
    setApiError(null);
    
    try {
      const payload = {
        [`${exchange}_api_key`]: '',
        [`${exchange}_secret_key`]: ''
      };
      
      const response = await axios.post(
        'http://127.0.0.1:8000/api/profile/api-keys/',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        setApiKeyStatus(prev => ({
          ...prev,
          [exchange]: false
        }));
        setApiKeys(prev => ({
          ...prev,
          [`${exchange}_api_key`]: '',
          [`${exchange}_secret_key`]: ''
        }));
      }
    } catch (error) {
      setApiError('Failed to remove API keys. Please try again.');
    } finally {
      setSavingKeys(false);
    }
  };

  // Return nothing if no user is logged in
  if (!user) return null;

  return (
    <Container fluid className="portfolio-container">
      <div className="portfolio-header">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1><FaWallet className="me-2" />Crypto Portfolio</h1>
          <div className="d-flex gap-3">
            {!loading && !error && portfolioData.length > 0 && (
              <Card className="total-value-card">
                <Card.Body>
                  <h3 className="mb-0">Total Value: ${formatNumber(totalValue)}</h3>
                </Card.Body>
              </Card>
            )}
            <Button variant="outline-primary" onClick={() => setShowApiModal(true)}>
              <FaExchangeAlt className="me-2" />Configure API Keys
            </Button>
          </div>
        </div>
      </div>

      {/* Add chart components before the portfolio cards */}
      {!loading && !error && portfolioData.length > 0 && (
        <Row>
          <Col lg={8}>
            <PortfolioChart 
              data={historicalData} 
              onRangeChange={fetchHistoricalData}
            />
          </Col>
          <Col lg={4}>
            <AssetAllocationChart data={portfolioData} />
          </Col>
        </Row>
      )}

      {/* Add a pop-up window */}
      <Modal show={showApiModal} onHide={() => setShowApiModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Configure Exchange API Keys</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitApiKeys}>
            {apiError && (
              <Alert variant="danger" className="mb-3">
                {apiError}
              </Alert>
            )}
            
            <h5 className="mb-3">
              Binance API Keys
              {apiKeyStatus.binance && (
                <Badge bg="success" className="ms-2">Active</Badge>
              )}
            </h5>
            {!apiKeyStatus.binance ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>API Key</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Binance API Key"
                    value={apiKeys.binance_api_key}
                    onChange={(e) => setApiKeys({...apiKeys, binance_api_key: e.target.value})}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Secret Key</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter Binance Secret Key"
                    value={apiKeys.binance_secret_key}
                    onChange={(e) => setApiKeys({...apiKeys, binance_secret_key: e.target.value})}
                  />
                </Form.Group>
              </>
            ) : (
              <div className="mb-4">
                <p className="text-muted mb-2">API keys are configured and active</p>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => handleRemoveApiKeys('binance')}
                  disabled={savingKeys}
                >
                  Remove Binance Keys
                </Button>
              </div>
            )}

            <h5 className="mb-3">
              Bybit API Keys
              {apiKeyStatus.bybit && (
                <Badge bg="success" className="ms-2">Active</Badge>
              )}
            </h5>
            {!apiKeyStatus.bybit ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>API Key</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Bybit API Key"
                    value={apiKeys.bybit_api_key}
                    onChange={(e) => setApiKeys({...apiKeys, bybit_api_key: e.target.value})}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Secret Key</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter Bybit Secret Key"
                    value={apiKeys.bybit_secret_key}
                    onChange={(e) => setApiKeys({...apiKeys, bybit_secret_key: e.target.value})}
                  />
                </Form.Group>
              </>
            ) : (
              <div className="mb-4">
                <p className="text-muted mb-2">API keys are configured and active</p>
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => handleRemoveApiKeys('bybit')}
                  disabled={savingKeys}
                >
                  Remove Bybit Keys
                </Button>
              </div>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowApiModal(false)}>
                Close
              </Button>
              {(!apiKeyStatus.binance || !apiKeyStatus.bybit) && (
                <Button variant="primary" type="submit" disabled={savingKeys}>
                  {savingKeys ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : 'Save Keys'}
                </Button>
              )}
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Show different content based on loading status and errors */}
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
                    <div className="d-flex flex-column">
                      <span className="exchange-badge">{holding.exchange}</span>
                      <span className="account-badge">
                        {holding.account_type || 'SPOT'}
                      </span>
                    </div>
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