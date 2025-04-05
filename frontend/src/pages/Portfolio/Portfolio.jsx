import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useUser } from '../../context/UserContext';
import { Container, Card, Row, Col, Alert, Spinner, Modal, Form, Button, Badge, ButtonGroup } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaCoins, FaExchangeAlt, FaWallet } from 'react-icons/fa';
import PortfolioChart from '../../components/Chart/PortfolioChart';
import AssetAllocationChart from '../../components/Chart/AssetAllocationChart';
import './Portfolio.css';

const Portfolio = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  // Portfolio and API states
  const [portfolioData, setPortfolioData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  
  // Historical chart and coin filter state
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState("Combined");

  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

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
      
      if (portfolio) {
        const sortedHoldings = portfolio
          .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))
          .map(holding => ({
              ...holding,
              current_value: parseFloat(holding.current_value),
              current_price: parseFloat(holding.current_price),
              purchase_price: holding.purchase_price != null ? parseFloat(holding.purchase_price) : null,
              original_value: holding.original_value != null ? parseFloat(holding.original_value) : null
            })
          );
        
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

  const fetchHistoricalData = useCallback(async (days = 30, coin = null) => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const params = new URLSearchParams();
      params.append('days', days);
      if (coin && coin !== "Combined") {
        params.append('coin', coin);
      }
      
      const response = await axios.get(`http://127.0.0.1:8000/api/portfolio/history/`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
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
    // Fetch historical data based on the currently selected coin
    fetchHistoricalData(30, selectedCoin === "Combined" ? null : selectedCoin);
  }, [token, fetchHistoricalData, navigate, selectedCoin]);

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
        await fetchPortfolioData(); // Refresh portfolio data after saving
        await fetchApiKeysStatus(); // Refresh API key status
      }
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Failed to save API keys. Please check your keys and try again.');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleRemoveApiKeys = async (exchange) => {
    if (!token) return;
    setSavingKeys(true);
    setApiError(null);
    try {
        const response = await axios.delete(
            `http://127.0.0.1:8000/api/profile/api-keys/?exchange=${exchange}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        if (response.data) {
            // Update local state
            setApiKeyStatus((prev) => ({ ...prev, [exchange]: false }));
            setApiKeys((prev) => ({
                ...prev,
                [`${exchange}_api_key`]: '',
                [`${exchange}_secret_key`]: ''
            }));
            
            // Clear portfolio data
            setPortfolioData([]);
            setTotalValue(0);
            setHistoricalData([]);
            
            // Close modal
            setShowApiModal(false);
        }
    } catch (err) {
        setApiError('Failed to remove API keys. Please try again.');
    } finally {
        setSavingKeys(false);
    }
};

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

  const sortedPortfolioData = useMemo(() => {
    return [...portfolioData].sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value));
  }, [portfolioData]);

  // Get the list of coins available from the portfolio data
  const uniqueCoins = useMemo(() => {
    const coins = new Set();
    sortedPortfolioData.forEach(holding => {
      coins.add(holding.coin);
    });
    return Array.from(coins);
  }, [sortedPortfolioData]);

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
        <>
          {/* Coin Filter Buttons */}
          <div className="coin-filter mb-4">
            <ButtonGroup>
              <Button 
                variant={selectedCoin === "Combined" ? "primary" : "outline-primary"}
                onClick={() => setSelectedCoin("Combined")}
              >
                Combined
              </Button>
              {uniqueCoins.map(coin => (
                <Button 
                  key={coin} 
                  variant={selectedCoin === coin ? "primary" : "outline-primary"}
                  onClick={() => setSelectedCoin(coin)}
                >
                  {coin}
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <Row>
            <Col lg={8}>
              <PortfolioChart data={historicalData} onRangeChange={(days) => {
                fetchHistoricalData(days, selectedCoin === "Combined" ? null : selectedCoin);
              }} />
            </Col>
            <Col lg={4}>
              <AssetAllocationChart data={sortedPortfolioData} />
            </Col>
          </Row>
        </>
      )}

      {/* API Keys Modal */}
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
              apiKeyStatus.bybit ? (
                <div className="mb-4">
                  <p className="text-muted">
                  Binance API Keys cant be added while Bybit API keys are active. Remove Binance kets to add Bybit keys
                  </p>
                </div>
              ) : (
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
              )
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
              apiKeyStatus.binance ? (
                <div className="mb-4">
                  <p className="text-muted">
                    Bybit API Keys cant be added while Binance API keys are active. Remove Bybit kets to add Binance keys
                  </p>
                </div>
              ) : (
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
              )
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
              <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={savingKeys}
              >
                  {savingKeys ? (
                      <>
                          <Spinner size="sm" className="me-2" />
                          Saving...
                      </>
                  ) : (
                      'Save Changes'
                  )}
              </Button>
            </div>
          </Form>
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
        <Row className="mt-4">
          {sortedPortfolioData.map((holding) => (
            <Col key={`${holding.exchange}-${holding.coin}`} xs={12} md={6} lg={4} xl={3} className="mb-4">
              <Card className="asset-card">
                <Card.Body>
                  <div className="asset-card-header">
                    <img
                      src={getCoinIcon(holding.coin).src}
                      onError={(e) => { e.target.src = getCoinIcon(holding.coin).fallback; }}
                      alt={holding.coin}
                      className="coin-icon"
                    />
                    <div className="asset-card-title">
                      <h4>{holding.coin}</h4>
                    </div>
                    <Badge bg="secondary" className="exchange-badge">{holding.exchange}</Badge>
                  </div>
                  <div className="asset-details">
                    <div className="detail-row">
                      <span>Value:</span>
                      <span className="value">${formatNumber(holding.current_value)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Amount:</span>
                      <span className="value">{formatNumber(holding.amount, 6)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Price:</span>
                      <span className="value">${formatNumber(holding.current_price)}</span>
                    </div>
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
