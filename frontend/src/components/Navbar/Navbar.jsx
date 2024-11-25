import './Navbar.css';
import logo from '../../assets/logo.png';
import arrow from '../../assets/arrow.png';
import { CoinContext } from '../../context/CoinContext';
import React, { useContext } from 'react';


const Navbar = () => {

  const {setCurrency} = useContext(CoinContext)

  const currencyHandler = (event) => {
    switch (event.target.value) {
      case "usd": {
        setCurrency({ name: "usd", symbol: "$" });
        break;
      }
      case "eur": {
        setCurrency({ name: "eur", symbol: "€" });
        break;
      }
      case "gbp": {
        setCurrency({ name: "gbp", symbol: "£" });
        break;
      }
      default: {
        setCurrency({ name: "usd", symbol: "$" });
        break;
      }
    }
  };


  return (
    <div className='navigation-bar'>
        <img src={logo} alt="" className='logo'/>
        <ul>
            <li>Home</li>
            <li>Features</li>
            <li>Pricing</li>
            <li>Blog</li>
        </ul>
        <div className='nav-actions'>
            <select onChange={currencyHandler}>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
            </select>
            <button> Sign Up <img src={arrow} alt="" /></button>
        </div>
    </div>
  );
};

export default Navbar;
