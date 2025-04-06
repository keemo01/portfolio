import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col } from 'react-bootstrap';

const PortfolioMetrics = () => {
    const [metrics, setMetrics] = useState(null);
    const [ws, setWs] = useState(null);

    const connectWebSocket = useCallback(() => {
        const wsUrl = `ws://${window.location.hostname}:8000/ws/portfolio/`;
        const websocket = new WebSocket(wsUrl);

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'portfolio_update') {
                setMetrics(data.data);
            }
        };

        websocket.onclose = () => {
            setTimeout(connectWebSocket, 5000);
        };

        setWs(websocket);

        return () => {
            websocket.close();
        };
    }, []);

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [connectWebSocket]);

    if (!metrics) return null;

    const formatNumber = (num, decimals = 2) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num);
    };

    return (
        <Row className="mb-4">
            <Col md={6} lg={4}>
                <Card>
                    <Card.Body>
                        <h5>Real-time Portfolio Metrics</h5>
                        <div className="detail-row">
                            <span>Total Value:</span>
                            <span className="value">${formatNumber(metrics.total_value)}</span>
                        </div>
                        <div className="detail-row">
                            <span>Total Cost:</span>
                            <span className="value">${formatNumber(metrics.total_cost)}</span>
                        </div>
                        <div className="detail-row">
                            <span>Total P/L:</span>
                            <span className={`value ${metrics.total_pnl_percentage >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatNumber(metrics.total_pnl_percentage)}%
                            </span>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default PortfolioMetrics;
