import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Coin from './pages/Coin/Coin';
import SignUp from './pages/SignUp/SignUp';
import Footer from './components/Footer/Footer';
import Login from './pages/Login/Login';
import Blog from './pages/Blog/Blog';
import BlogPost from './pages/Blog/BlogPost';
import CreateBlog from './pages/Blog/CreateBlog';
import { UserProvider } from './context/UserContext';

const App = () => {
    return (
        <UserProvider>
            <div className="app">
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/coin/:coinId" element={<Coin />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/create" element={<CreateBlog />} />
                    <Route path="/blog/:id" element={<BlogPost />} />
                </Routes>
                <Footer />
            </div>
        </UserProvider>
    );
};

export default App;