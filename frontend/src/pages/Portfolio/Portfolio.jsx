import { Container, Card, Row, Col, Alert, Spinner, Modal, Form, Button, Badge, ButtonGroup } from 'react-bootstrap';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FaCoins, FaExchangeAlt, FaWallet } from 'react-icons/fa';
import { useUser } from '../../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import PortfolioChart from '../../components/Chart/PortfolioChart';
import AssetAllocationChart from '../../components/Chart/AssetAllocationChart';
import RiskMetricsCard from '../../components/Metrics/RiskMetricsCard';
import './Portfolio.css';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const Portfolio = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  // Validate token and redirect to login if invalid
  const validateToken = useCallback(() => {
    if (!token) {
      navigate('/login');
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('access_token');
        navigate('/login');
        return false;
      }
      return true;
    } catch (error) {
      localStorage.removeItem('access_token');
      navigate('/login');
      return false;
    }
  }, [token, navigate]);

  // Portfolio state variables.
  const [portfolioData, setPortfolioData] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // API keys variables
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    binance_api_key: '',
    binance_secret_key: '',
    bybit_api_key: '',
    bybit_secret_key: ''
  });

  // API keys status
  // This state is used to check if the API keys are already set
  const [apiKeyStatus, setApiKeyStatus] = useState({ binance: false, bybit: false });
  const [savingKeys, setSavingKeys] = useState(false);
  const [apiError, setApiError] = useState(null);
  
  // Historical data for charts
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState("Combined");

  const [portfolioMetrics, setPortfolioMetrics] = useState({
    total_cost: 0,
    allocation: [],
    exchange_distribution: {}
  });

  // Helper function for number formatting.
  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // Fetch portfolio data.
  const fetchPortfolioData = useCallback(async () => {
    if (!validateToken()) return;
    
    setLoading(true);
    try {
      console.log('[Portfolio] fetching /api/portfolio/');
      const response = await axios.get(`${BASE_URL}/api/portfolio/`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('[Portfolio]  raw response.data:', response.data);
      const { portfolio, total_value, total_cost, allocation, exchange_distribution, errors } = response.data;
      console.log('[Portfolio] unpacked:', { portfolio, total_value, errors });
      
      if (portfolio) {
        console.log('[Portfolio] processing portfolio array, length =', portfolio.length);
        const sortedHoldings = portfolio
          .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))
          .map(holding => ({
            ...holding,
            current_value: parseFloat(holding.current_value),
            current_price: parseFloat(holding.current_price),
            purchase_price: holding.purchase_price != null ? parseFloat(holding.purchase_price) : null,
            original_value: holding.original_value != null ? parseFloat(holding.original_value) : null
          }));
        
        setPortfolioData(sortedHoldings);
        setTotalValue(total_value || 0);
        setPortfolioMetrics({
          total_cost: total_cost || 0,
          allocation: allocation || [],
          exchange_distribution: exchange_distribution || {}
        });
        setError(null);
      }
      if (errors?.length) {
        console.warn('[Portfolio] API returned errors:', errors);
        setError(errors.join('. '));
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || 'Failed to load portfolio data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate, validateToken]);

  // Fetch API keys status
const fetchApiKeysStatus = useCallback(async () => {
  if (!validateToken()) return;

  try {
    const response = await axios.get(
      `${BASE_URL}/api/profile/api-keys/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('[Portfolio] /api/profile/api-keys/ →', response.data);

    if (response.data) {
      //
      setApiKeyStatus({
        binance: !!response.data.binance_api_key,
        bybit:   !!response.data.bybit_api_key
      });

      // Update the API keys state
      setApiKeys(prev => ({
        ...prev,
        binance_api_key: response.data.binance_api_key || '',
        bybit_api_key:   response.data.bybit_api_key   || ''
      }));
    }
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('access_token');
      navigate('/login');
    } else {
      console.error('[Portfolio] Error fetching API keys status:', err);
    }
  }
}, [token, navigate, validateToken]);


  // Fetch historical data for charts
  const fetchHistoricalData = useCallback(async (days = 30, coin = null) => {
    if (!validateToken()) return;
    try {
      const params = new URLSearchParams();
      params.append('days', days);
      if (coin && coin !== "Combined") {
        params.append('coin', coin);
      }
      
      const response = await axios.get(`${BASE_URL}/api/portfolio/history/`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('[Portfolio] /api/portfolio/history/?days=', days, 'coin=', coin, '→', response.data);
      if (response.data?.history) {
        const history = response.data.history.map(item => ({
          ...item,
          value: parseFloat(item.value),
          date: new Date(item.date).getTime()
        }));
        setHistoricalData(history);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
      console.error('Error fetching historical data:', err);
    }
  }, [token, navigate, validateToken]);

  const handleCoinSelect = useCallback((coin) => {
    setSelectedCoin(coin);
  }, []);

  useEffect(() => {
    if (validateToken()) {
      fetchPortfolioData();
      fetchApiKeysStatus();
    }
  }, [validateToken, fetchPortfolioData, fetchApiKeysStatus]);

  // Fetch historical data when the component mounts or when selectedCoin changes
  useEffect(() => {
    if (validateToken() && selectedCoin) {
      // The 'days' parameter will determine which snapshot type is returned by the backend
      fetchHistoricalData(30, selectedCoin === "Combined" ? null : selectedCoin);
    }
  }, [validateToken, fetchHistoricalData, selectedCoin]);

  // Handle API keys submission.
  const handleSubmitApiKeys = async (e) => {
    e.preventDefault();
    if (!validateToken()) return;
    setSavingKeys(true);
    setApiError(null);
    try {
      const response = await axios.post(
        `${BASE_URL}/api/profile/api-keys/`,
        apiKeys,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('[handleSubmitApiKeys] Response:', response.data);  
  
      if (response.data) {
        setApiKeyStatus({
          binance: !!response.data.binance_api_key,
          bybit: !!response.data.bybit_api_key
        });
  
       
        console.log('[handleSubmitApiKeys] API Key Status Updated:', {
          binance: !!response.data.binance_api_key,
          bybit: !!response.data.bybit_api_key
        });
  
        setShowApiModal(false);
  
        
        await fetchPortfolioData();
        await fetchApiKeysStatus();
  
        
        console.log('[handleSubmitApiKeys] After refetching:');
        await fetchApiKeysStatus();
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
      setApiError(err.response?.data?.detail || 'Failed to save API keys. Please check your keys and try again.');
    } finally {
      setSavingKeys(false);
    }
  };
  
  

  // Handle API keys removal
  const handleRemoveApiKeys = async (exchange) => {
    if (!validateToken()) return;
    setSavingKeys(true);
    setApiError(null);
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/profile/api-keys/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { exchange }
        }
      );
      if (response.data) {
        setApiKeyStatus(prev => ({ ...prev, [exchange]: false }));
        setApiKeys(prev => ({
          ...prev,
          [`${exchange}_api_key`]: '',
          [`${exchange}_secret_key`]: ''
        }));
        
        // Refetch portfolio data and API keys status
        await fetchPortfolioData();
        await fetchHistoricalData(30, selectedCoin === "Combined" ? null : selectedCoin);
        setShowApiModal(false);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
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

  // Calculate total value of the portfolio
  const sortedPortfolioData = useMemo(() => {
    return [...portfolioData].sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value));
  }, [portfolioData]);

  // Extract unique coin list for filter buttons
  const uniqueCoins = useMemo(() => {
    const coins = new Set();
    sortedPortfolioData.forEach(holding => coins.add(holding.coin));
    return Array.from(coins);
  }, [sortedPortfolioData]);

  // Compute risk metrics (volatility and Sharpe)
  const riskMetrics = useMemo(() => {
    if (!historicalData || historicalData.length < 2) return { volatility: 0, sharpe: 0 };
    // calculate daily returns
    const returns = [];
    for (let i = 1; i < historicalData.length; i++) {
      const prev = historicalData[i - 1].value;
      const curr = historicalData[i].value;
      returns.push((curr - prev) / prev);
    }
    // calculate mean and standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance);
    const sharpe = volatility > 0 ? mean / volatility * Math.sqrt(252) : 0; // Calculated assuming 252 trading days
    return { volatility, sharpe };
  }, [historicalData]);

  if (!user) return null;

  const PortfolioMetrics = () => (
    <Row className="mb-4">
      <Col md={6} lg={4}>
        <Card>
          <Card.Body>
            <h5>Portfolio Overview</h5>
            <div className="detail-row">
              <span>Total Value:</span>
              <span className="value">${formatNumber(totalValue)}</span>
            </div>
          </Card.Body>
        </Card>
      </Col>
      
      <Col md={6} lg={4}>
        <Card>
          <Card.Body>
            <h5>Exchange Distribution</h5>
            {Object.entries(portfolioMetrics.exchange_distribution).map(([exchange, value]) => (
              <div key={exchange} className="detail-row">
                <span>{exchange}:</span>
                <span className="value">
                  ${formatNumber(value)} ({formatNumber((value / totalValue) * 100)}%)
                </span>
              </div>
            ))}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  return (
    <Container fluid className="portfolio-container">
      <div className="portfolio-header">
        <h1>
          <FaWallet className="me-2" /> Crypto Portfolio
        </h1>
        <div className="header-actions">
        {!loading && !error && portfolioData.length > 0 && (
          <Card className="total-value-card">
            <Card.Body>
              <h3>Total Value: ${formatNumber(totalValue)}</h3>
            </Card.Body>
          </Card>
        )}
          <Button variant="outline-primary" onClick={() => setShowApiModal(true)}>
            <FaExchangeAlt className="me-2" /> Configure API Keys
          </Button>
        </div>
      </div>

      {(!loading && !error && portfolioData.length > 0) && (
        <>
          <PortfolioMetrics />

          <Row className="mb-4">
            <Col md={6} lg={4}>
              <RiskMetricsCard metrics={riskMetrics} />
            </Col>
          </Row>

          <div className="coin-filter">
            <ButtonGroup>
              <Button 
                variant={selectedCoin === "Combined" ? "primary" : "outline-primary"}
                onClick={() => handleCoinSelect("Combined")}
              >
                Combined
              </Button>
              {uniqueCoins.map(coin => (
                <Button 
                  key={coin} 
                  variant={selectedCoin === coin ? "primary" : "outline-primary"}
                  onClick={() => handleCoinSelect(coin)}
                >
                  {coin}
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <Row>
            <Col lg={8}>
              <PortfolioChart 
                data={historicalData} 
                onRangeChange={(days) => fetchHistoricalData(days, selectedCoin === "Combined" ? null : selectedCoin)}
              />
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
              Binance API Keys {apiKeyStatus.binance && <Badge bg="success" className="ms-2">Active</Badge>}
            </h5>
            {!apiKeyStatus.binance ? (
              apiKeyStatus.bybit ? (
                <div className="mb-4">
                  <p className="text-muted">
                    Binance API Keys cannot be added while Bybit API keys are active.
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
                <Button variant="outline-danger" size="sm" onClick={() => handleRemoveApiKeys('binance')} disabled={savingKeys}>
                  Remove Binance Keys
                </Button>
              </div>
            )}

            {/* Bybit API Keys Section */}
            <h5 className="mb-3">
              Bybit API Keys {apiKeyStatus.bybit && <Badge bg="success" className="ms-2">Active</Badge>}
            </h5>
            {!apiKeyStatus.bybit ? (
              apiKeyStatus.binance ? (
                <div className="mb-4">
                  <p className="text-muted">
                    Bybit API Keys cannot be added while Binance API keys are active.
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
                <Button variant="outline-danger" size="sm" onClick={() => handleRemoveApiKeys('bybit')} disabled={savingKeys}>
                  Remove Bybit Keys
                </Button>
              </div>
            )}
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowApiModal(false)}>Close</Button>
              <Button variant="primary" type="submit" disabled={savingKeys}>
                {savingKeys ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Saving...
                  </>
                ) : 'Save Changes'}
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
          <Link to="/profile" className="btn btn-primary mt-2">Connect Exchange</Link>
        </Alert>
      ) : portfolioData.length === 0 ? (
        <div className="empty-portfolio text-center">
          <FaCoins size={50} className="mb-3" />
          <h3>No Holdings Found</h3>
          <p>Start your crypto journey by connecting an exchange.</p>
          <Link to="/profile" className="btn btn-primary mt-2">Add Exchange API Keys</Link>
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
