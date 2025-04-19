import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CoinContext } from '../../context/CoinContext';
import './Home.css';
import heroGraphic from '../../assets/crypto.png';

const Home = () => {
  const { allCoin, currency } = useContext(CoinContext); // Context to access all coins and currency
  const [displayCoin, setDisplayCoin] = useState([]); // State to manage the displayed coins and input value
  const [input, setInput] = useState(''); // State to manage the input value

  // Initialize display with all coins
  useEffect(() => {
    setDisplayCoin(allCoin);
  }, [allCoin]);

  // Input handler to update the input state
  const inputHandler = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val === '') {
      setDisplayCoin(allCoin);
    }
  };

  // Search handler to filter coins based on input
  const searchHandler = (e) => {
    e.preventDefault();
    const filtered = allCoin.filter((coin) =>
      coin.name.toLowerCase().includes(input.toLowerCase())
    );
    setDisplayCoin(filtered); // Update the displayed coins based on the input
  };

  return (
    <div className="home">

      {/* Hero Section */}
      <div className="hero">
        <div className="hero-content">
          <h1>
          Track Your Crypto holdings<br/>
          Build & Share Your Insights
          </h1>
          <p>
          Monitor your holdings in real time, collaborate with friends, 
          and discover top traders insights
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn-gradient">
              Get Started
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <img src={heroGraphic} alt="3D Crypto Illustration" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <h2>Find Your Coin</h2>
        <form onSubmit={searchHandler} className="search-form">
          <input
            list="coinlist"
            value={input}
            onChange={inputHandler}
            type="text"
            placeholder="Search for Crypto…"
            required
          />
          <datalist id="coinlist">
            {allCoin.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <button type="submit" className="btn-search">
            Search
          </button>
        </form>
      </div>

      {/* Coin Table */}
      <div className="crypto-table">
        <div className="table-layout header-row">
          <p>#</p>
          <p>Coin</p>
          <p>Price</p>
          <p style={{ textAlign: 'center' }}>24H Change</p>
          <p className="market-cap">Market Cap</p>
        </div>

        {displayCoin.slice(0, 10).map((coin, idx) => (
          <Link
            to={`/coin/${coin.id}`}
            className="table-layout coin-row"
            key={coin.id}
          >
            <p>{coin.market_cap_rank}</p>
            <div className="coin-info">
              <img src={coin.image} alt={`${coin.name} logo`} />
              <p>
                {coin.name} <span className="symbol">({coin.symbol.toUpperCase()})</span>
              </p>
            </div>
            <p>
              {currency.symbol}{' '}
              {coin.current_price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p
              style={{
                textAlign: 'center',
                color: coin.price_change_percentage_24h < 0 ? 'red' : 'green',
              }}
            >
              {coin.price_change_percentage_24h?.toFixed(2)}%
            </p>
            <p className="market-cap">
              {currency.symbol}{' '}
              {coin.market_cap.toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;
