import React, { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';

const LineChart = ({ historicalData }) => {
  // Initialize with header row for Google Charts
  const [chartData, setChartData] = useState([['Date', 'Price']]);

  useEffect(() => {
    // Check if historicalData is available and has prices
    if (historicalData?.prices) {
      const rows = [['Date', 'Price']];
      historicalData.prices.forEach(([timestamp, price]) => {
        rows.push([
          new Date(timestamp).toLocaleDateString(), // human‐readable date
          price,                                    // price value
        ]);
      });
      setChartData(rows);
    }
  }, [historicalData]);

  return (
    <Chart
      chartType="LineChart"
      width="100%"
      height="400px"
      data={chartData}
      options={{
        title: 'Price Over Time',       // chart title
        legend: { position: 'none' },  
        hAxis: { title: 'Date' },       // label the X‑axis
        vAxis: { title: 'Price' },      // label the Y‑axis
        curveType: 'function',          // smooth the line
      }}
    />
  );
};

export default LineChart;
