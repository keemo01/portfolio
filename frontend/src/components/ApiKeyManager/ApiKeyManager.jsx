import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const ApiKeyManager = ({ onSave }) => {
  const [keys, setKeys] = useState({
    bybit_api_key: '',
    bybit_secret_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/profile/api-keys/', keys, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`
        }
      });

      if (response.data.detail === 'success') {
        onSave?.();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group>
        <Form.Label>Bybit API Key</Form.Label>
        <Form.Control
          type="password"
          value={keys.bybit_api_key}
          onChange={(e) => setKeys({...keys, bybit_api_key: e.target.value})}
          required
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>Bybit Secret Key</Form.Label>
        <Form.Control
          type="password"
          value={keys.bybit_secret_key}
          onChange={(e) => setKeys({...keys, bybit_secret_key: e.target.value})}
          required
        />
      </Form.Group>

      {error && <Alert variant="danger">{error}</Alert>}
      
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Keys'}
      </Button>
    </Form>
  );
};

export default ApiKeyManager;
