import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ListingApp from './components/ListingApp';
import HomePage from './pages/HomePage'

const AppRoutes = () => {
    return (
        <Router>
            <Routes>
                <Route path="/app/" element={<HomePage />} />
            </Routes>
            <Routes>
                <Route path="/" element={<ListingApp />} />
            </Routes>
        </Router>
    );
};

export default AppRoutes;