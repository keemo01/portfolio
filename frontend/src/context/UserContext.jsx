import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null); // User state

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('http://127.0.0.1:8000/api/test-token/', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                },
            })
                .then((response) => response.ok ? response.json() : Promise.reject())
                .then((data) => {
                    setUser({ username: data.username, email: data.email, token }); // Include token in user state
                })
                .catch(() => {
                    localStorage.removeItem('token'); // Remove invalid token
                    setUser(null);
                });
        }
    }, []);

    const logout = () => {
        localStorage.removeItem('token'); // Remove token
        setUser(null); // Reset user state
    };

    return (
        <UserContext.Provider value={{ user, setUser, logout }}>
            {children}
        </UserContext.Provider>
    );
};