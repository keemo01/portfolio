import React from 'react';
import './Navbar.css';
import logo from '../../assets/logo.png';
import arrow from '../../assets/arrow.png';

const Navbar = () => {
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
            <select>
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
