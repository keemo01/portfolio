import React, { useContext, useEffect, useState } from 'react';
import './Home.css';
import { CoinContext } from '../../context/CoinContext';

const Home = () => {
  const { allCoin, currency } = useContext(CoinContext); // Destructure context to get allCoin and currency
  const [displayCoin, setDisplayCoin] = useState([]);

  useEffect(() => {
    setDisplayCoin(allCoin); // Set coins to display
  }, [allCoin]);

  return (
    <div className="home">
      <div className="hero">
        <h1>Newest<br /> Crypto Portfolio Website</h1>
        <p>
          Offering latest news, Access to bots, up-to-date prices, 
          and information on Crypto Projects
        </p>
        <form>
          <input type="text" placeholder="Search for Crypto.." />
          <button type="submit">Search</button>
        </form>
      </div>
      <div className="crypto-table">
        {/* Table Headers */}
        <div className="table-layout header-row">
          <p>#</p>
          <p>Coins</p>
          <p>Price</p>
          <p style={{ textAlign: "center" }}>24H Change</p>
          <p className="market-cap">Market Cap</p>
        </div>

        {/* Render Coins */}
        {displayCoin.slice(0, 10).map((coin) => (
          <div className="table-layout" key={coin.id}>
            <p>{coin.market_cap_rank}</p> {/* Rank */}
            <div>
              <img src={coin.image} alt={`${coin.name} logo`} />
              {coin.name} - {coin.symbol.toUpperCase()}
            </div> {/* Name, Symbol, and Logo */}
            <p>
              {currency.symbol} {coin.current_price.toLocaleString()} {/* Dynamic Currency Symbol */}
            </p> {/* Price */}
            <p
              style={{
                textAlign: "center",
                color: coin.price_change_percentage_24h < 0 ? "red" : "green",
              }}
            >
              {coin.price_change_percentage_24h?.toFixed(2)}%
            </p> {/* 24H Change */}
            <p className="market-cap">
              {currency.symbol} {coin.market_cap.toLocaleString()} {/* Dynamic Currency Symbol */}
            </p> {/* Market Cap */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
