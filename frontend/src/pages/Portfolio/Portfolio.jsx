import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useUser } from '../../context/UserContext';
import { Container, Card, Row, Col, Alert, Spinner, Modal, Form, Button, Badge } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaExchangeAlt, FaWallet } from 'react-icons/fa';
import PortfolioChart from '../../components/Chart/PortfolioChart';
import AssetAllocationChart from '../../components/Chart/AssetAllocationChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Portfolio.css';

const Portfolio = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  // State for portfolio data
  const [portfolioData, setPortfolioData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for API keys management
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    binance_api_key: '',
    binance_secret_key: '',
    bybit_api_key: '',
    bybit_secret_key: ''
  });
  const [apiKeyStatus, setApiKeyStatus] = useState({ binance: false, bybit: false });
  const [savingKeys, setSavingKeys] = useState(false);
  const [apiError, setApiError] = useState(null);
  
  // Historical portfolio data for the chart
  const [historicalData, setHistoricalData] = useState([]);

  const [selectedCoin, setSelectedCoin] = useState(null);
  const [coinHistory, setCoinHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Helper function to format numbers
  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Fetch portfolio data from backend
  const fetchPortfolioData = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/portfolio/', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const { portfolio, total_value, errors } = response.data;
      
      console.log('Raw portfolio data:', JSON.stringify(portfolio, null, 2));
      
      if (portfolio) {
        const sortedHoldings = portfolio
          .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))
          .map(holding => {
            console.log('Processing holding:', {
              coin: holding.coin,
              amount: holding.amount,
              current_value: holding.current_value,
              original_value: holding.original_value,
              exchange: holding.exchange
            });
            
            const processed = {
              ...holding,
              current_value: parseFloat(holding.current_value).toFixed(2),
              current_price: parseFloat(holding.current_price).toFixed(2),
              purchase_price: holding.purchase_price != null ? parseFloat(holding.purchase_price) : null,
              original_value: holding.original_value != null ? parseFloat(holding.original_value).toFixed(2) : null
            };
            
            console.log('Processed holding:', processed);
            
            return processed;
          });
        
        console.log('Final processed holdings:', JSON.stringify(sortedHoldings, null, 2));
        
        setPortfolioData(sortedHoldings);
        setTotalValue(total_value || 0);
        setError(null);
      }
      if (errors?.length) {
        setError(errors.join('. '));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || 'Failed to load portfolio data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  // Fetch API keys status from backend
  const fetchApiKeysStatus = useCallback(async () => {
    if (!token) return;
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
    } catch (err) {
      console.error('Error fetching API keys:', err);
    }
  }, [token]);

  // Fetch historical portfolio data for charting
  const fetchHistoricalData = useCallback(async (days = 30) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/portfolio/history/?days=${days}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data?.history) {
        setHistoricalData(response.data.history);
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
    }
  }, [token, navigate]);

  const fetchCoinHistory = useCallback(async (coin, amount, purchasePrice, purchaseDate) => {
    if (!token || !coin) return;
    setLoadingHistory(true);
    try {
      // Construct the URL with query parameters
      let url = `http://127.0.0.1:8000/api/price/coin-history/${coin}/?amount=${amount}&days=30`;
      if (purchasePrice) {
        url += `&purchase_price=${purchasePrice}`;
      }
      if (purchaseDate) {
        url += `&purchase_date=${purchaseDate}`;
      }
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data?.history) {
        // Sort the history data by timestamp
        // Assuming the response data has a 'history' array with 'timestamp' and 'value' properties
        const sortedHistory = response.data.history.sort((a, b) => a.timestamp - b.timestamp);
        setCoinHistory(sortedHistory);
      }
    } catch (err) {
      console.error('Error fetching coin history:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [token, navigate]);
  

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPortfolioData();
  }, [token, fetchPortfolioData, navigate]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchApiKeysStatus();
  }, [token, fetchApiKeysStatus, navigate]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchHistoricalData();
  }, [token, fetchHistoricalData, navigate]);

  // Handle saving API keys
  const handleSubmitApiKeys = async (e) => {
    e.preventDefault();
    if (!token) return;
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
        fetchPortfolioData();
      }
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Failed to save API keys. Please check your keys and try again.');
    } finally {
      setSavingKeys(false);
    }
  };

  // Handle removal of API keys for a given exchange
  const handleRemoveApiKeys = async (exchange) => {
    if (!token) return;
    setSavingKeys(true);
    setApiError(null);
    try {
      const payload = { [`${exchange}_api_key`]: '', [`${exchange}_secret_key`]: '' };
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
        setApiKeyStatus((prev) => ({ ...prev, [exchange]: false }));
        setApiKeys((prev) => ({ ...prev, [`${exchange}_api_key`]: '', [`${exchange}_secret_key`]: '' }));
      }
    } catch (err) {
      setApiError('Failed to remove API keys. Please try again.');
    } finally {
      setSavingKeys(false);
    }
  };

  // Function to get coin icon URL or fallback SVG
  const getCoinIcon = (symbol) => {
    if (!symbol) return null;
    
    const fallbackIcon = `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" fill="#6c757d"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="20" font-family="Arial">
          ${symbol.charAt(0)}
        </text>
      </svg>
    `)}`;

    return {
      src: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`,
      fallback: fallbackIcon
    };
  };

  // Store sorted portfolio data for rendering
  const sortedPortfolioData = useMemo(() => {
    return [...portfolioData].sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value));
  }, [portfolioData]);

  const handleCardClick = useCallback((holding) => {
    setSelectedCoin(holding);
    const purchasePrice = holding.purchase_price;
    const purchaseDate = holding.purchase_date;
    fetchCoinHistory(holding.coin, holding.amount, purchasePrice, purchaseDate);
  }, [fetchCoinHistory]);

  if (!user) return null;

  return (
    <Container fluid className="portfolio-container">
      <div className="portfolio-header">
        <h1>
          <FaWallet className="me-2" /> Crypto Portfolio
        </h1>
        <div className="d-flex justify-content-center gap-3 mt-3">
          {!loading && !error && portfolioData.length > 0 && (
            <Card className="total-value-card">
              <Card.Body>
                <h3 className="mb-0">Total Value: ${formatNumber(totalValue)}</h3>
              </Card.Body>
            </Card>
          )}
          <Button variant="outline-primary" onClick={() => setShowApiModal(true)}>
            <FaExchangeAlt className="me-2" /> Configure API Keys
          </Button>
        </div>
      </div>

      {!loading && !error && portfolioData.length > 0 && (
        <Row>
          <Col lg={8}>
            <PortfolioChart data={historicalData} onRangeChange={fetchHistoricalData} />
          </Col>
          <Col lg={4}>
            <AssetAllocationChart data={sortedPortfolioData} />
          </Col>
        </Row>
      )}

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
              {apiKeyStatus.binance && <Badge bg="success" className="ms-2">Active</Badge>}
            </h5>
            {!apiKeyStatus.binance ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>API Key</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Binance API Key"
                    value={apiKeys.binance_api_key}
                    onChange={(e) => setApiKeys({ ...apiKeys, binance_api_key: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Secret Key</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter Binance Secret Key"
                    value={apiKeys.binance_secret_key}
                    onChange={(e) => setApiKeys({ ...apiKeys, binance_secret_key: e.target.value })}
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
              {apiKeyStatus.bybit && <Badge bg="success" className="ms-2">Active</Badge>}
            </h5>
            {!apiKeyStatus.bybit ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>API Key</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Bybit API Key"
                    value={apiKeys.bybit_api_key}
                    onChange={(e) => setApiKeys({ ...apiKeys, bybit_api_key: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Secret Key</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter Bybit Secret Key"
                    value={apiKeys.bybit_secret_key}
                    onChange={(e) => setApiKeys({ ...apiKeys, bybit_secret_key: e.target.value })}
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
                  ) : (
                    'Save Keys'
                  )}
                </Button>
              )}
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal 
        show={!!selectedCoin} 
        onHide={() => setSelectedCoin(null)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <img
              src={getCoinIcon(selectedCoin?.coin)?.src}
              alt={selectedCoin?.coin || 'Unknown'}
              className="coin-icon me-2"
              style={{ width: 30, height: 30 }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getCoinIcon(selectedCoin?.coin)?.fallback;
              }}
            />
            {selectedCoin?.coin} Performance
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingHistory ? (
            <div className="text-center p-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={coinHistory}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(timestamp) => {
                      const date = new Date(timestamp);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${parseFloat(value).toLocaleString()}`, 'Value']}
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2196f3" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4">
            <h5>Holding Details</h5>
            <div className="detail-row">
              <span>Amount</span>
              <span className="value">{formatNumber(parseFloat(selectedCoin?.amount), 8)}</span>
            </div>
            <div className="detail-row">
              <span>Current Value</span>
              <span className="value">${formatNumber(parseFloat(selectedCoin?.current_value))}</span>
            </div>
            {selectedCoin?.original_value && (
              <div className="detail-row">
                <span>Original Value</span>
                <span className="value">${formatNumber(parseFloat(selectedCoin?.original_value))}</span>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {loading ? (
        <div className="loading-container text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading your portfolio...</p>
        </div>
      ) : error ? (
        <Alert variant="warning" className="custom-alert">
          <Alert.Heading>
            <FaExchangeAlt className="me-2" /> API Connection Required
          </Alert.Heading>
          <p>{error}</p>
          <Link to="/profile" className="btn btn-primary mt-2">
            Connect Exchange
          </Link>
        </Alert>
      ) : portfolioData.length === 0 ? (
        <div className="empty-portfolio text-center">
          <FaCoins size={50} className="mb-3" />
          <h3>No Holdings Found</h3>
          <p>Time to start your crypto journey!</p>
          <Link to="/profile" className="btn btn-primary mt-2">
            Add Exchange API Keys
          </Link>
        </div>
      ) : (
        <Row>
          {sortedPortfolioData.map((holding, index) => {
            const amount = parseFloat(holding.amount);
            const originalValue = holding.original_value !== null ? parseFloat(holding.original_value) : null;
            const currentValue = parseFloat(holding.current_value);
            const currentColor =
              originalValue != null
                ? currentValue > originalValue
                  ? 'green'
                  : currentValue < originalValue
                  ? 'red'
                  : '#000'
                : '#000';

            return (
              <Col key={index} xs={12} md={6} lg={4} xl={3} className="mb-4">
                <Card 
                  className="asset-card" 
                  onClick={() => handleCardClick(holding)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="asset-card-header">
                    <img
                      src={getCoinIcon(holding.coin)?.src}
                      alt={holding.coin || 'Unknown'}
                      className="coin-icon"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getCoinIcon(holding.coin)?.fallback;
                      }}
                    />
                    <div className="asset-card-title">
                      <h4>{holding.coin}</h4>
                      <div className="d-flex flex-column">
                        <span className="exchange-badge">{holding.exchange}</span>
                        <span className="account-badge">{holding.account_type || 'SPOT'}</span>
                      </div>
                    </div>
                  </div>
                  <Card.Body>
                    <div className="asset-details">
                      <div className="detail-row">
                        <span>Amount</span>
                        <span className="value">{formatNumber(amount, 8)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Price</span>
                        <span className="value">${formatNumber(parseFloat(holding.current_price))}</span>
                      </div>
                      {originalValue != null ? (
                        <>
                          <div className="detail-row">
                            <span>Original Value</span>
                            <span className="value" style={{ color: '#000' }}>
                              ${formatNumber(originalValue)}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span>Current Value</span>
                            <span className="value" style={{ color: currentColor }}>
                              ${formatNumber(currentValue)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="detail-row">
                          <span>Current Value</span>
                          <span className="value">${formatNumber(currentValue)}</span>
                        </div>
                      )}
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
            );
          })}
        </Row>
      )}
    </Container>
  );
};

export default Portfolio;
