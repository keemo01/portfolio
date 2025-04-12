import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, Button, ButtonGroup } from 'react-bootstrap';

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#FF595E',
  '#2EC4B6', '#E71D36', '#011627', '#41B3A3', '#E8AA14',
  '#1B998B', '#2D3047', '#E84855', '#4EA699', '#CAE7B9'
];

const AssetAllocationChart = ({ data }) => {
  // Used useMemo to transform the incoming data into a suitable format for the charts
  const pieData = useMemo(() => {
    return data.map(item => ({
      name: item.coin,
      value: parseFloat(item.current_value)
    }));
  }, [data]);

  // Added a state variable to toggle among multiple chart views
  // The available chart types are 'pie', 'donut', and 'bar'
  const [chartType, setChartType] = useState('pie');

  // Defined a helper function to format numerical values as currency in tooltips
  const formatTooltipValue = (value) => {
    return `$${new Intl.NumberFormat('en-US').format(value)}`;
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <h4 className="mb-4">Asset Allocation</h4>
        {/* Provided buttons for switching between the pie chart, donut chart, and bar chart */}
        <ButtonGroup className="mb-3">
          <Button variant={chartType === 'pie' ? 'primary' : 'outline-primary'} onClick={() => setChartType('pie')}>
            Pie Chart
          </Button>
          <Button variant={chartType === 'donut' ? 'primary' : 'outline-primary'} onClick={() => setChartType('donut')}>
            Donut Chart
          </Button>
          <Button variant={chartType === 'bar' ? 'primary' : 'outline-primary'} onClick={() => setChartType('bar')}>
            Bar Chart
          </Button>
        </ButtonGroup>
        <div style={{ width: '100%', height: 300 }}>
          {chartType === 'pie' && (
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {chartType === 'donut' && (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}  // Sets innerRadius to create the donut effect
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {chartType === 'bar' && (
            <ResponsiveContainer>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default AssetAllocationChart;