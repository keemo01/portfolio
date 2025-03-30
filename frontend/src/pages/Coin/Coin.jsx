import React, { useEffect, useState } from 'react';
import './Coin.css';
import { useParams } from 'react-router-dom';

const Coin = () => {
	// coinId is expected to be like "BTCUSDT"
	const { coinId } = useParams();
	const [coinData, setCoinData] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch coin details from Bybit API for the specific symbol
	const fetchCoinData = async () => {
		try {
			const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${coinId}`);
			const data = await response.json();
			if (data.result && data.result.list && data.result.list.length > 0) {
				setCoinData(data.result.list[0]);
			}
			setIsLoading(false);
		} catch (error) {
			console.error('Error fetching coin data from Bybit:', error);
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchCoinData();
	}, [coinId]);

	if (isLoading || !coinData) {
		return <p>Loading...</p>;
	}

	return (
		<div className="coin">
			<div className="coin-name">
				<h1>{coinId.replace('USDT', '')} (USDT)</h1>
			</div>
			<div className="coin-details">
				<ul>
					<li><strong>Last Price:</strong> {coinData.lastPrice}</li>
					<li><strong>24h Change:</strong> {(parseFloat(coinData.price24hPcnt) * 100).toFixed(2)}%</li>
					<li><strong>24h Volume:</strong> {coinData.turnover24h}</li>
					<li><strong>24h High:</strong> {coinData.high24h}</li>
					<li><strong>24h Low:</strong> {coinData.low24h}</li>
				</ul>
			</div>
		</div>
	);
};

export default Coin;