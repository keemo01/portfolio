import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Component to manage API keys for Bybit
const ApiKeyManager = ({ onSave }) => {
  // State to check if the user has already entered API keys
  const [keys, setKeys] = useState({ bybit_api_key: '', bybit_secret_key: '' });
  const [hasKeys, setHasKeys] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const authHeader = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };

  // Function to check if the user has already entered API keys
  useEffect(() => {
    axios.get(`${BASE_URL}/api/profile/api-keys/`, {
      headers: { 'Content-Type':'application/json', ...authHeader }
    })
    .then(({ data }) => {
      if (data.bybit_api_key) {
        setHasKeys(true);
        // optional: show masked key in the inputs
        setKeys({
          bybit_api_key: data.bybit_api_key,
          bybit_secret_key: data.bybit_secret_key
        });
      }
    })
    .catch(() => {
      // no keys yet, ignore
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/profile/api-keys/`,
        keys,
        { headers: { 'Content-Type':'application/json', ...authHeader }}
      );
      // if we get back a binance_api_key or bybit_api_key, assume success
      if (data.bybit_api_key) {
        setHasKeys(true);
        onSave?.();
      } else {
        throw new Error('Unexpected response');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setLoading(true);
    try {
      await axios.delete(
        `${BASE_URL}/api/profile/api-keys/`,
        { headers: { 'Content-Type':'application/json', ...authHeader },
          data: { exchange: 'bybit' }
        }
      );
      setHasKeys(false);
      setKeys({ bybit_api_key: '', bybit_secret_key: '' });
      onSave?.();
    } catch {
      setError('Failed to remove API keys');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSave}>
      {hasKeys ? (
        <>
          <Alert variant="success">
            Bybit API keys are active.
          </Alert>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button
            variant="outline-danger"
            onClick={handleRemove}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : 'Remove Bybit Keys'}
          </Button>
        </>
      ) : (
        <>
          <Form.Group className="mb-3">
            <Form.Label>Bybit API Key</Form.Label>
            <Form.Control
              type="password"
              value={keys.bybit_api_key}
              onChange={e => setKeys(k => ({ ...k, bybit_api_key: e.target.value }))}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Bybit Secret Key</Form.Label>
            <Form.Control
              type="password"
              value={keys.bybit_secret_key}
              onChange={e => setKeys(k => ({ ...k, bybit_secret_key: e.target.value }))}
              required
            />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Save Keys'}
          </Button>
        </>
      )}
    </Form>
  );
};

export default ApiKeyManager;