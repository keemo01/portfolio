import './Navbar.css'; // Import styles for the navbar component

import logo from '../../assets/logo.png'; // Import logo image
import arrow from '../../assets/arrow.png'; // Import arrow image

import { CoinContext } from '../../context/CoinContext'; // Import CoinContext
import { UserContext } from '../../context/UserContext'; // Import UserContext
import React, { useContext } from 'react'; // Import React and useContext hook
import { Link } from 'react-router-dom';

const Navbar = () => {
    const { setCurrency } = useContext(CoinContext); // Destructure setCurrency from CoinContext
    const { user, logout } = useContext(UserContext); // Destructure user and logout from UserContext

    const currencyHandler = (event) => { // Handle currency changes
        switch (event.target.value) {
            case "usd":
                setCurrency({ name: "usd", symbol: "$" });
                break;
            case "eur":
                setCurrency({ name: "eur", symbol: "€" });
                break;
            case "gbp":
                setCurrency({ name: "gbp", symbol: "£" });
                break;
            default:
                setCurrency({ name: "usd", symbol: "$" });
                break;
        }
    };

    return (
        <div className='navigation-bar'>
            <Link to={'/'}>
                <img src={logo} alt="Logo" className='logo' />
            </Link>
            <ul>
                <Link to={'/'}><li>Home</li></Link>
                <li>Features</li>
                <li>Pricing</li>
                <li><Link to="/blog">Blog</Link></li>
            </ul>
            <div className='nav-actions'>
                <select onChange={currencyHandler}>
                    <option value="usd">USD</option>
                    <option value="eur">EUR</option>
                    <option value="gbp">GBP</option>
                </select>
                {user ? ( // Show Logout when logged in
                    <>
                        <span className="welcome-user">Welcome, {user.username}</span>
                        <button onClick={logout}>Logout</button>
                    </>
                ) : ( // Show Login/SignUp when not logged in
                    <>
                        <Link to={'/login'}>
                            <button>Login <img src={arrow} alt="Arrow" /></button>
                        </Link>
                        <Link to={'/signup'}>
                            <button>Sign Up <img src={arrow} alt="Arrow" /></button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default Navbar;
