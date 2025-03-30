import React, { useContext, useEffect, useState } from 'react';
import './Home.css';
import { CoinContext } from '../../context/CoinContext';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Portfolio from '../../assets/portfolio.png';

const Home = () => {
  const { allCoin, currency } = useContext(CoinContext);
  const { user } = useContext(AuthContext);
  
  // State to store dynamic conversion rates (base USD)
  const [conversionRates, setConversionRates] = useState({
    USD: 1,
    GBP: 1,
    EUR: 1
  });

  // Mapping from currency symbols to their respective currency codes
  const currencyMap = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR'
  };

  // Fetch real-world conversion rates from an external API
  useEffect(() => {
    const fetchConversionRates = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        setConversionRates({
          USD: 1,
          GBP: data.rates.GBP,
          EUR: data.rates.EUR
        });
      } catch (error) {
        console.error("Error fetching conversion rates:", error);
      }
    };
    fetchConversionRates();
  }, []);

  // Convert a price in USD to the selected currency using real-time rates
  const convertPrice = (priceInUSD) => {
    const rate = conversionRates[currencyMap[currency.symbol]] || 1;
    const converted = parseFloat(priceInUSD) * rate;
    return converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // State variables for coins and market data
  const [displayCoin, setDisplayCoin] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('hot');
  const [marketData, setMarketData] = useState([]);

  // Fetch data from Bybit
  const fetchBybitData = async () => {
    try {
      const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
      const data = await response.json();
      if (data.result && data.result.list) {
        return data.result.list.filter(coin => coin.symbol.endsWith('USDT'));
      }
      return [];
    } catch (error) {
      console.error('Error fetching Bybit data:', error);
      return [];
    }
  };

  // Update market data based on the selected tab, with conversion applied where needed
  const updateMarketData = async (tab) => {
    const bybitData = await fetchBybitData();
    let sortedData = [...bybitData];
    
    switch(tab) {
      case 'hot':
        sortedData.sort((a, b) => parseFloat(b.turnover24h) - parseFloat(a.turnover24h));
        break;
      case 'new':
        // For new pairs, you might decide on a different sorting strategy.
        break;
      case 'gainers':
        sortedData.sort((a, b) => parseFloat(b.price24hPcnt) - parseFloat(a.price24hPcnt));
        break;
      case 'losers':
        sortedData.sort((a, b) => parseFloat(a.price24hPcnt) - parseFloat(b.price24hPcnt));
        break;
      default:
        break;
    }
    return sortedData.slice(0, 10); // Show top 10 results
  };

  const handleTabClick = async (tab) => {
    setActiveTab(tab);
    const data = await updateMarketData(tab);
    setMarketData(data);
  };

  useEffect(() => {
    handleTabClick('hot');
  }, []);

  // Update market data when the currency changes
  useEffect(() => {
    if (marketData.length > 0) {
      handleTabClick(activeTab);
    }
  }, [currency]);

  // Handle search input changes
  const inputHandler = (event) => {
    setInput(event.target.value);
    if (event.target.value === "") {
      setDisplayCoin(allCoin);
    }
  };

  // Handle search submission
  const searchHandler = async (event) => {
    event.preventDefault();
    const coins = allCoin.filter((item) =>
      item.name.toLowerCase().includes(input.toLowerCase())
    );
    setDisplayCoin(coins);
  };

  // Update display coins when allCoin changes
  useEffect(() => {
    setDisplayCoin(allCoin);
  }, [allCoin]);

  return (
    <div className="home">
      <div className="hero">
        <h1>Newest<br /> Crypto Website</h1>
        <p>
          Offering the latest news, access to bots, up-to-date prices, 
          and information on Crypto Projects.
        </p>
        {!user && (
          <div className="cta-container">
            <Link to="/signup" className="cta-button">
              Join the community & track your portfolio!
            </Link>
            <p className="cta-subtext">
              Start sharing your crypto insights today.
            </p>
          </div>
        )}
        <form onSubmit={searchHandler}>
          <input
            onChange={inputHandler}
            list="coinlist"
            value={input}
            type="text"
            placeholder="Search for Crypto..."
            required
          />
          <datalist id="coinlist">
            {allCoin.map((item, index) => (
              <option key={index} value={item.name} />
            ))}
          </datalist>
          <button type="submit">Search</button>
        </form>
      </div>

      <div className="market-overview">
        <div className="market-tabs">
          <button 
            className={`tab-button ${activeTab === 'hot' ? 'active' : ''}`}
            onClick={() => handleTabClick('hot')}
          >
            Hot 🔥
          </button>
          <button 
            className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => handleTabClick('new')}
          >
            New 🆕
          </button>
          <button 
            className={`tab-button ${activeTab === 'gainers' ? 'active' : ''}`}
            onClick={() => handleTabClick('gainers')}
          >
            Gainers 📈
          </button>
          <button 
            className={`tab-button ${activeTab === 'losers' ? 'active' : ''}`}
            onClick={() => handleTabClick('losers')}
          >
            Losers 📉
          </button>
        </div>

        <table className="market-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Pair</th>
              <th>Price ({currency.symbol})</th>
              <th>24h Change</th>
              <th>24h Volume ({currency.symbol})</th>
            </tr>
          </thead>
          <tbody>
            {marketData.map((coin, index) => (
              <tr key={coin.symbol}>
                <td>{index + 1}</td>
                <td>
                  <Link to={`/coin/${coin.symbol}`} className="table-link">
                    <div className="coin-cell">
                      <span className="coin-symbol">{coin.symbol.replace('USDT', '')}</span>
                      <span className="coin-pair">/USDT</span>
                    </div>
                  </Link>
                </td>
                <td>{convertPrice(coin.lastPrice)}</td>
                <td className={parseFloat(coin.price24hPcnt) < 0 ? 'price-down' : 'price-up'}>
                  {(parseFloat(coin.price24hPcnt) * 100).toFixed(2)}%
                </td>
                <td>{convertPrice(coin.turnover24h)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> {/* End of market-overview */}
      
      {/*Download App Section */}
      <div className="download-section">
        <h2>Track easily on the go. Anywhere, anytime.</h2>
        <p>Scan to Download App</p>
        <img src={Portfolio} alt="Download App" />
        <p>Available on iOS, Android, MacOS, Windows, and Linux.</p>
      </div>

      {/* FAQ Section */}
      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>What is this app about?</h3>
          <p>This app provides real-time crypto market data and news updates.</p>
        </div>
        <div className="faq-item">
          <h3>How do I download the app?</h3>
          <p>Simply scan the QR code above or visit our download page from the website.</p>
        </div>
        <div className="faq-item">
          <h3>Which platforms are supported?</h3>
          <p>iOS, Android, MacOS, Windows, and Linux.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
