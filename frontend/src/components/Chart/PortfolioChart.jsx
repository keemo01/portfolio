import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, ButtonGroup, Button } from 'react-bootstrap';

const TIME_RANGES = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '180D', days: 180 },
  { label: '1Y', days: 365 }
];

const PortfolioChart = ({ data, onRangeChange }) => {
  // Default active range is 30 days.
  const [activeRange, setActiveRange] = useState(30);

  // Convert ISO timestamps to numbers and sort chronologically.
  const sortedData = useMemo(() => {
    if (!data || !data.length) return [];
    return data
      .map(item => ({
        ...item,
        timestamp: new Date(item.timestamp).getTime()
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
            {TIME_RANGES.map(({ label, days }) => (
              <Button
                key={days}
                variant={activeRange === days ? "primary" : "outline-primary"}
                onClick={() => handleRangeChange(days)}
              >
                {label}
              </Button>
            ))}
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
                  // Display Month/Day format.
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
