import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Coin from './pages/Coin/Coin';
import SignUp from './pages/Signup/Signup';
import Footer from './components/Footer/Footer';
import Login from './pages/Login/Login';
import Blog from './pages/Blog/Blog';
import CryptoNews from './pages/News/CryptoNews';
import Profile from './pages/Profile/Profile';
import BlogPost from './pages/Blog/BlogPost';
import Portfolio from './pages/Portfolio/Portfolio';
import { UserProvider } from './context/UserContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
    return (
        <UserProvider>
            <div className="app">
                <Navbar />{/* Navbar component */}
                <Routes>{/* Routes for different pages */}
                    <Route path="/" element={<Home />} />
                    <Route path="/coin/:coinId" element={<Coin />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:id" element={<BlogPost />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/news" element={<CryptoNews />} />
                </Routes>
                <Footer /> {/* Footer component */}
            </div>
        </UserProvider>
    );
};

export default App;