import React from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';

const AssetAllocationChart = ({ data }) => {
  // Transform portfolio data into chart format
  const chartData = data.map(item => ({
    name: item.coin,
    value: parseFloat(item.current_value)
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie 
          data={chartData} 
          dataKey="value" 
          nameKey="name" 
          cx="50%" 
          cy="50%" 
          outerRadius={80} 
          fill="#8884d8" 
          label
        />
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AssetAllocationChart;
