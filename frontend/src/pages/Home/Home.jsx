import React, { useContext, useEffect, useState } from 'react';
import './Home.css';
import { CoinContext } from '../../context/CoinContext';
import{ Link } from 'react-router-dom';

const Home = () => {
  const { allCoin, currency } = useContext(CoinContext); // Destructure context to get allCoin and currency
  const [displayCoin, setDisplayCoin] = useState([]);
  const [input, setInput] = useState('');

  const inputHandler = (event) => {
   setInput (event. target. value);
   if(event.target.value === ""){
      setDisplayCoin(allCoin);
   }
  } 

  const searchHandler = async (event) => {
    event. preventDefault();
    const coins = await allCoin.filter((item)=>{
    return item.name.toLowerCase().includes(input.toLowerCase())
  })
  setDisplayCoin(coins);
}

  useEffect(() => {
    setDisplayCoin(allCoin); // Set coins to display
  }, [allCoin]);

  return (
    <div className="home">
      <div className="hero">
        <h1>Newest<br /> Crypto Website</h1>
        <p>
          Offering latest news, Access to bots, up-to-date prices, 
          and information on Crypto Projects
        </p>
        <form onSubmit={searchHandler}>
          <input onChange={inputHandler} list='coinlist' value={input} type="text" placeholder="Search for Crypto.." required/>

          <datalist id='coinlist'>
          {allCoin.map((item, index)=>(<option key={index} value={item.name}/>))}
          </datalist>

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
        {displayCoin.slice(0, 10).map((coin, index) => (
          <Link to={`/coin/${coin.id}`} className="table-layout" key={index}>
            <p>{coin.market_cap_rank}</p> {/* Rank */}
            <div>
              <img src={coin.image} alt={`${coin.name} logo`} />
              <p>{coin.name + " - " + coin.symbol}</p>
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
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;
