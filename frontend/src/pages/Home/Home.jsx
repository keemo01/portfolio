import React from 'react'
import './Home.css'

const Home = () => {
  return (
    <div className='home'>
      <div className='hero'>
        <h1>Newest<br/> Crypto Portfolio Website</h1>
        <p>Offering latest news, Access to bots, up to date prices 
          and information on Crypto Projects</p>
        <form>
          <input type='text' placeholder='Search for Crypto..'/>
          <button type="submit">Search</button>
        </form>
      </div>
      <div className="crypto-table">
        <div className="table-layout">
        <p>#</p>
        <p>Coins</p>
        <p>Price</p>
        <p>24H Change</p>
        <p>Market Cap</p>
      </div>
      </div>
    </div>
  )
}

export default Home