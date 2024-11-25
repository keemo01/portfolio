import React from "react";
import Navbar from "./components/Navbar/Navbar";
import { Routes, Route } from "react-router-dom";
import Home from './pages/Home/Home';  // Make sure Home.jsx is in the correct path
import Coin from './pages/Coin/Coin';  // Make sure Coin.jsx is in the correct path


const App = () => {
  return (
    <div className="app">
      <Navbar/>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/coin/:coinId" element={<Coin/>}/>


      </Routes>
    </div>
  )
}

export default App