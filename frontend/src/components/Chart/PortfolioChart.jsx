import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, ButtonGroup, Button } from 'react-bootstrap';

const PortfolioChart = ({ data, onRangeChange }) => {
  const [activeRange, setActiveRange] = useState(30);

  // Sort the chart data chronologically for proper rendering
  const sortedData = useMemo(() => {
    if (!data || !data.length) return [];
    return data
      .map(item => ({
        ...item,
        timestamp: new Date(item.timestamp).getTime() // Convert ISO string to timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const handleRangeChange = useCallback(
    (days) => {
      setActiveRange(days);
      onRangeChange(days);
    },
    [onRangeChange]
  );

  return (
    <Card className="mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4>Portfolio Value Over Time</h4>
          <ButtonGroup size="sm">
            <Button 
              variant={activeRange === 7 ? "primary" : "outline-primary"}
              onClick={() => handleRangeChange(7)}
            >
              7D
            </Button>
            <Button 
              variant={activeRange === 30 ? "primary" : "outline-primary"}
              onClick={() => handleRangeChange(30)}
            >
              30D
            </Button>
            <Button 
              variant={activeRange === 90 ? "primary" : "outline-primary"}
              onClick={() => handleRangeChange(90)}
            >
              90D
            </Button>
          </ButtonGroup>
        </div>

        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
              dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={(ts) => {
                  const date = new Date(ts);
                  // e.g. show Month/Day
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />

              <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              />
              <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default PortfolioChart;