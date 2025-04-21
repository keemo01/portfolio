import React, { useContext, forwardRef } from 'react';
import './Navbar.css';
import logo from '../../assets/logo.png';
import arrow from '../../assets/arrow.png';
import { CoinContext } from '../../context/CoinContext';
import { useUser } from '../../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';

  const Navbar = () => {
    const { setCurrency } = useContext(CoinContext);
    const { user, logout } = useUser();
    const navigate = useNavigate();

    const symbolMap = { usd: '$', eur: '€', gbp: '£' };

    const currencyHandler = (e) => {
      const code = e.target.value;
      setCurrency({ name: code, symbol: symbolMap[code] });
    };

    const handleLogout = async () => {
      const refreshToken = localStorage.getItem('refresh_token');

      // Call the logout function from the context
      await logout();

      // Redirect to login page
      navigate('/login', { replace: true });
    };

    // Toggle for the dropdown
    const ProfileToggle = forwardRef(({ onClick }, ref) => (
      <button
        ref={ref}
        onClick={onClick}
        className="profile-icon-wrapper"
        aria-label="Open user menu"
      >
        <FaUser className="profile-icon" />
      </button>
    ));

    return (
      // Navbar component
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <Link to="/" className="navbar-logo" aria-label="Home">
          <img src={logo} alt="App logo" />
        </Link>

        <ul className="navbar-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/how-it-works">How It Works</Link></li>
          {!user && <li><Link to="/features">Features</Link></li>}
          {user && (
            <>
              <li><Link to="/analysis">Analysis</Link></li>
              <li><Link to="/blog">Blog</Link></li>
            </>
          )}
          {!user && <li><Link to="/contact">Contact</Link></li>}
        </ul>

        <div className="navbar-cta">
          <label htmlFor="currency-select" className="visually-hidden">
            Select currency
          </label>
          <select
            id="currency-select"
            onChange={currencyHandler}
            defaultValue="usd"
            aria-label="Currency"
          >
            {Object.keys(symbolMap).map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>

          {user ? (
            <div className="user-menu">
              <span className="welcome">Hi, {user.username}</span>
              <Dropdown align="end">
                <Dropdown.Toggle as={ProfileToggle} id="profile-dropdown" />
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to="/profile">Profile</Dropdown.Item>
                  <Dropdown.Item as={Link} to="/portfolio">Portfolio</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-outline">
                Login <img src={arrow} alt="→" />
              </Link>
              <Link to="/signup" className="btn-gradient">
                Sign Up <img src={arrow} alt="→" />
              </Link>
            </div>
          )}
        </div>
      </nav>
  );
}

export default Navbar;