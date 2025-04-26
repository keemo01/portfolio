import React, { createContext, useEffect, useState, useCallback } from 'react';


const CG_URL  = process.env.REACT_APP_CG_URL;

// Create the context
export const CoinContext = createContext();

const CoinContextProvider = (props) => {
  // The chosen currency and associated coin data will be kept by the state
  const [allCoin, setAllCoin] = useState([]);
  const [currency, setCurrency] = useState({
    name: 'usd',
    symbol: '$',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to fetch all coins from the API
  const fetchAllCoin = useCallback(async () => {
    setLoading(true);
    setError(null);

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-cg-demo-api-key': 'CG-91Na3gF37jLkMimFB9B4FtwP'
      },
    };

    try {
      const res = await fetch(
        `${CG_URL}/coins/markets?vs_currency=${currency.name}`
        , options
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAllCoin(data);
    } catch (err) {
      console.error('Failed to fetch coins:', err);
      setError('Could not load coin data');
    } finally {
      setLoading(false);
    }
  }, [currency.name]);

  // fetch on mount and whenever currency changes
  useEffect(() => {
    fetchAllCoin();
  }, [fetchAllCoin]);




return (
  // Provide the context to all children components
    // This allows any child component to access the context value
  <CoinContext.Provider
    value={{allCoin, currency, setCurrency,
            fetchAllCoin, loading, error }}
  >
    {props.children}
  </CoinContext.Provider>
);
};

export default CoinContextProvider;