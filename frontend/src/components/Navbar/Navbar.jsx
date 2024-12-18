import './Navbar.css'; // Import styles for the navbar component

import logo from '../../assets/logo.png'; // Import logo image
import arrow from '../../assets/arrow.png'; // Import arrow image

import { CoinContext } from '../../context/CoinContext'; // Import CoinContext
import React, { useContext } from 'react'; // Import React and useContext hook
import { Link } from 'react-router-dom';

const Navbar = () => {

  const { setCurrency } = useContext(CoinContext); // Destructure setCurrency function from CoinContext

  const currencyHandler = (event) => { // Function to handle currency change
    switch (event.target.value) {
      case "usd": {
        setCurrency({ name: "usd", symbol: "$" }); // Set currency to USD
        break;
      }
      case "eur": {
        setCurrency({ name: "eur", symbol: "€" }); // Set currency to EUR
        break;
      }
      case "gbp": {
        setCurrency({ name: "gbp", symbol: "£" }); // Set currency to GBP
        break;
      }
      default: {
        setCurrency({ name: "usd", symbol: "$" }); // Default currency set to USD
        break;
      }
    }
  };


  return (
    <div className='navigation-bar'>  {/* Main navigation bar container */}
    <Link to={'/'}>
        <img src={logo} alt="" className='logo'/> {/* Logo image */}
        </Link>
        <ul> {/* Unordered list for navigation links */}
        <Link to={'/'}>  <li>Home</li></Link>`
            <li>Features</li>
            <li>Pricing</li>
            <li>Blog</li>
        </ul>
        <div className='nav-actions'> {/* Container for currency selection and signup button */}
            <select onChange={currencyHandler}> {/* Dropdown for currency selection */}
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
            </select>
            <Link to={'/signup'}>            
            <button> Sign Up <img src={arrow} alt="" /></button> {/* Signup button with arrow icon */}
            </Link>
        </div>
    </div>
  );
};

export default Navbar;