import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from 'react-bootstrap';

// Colour scheme for the pie chart slices
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F',
  '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1'
];

const AssetAllocationChart = ({ data }) => {
  // Calculate the total portfolio value
  const totalValue = data.reduce((sum, item) => sum + parseFloat(item.current_value), 0);

  // Convert the raw asset data into percentage-based allocation
  const allocationData = data
    .map(item => ({
      name: item.coin, // Coin name
      value: (parseFloat(item.current_value) / totalValue) * 100, // Percentage of total portfolio
      amount: parseFloat(item.current_value) // The value in dollars
    }))
    .sort((a, b) => b.value - a.value); // Sorts the assets largest to smallest

  return (
    <Card className="mb-4">
      <Card.Body>
        <h4 className="mb-4">Asset Allocation</h4>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <PieChart>
              {/* Pie Chart */}
              <Pie
                data={allocationData}
                dataKey="value" // Percentage for size
                nameKey="name" // Name of asset
                cx="50%" cy="50%" outerRadius={150}
                labelLine={false}
                label={({ name, value }) => `${name} (${value.toFixed(1)}%)`} // The display name + percentage
              >
                {/* Assign colours */}
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              {/* Tooltip shows value and percentage */}
              <Tooltip
                formatter={(value, name, props) => [
                  `$${props.payload.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} (${value.toFixed(1)}%)`,
                  name
                ]}
              />

              {/* Indicates the asset colors */}
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AssetAllocationChart;
