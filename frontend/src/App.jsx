import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Coin from './pages/Coin/Coin';
import SignUp from './pages/SignUp/SignUp';
import Footer from './components/Footer/Footer';
import Login from './pages/Login/Login';
import Blog from './pages/Blog/Blog';
import Profile from './pages/Profile/Profile';
import BlogPost from './pages/Blog/BlogPost';
import Portfolio from './pages/Portfolio/Portfolio';
import UserProfile from './pages/UserProfile/UserProfile';
import { UserProvider } from './context/UserContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';


const App = () => {
    return (
        <AuthProvider>
            <UserProvider>
                <div className="app">
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/coin/:coinId" element={<Coin />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/blog" element={<Blog />} />
                        <Route path="/blog/:id" element={<BlogPost />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/profile/:userId" element={<UserProfile />} />
                        <Route path="/portfolio" element={<Portfolio />} />
                    </Routes>
                    <Footer />
                </div>
            </UserProvider>
        </AuthProvider>
    );
};

export default App;