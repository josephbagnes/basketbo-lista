
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ListingApp from './components/ListingApp';
import LoginPage from './pages/LoginPage'
import BaseLayout from "@/components/BaseLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import HomePage from "@/pages/HomePage";
import GamesPage from "@/pages/GamesPage";

const AppRoutes = () => (
    <AuthProvider>
        <Router>
            <Routes>
                <Route path="app">
                    <Route index element={<LoginPage />} />
                    <Route element={<PrivateRoute />}>
                        <Route element={<BaseLayout />}>
                            <Route path="home" element={<HomePage />} />
                            <Route path="games" element={<GamesPage />} />
                        </Route>
                    </Route>
                </Route>
                <Route index path="/" element={<ListingApp />} />
            </Routes>
        </Router>
    </AuthProvider>
);

export default AppRoutes;
