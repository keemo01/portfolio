import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from 'react-bootstrap';

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E',
  '#2EC4B6', '#E71D36', '#011627', '#41B3A3', '#E8AA14',
  '#1B998B', '#2D3047', '#E84855', '#4EA699', '#CAE7B9'
];

const AssetAllocationChart = ({ data }) => {
  const pieData = useMemo(() => {
    return data.map(item => ({
      name: item.coin,
      value: parseFloat(item.current_value)
    }));
  }, [data]);

  const formatTooltipValue = (value) => {
    return `$${new Intl.NumberFormat('en-US').format(value)}`;
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <h4 className="mb-4">Asset Allocation</h4>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={({ name, percent }) => 
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={true}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AssetAllocationChart;
