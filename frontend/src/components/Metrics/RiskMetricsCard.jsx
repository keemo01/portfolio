import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { FaChartLine } from 'react-icons/fa';

const RiskMetricsCard = ({ metrics }) => {
  // Provide safe defaults if volatility or sharpe are missing
  const volatility = typeof metrics?.volatility === 'number' ? metrics.volatility : 0;
  const sharpe    = typeof metrics?.sharpe     === 'number' ? metrics.sharpe     : 0;

  const formatPct = v => (v * 100).toFixed(2) + '%';

  return (
    <Card>
      <Card.Header>
        <FaChartLine className="me-2" /> Risk Metrics
      </Card.Header>
      <Card.Body>
        <Row className="mb-2">
          <Col>Total Volatility:</Col>
          <Col className="text-end">{formatPct(volatility)}</Col>
        </Row>
        <Row>
          <Col>Sharpe Ratio:</Col>
          <Col className="text-end">{sharpe.toFixed(2)}</Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default RiskMetricsCard;
