import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';

export const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            
            const offlineAuthState = localStorage.getItem('stockbud_admin_auth');

            if (!navigator.onLine) {
                
                setIsAuthenticated(offlineAuthState === 'true');
                return;
            }

            try {
                
                await axios.get('http://localhost:3000/users/me'); 
                localStorage.setItem('stockbud_admin_auth', 'true');
                setIsAuthenticated(true);
            } catch (error) {
                
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('stockbud_admin_auth');
                    setIsAuthenticated(false);
                } else {
                    
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
