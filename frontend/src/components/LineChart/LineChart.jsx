import React, { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';

const LineChart = ({ historicalData }) => {
  const [chartData, setChartData] = useState([]);
  const [colors, setColors] = useState([]);

  useEffect(() => {
    if (historicalData && historicalData.prices) {
      // Prepare data for Candlestick Chart
      const data = [
        ['Date', 'Low', 'Open', 'Close', 'High'],
      ];
      const candleColors = [];

      historicalData.prices.forEach(([time, price], index) => {
        const low = price * 0.95;
        const open = price * 0.98;
        const close = price * 1.02;
        const high = price * 1.05;

        data.push([
          new Date(time).toLocaleDateString(),
          low,
          open,
          close,
          high,
        ]);

        // Determine candle color based on close price comparison
        if (index > 0) {
          const prevClose = historicalData.prices[index - 1][1] * 1.02; // Previous candle close price
          candleColors.push(close > prevClose ? '#0f9d58' : '#a52714'); // Green if higher, Red if lower
        } else {
          // Default color for the first candle
          candleColors.push('#0f9d58');
        }
      });

      setChartData(data);
      setColors(candleColors);
    }
  }, [historicalData]);

  return (
    <Chart
      chartType="CandlestickChart"
      width="100%"
      height="400px"
      data={chartData}
      options={{
        title: 'Price Chart',
        legend: 'none',
        candlestick: {
          fallingColor: { strokeWidth: 0, fill: colors[0] || '#a52714' }, // Dynamic falling color
          risingColor: { strokeWidth: 0, fill: colors[1] || '#0f9d58' }   // Dynamic rising color
        }
      }}
    />
  );
};

export default LineChart;