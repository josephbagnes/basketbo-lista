// src/components/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function PrivateRoute() {
    const { user, loading } = useAuth();
    if (loading) return null; // or a loading spinner
    return user ? <Outlet /> : <Navigate to="/app" replace />;
}