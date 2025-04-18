import React, { useState } from 'react';
import { Button, Spinner, Container, Row, Col, Card } from 'react-bootstrap';
import { runFilter, fetchStoredNews, deleteNews } from '../../api/news';
import './SentimentPage.css';

// This component handles sentiment analysis of news articles
const SentimentPage = () => {
  const [running, setRunning] = useState(false); // State to track if the filter is running
  const [positive, setPositive] = useState([]); // State to store positive news
  const [negative, setNegative] = useState([]);// State to store negative news
  const [error, setError] = useState('');

  // Function to run the sentiment analysis filter
  const handleRun = async () => {
    setError('');
    setRunning(true); // Set running state to true
    try {
      await runFilter();
      const [pos, neg] = await Promise.all([
        fetchStoredNews('positive'), // Fetch positive news
        fetchStoredNews('negative') // Fetch negative news
      ]);
      setPositive(pos); 
      setNegative(neg);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  // Function to delete a news item
  // It takes the sentiment type (positive/negative) and the id of the news item
  const handleDelete = async (sentiment, id) => {
    try {
      await deleteNews(sentiment, id);
      if (sentiment === 'positive') {
        setPositive(positive.filter(item => item.id !== id));
      } else {
        setNegative(negative.filter(item => item.id !== id)); // Remove the deleted item from the state
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    // Main container for the sentiment analysis page
    <Container fluid className="sentiment-page">
      <div className="sentiment-header">
        <h1>Sentiment Analysis</h1>
        <Button
          className="run-button" // Button to run the sentiment analysis
          onClick={handleRun}
          disabled={running}
          variant="primary"
          size="lg"
        >
          {running && <Spinner as="span" animation="border" size="sm" role="status" />}
          {running ? ' Running…' : 'Run'}
        </Button>
      </div>
      {error && <p className="error-message">{error}</p>}

      <Row className="news-section">
        <Col md={6} className="news-col">
          <h3>🚨 Positive News ({positive.length}/20)</h3>
          {positive.length === 0 && <p>No positive items.</p>}
          {positive.map(item => (
            <Card key={item.id} className="news-card positive">
              <Card.Body>
                <Card.Title>{item.title}</Card.Title>
                <Card.Text>
                  <small>{new Date(item.timestamp).toLocaleString()}</small>
                </Card.Text>
                <div className="actions">
                  <Card.Link href={item.url} target="_blank">Read</Card.Link>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete('positive', item.id)}>
                    Delete
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </Col>

        <Col md={6} className="news-col">
          <h3>🚨 Negative News ({negative.length}/20)</h3>
          {negative.length === 0 && <p>No negative items.</p>}
          {negative.map(item => (
            <Card key={item.id} className="news-card negative">
              <Card.Body>
                <Card.Title>{item.title}</Card.Title>
                <Card.Text>
                  <small>{new Date(item.timestamp).toLocaleString()}</small>
                </Card.Text>
                <div className="actions">
                  <Card.Link href={item.url} target="_blank">Read</Card.Link>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete('negative', item.id)}>
                    Delete
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </Col>
      </Row>
    </Container>
  );
};

export default SentimentPage;
