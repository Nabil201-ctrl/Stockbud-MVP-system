import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';

export const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            // Check for a saved authentication state first for PWA offline capabilities
            const offlineAuthState = localStorage.getItem('stockbud_admin_auth');

            if (!navigator.onLine) {
                // If the user is entirely offline, trust the locally cached state rather than forcefully logging them out.
                setIsAuthenticated(offlineAuthState === 'true');
                return;
            }

            try {
                // When online, ping the service
                await axios.get('http://localhost:3000/users/me'); // Direct to backend instead of /api proxy since Dashboard uses :3000 directly
                localStorage.setItem('stockbud_admin_auth', 'true');
                setIsAuthenticated(true);
            } catch (error) {
                // Distinction between genuine 401 or a severe network failure/CORS problem where server is offline
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('stockbud_admin_auth');
                    setIsAuthenticated(false);
                } else {
                    // Server is unreachable, rather than logging them out, fallback to last known state!
                    setIsAuthenticated(offlineAuthState === 'true' ? true : false);
                }
            }
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};
