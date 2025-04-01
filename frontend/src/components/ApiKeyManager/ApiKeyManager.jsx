import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

// Component to manage API keys for Bybit
const ApiKeyManager = ({ onSave }) => {
  // State for storing the API keys
  const [keys, setKeys] = useState({
    bybit_api_key: '',
    bybit_secret_key: ''
  });

  // State for handling loading and error messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevents the default form submission behavior
    setLoading(true); // Show loading state while the request is being processed
    setError(null); // Clear any previous error messages

    try {
      // Send the API keys to the backend for storage
      const response = await axios.post('/api/profile/api-keys/', keys, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}` // Attach user authentication token
        }
      });

      // If  request is successful, call the onSave function
      if (response.data.detail === 'success') {
        onSave?.();
      }
    } catch (err) {
      // Handle errors, such as incorrect API keys or server issues
      setError(err.response?.data?.detail || 'Failed to save API keys');
    } finally {
      setLoading(false); // Hide loading state when request completes
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Input the Bybit API key */}
      <Form.Group>
        <Form.Label>Bybit API Key</Form.Label>
        <Form.Control
          type="password" // Hide input text for security
          value={keys.bybit_api_key}
          onChange={(e) => setKeys({ ...keys, bybit_api_key: e.target.value })}
          required // Make input required
        />
      </Form.Group>

      {/* Input the Bybit  Secret Key */}
      <Form.Group>
        <Form.Label>Bybit Secret Key</Form.Label>
        <Form.Control
          type="password"
          value={keys.bybit_secret_key}
          onChange={(e) => setKeys({ ...keys, bybit_secret_key: e.target.value })}
          required
        />
      </Form.Group>

      {/* Show an error message if there is an issue saving API keys */}
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Save button is disabled while processing the request */}
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Keys'}
      </Button>
    </Form>
  );
};

export default ApiKeyManager;
