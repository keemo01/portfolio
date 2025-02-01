import React, { createContext, useEffect, useState } from 'react';

// Create the context
export const CoinContext = createContext();

const CoinContextProvider = (props) => {
  // The chosen currency and associated coin data will be kept by the state
  const [allCoin, setAllCoin] = useState([]);
  const [currency, setCurrency] = useState({
    name: 'usd',
    symbol: '$',
  });

  // Function to fetch all coin data from the API
  const fetchAllCoin = async () => {
    const options = {
      method: 'GET',
      headers: { accept: 'application/json', 'x-cg-demo-api-key': 'CG-91Na3gF37jLkMimFB9B4FtwP' },
    };

    fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency.name}`, options)
      .then(response => response.json())
      .then(response => setAllCoin(response)) // Set the fetched data to state
      .catch(err => console.error(err)); // Catchs any errors
  };
  
  useEffect(() => {
    fetchAllCoin(); // Retrieve coin data anytime there is a change in value.
  }, [currency]);

  const contextValue = {
    // Values to be passed to context
    allCoin, currency, setCurrency
  };

  return (
    // Give the context values to the children components
    <CoinContext.Provider value={contextValue}>
      {props.children}
    </CoinContext.Provider>
  );
};

export default CoinContextProvider;
