import React, { useContext, useEffect, useState } from 'react';
import './Coin.css';
import { useParams } from 'react-router-dom';
import { CoinContext } from '../../context/CoinContext';
import LineChart from '../../components/LineChart/LineChart';

const Coin = () => {
  const { coinId } = useParams();
  const [coinData, setCoinData] = useState();
  const [historicalData, setHistoricalData] = useState();
  const { currency } = useContext(CoinContext);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCoinData = async () => {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-cg-demo-api-key': 'CG-91Na3gF37jLkMimFB9B4FtwP',
      },
    };

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}`,
        options
      );
      const data = await response.json();
      setCoinData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching coin data:', error);
      // Handle error here (e.g., display error message)
    }
  };

  const fetchHistoricalData = async () => {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-cg-demo-api-key': 'CG-91Na3gF37jLkMimFB9B4FtwP',
      },
    };

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency.name}&days=10&interval=daily`,
        options
      );
      const data = await response.json();
      setHistoricalData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      // Handle errors here
    }
  };

  useEffect(() => {
    fetchCoinData();
    fetchHistoricalData();
  }, [currency]);

  if (isLoading) {
    return <p>Loading...</p>;
  } else {
    return (
      <div className="coin">
        <div className="coin-name">
          <img src={coinData?.image?.large || 'placeholder.png'} alt="" />
          <p><b>{coinData?.name || 'N/A'} ({coinData?.symbol?.toUpperCase() || 'N/A'})</b></p>
        </div>
        <div className="coin-chart">
          <LineChart historicalData={historicalData} />
        </div>
        <div className="coin-info">
          <ul>
            <li>Crypto Market Rank</li>
            <li>{coinData?.market_cap_rank}</li>
          </ul>
          <ul>
            <li>Current Price</li>
            <li>
              {currency.symbol} {coinData?.market_data?.current_price?.[currency.name]?.toLocaleString() || 'N/A'}
            </li>
          </ul>
          <ul>
            <li>Market Cap</li>
            <li>
              {currency.symbol} {coinData?.market_data?.market_cap?.[currency.name]?.toLocaleString() || 'N/A'}
            </li>
          </ul>
          <ul>
            <li>24HR High</li>
            <li>
              {currency.symbol} {coinData?.market_data?.high_24h?.[currency.name]?.toLocaleString() || 'N/A'}
            </li>
          </ul>
          <ul>
            <li>24HR Low</li>
            <li>
              {currency.symbol} {coinData?.market_data?.low_24h?.[currency.name]?.toLocaleString() || 'N/A'}
            </li>
          </ul>
        </div>
      </div>
    );
  }
};

export default Coin;