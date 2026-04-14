import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (isAuthenticated && !user) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }



    if (user && !user.isOnboardingComplete && !location.pathname.startsWith('/onboarding') && location.pathname !== '/get-started') {
        return <Navigate to="/get-started" replace />;
    }


    // Check for forced password change
    if (user && user.requiresPasswordChange && location.pathname !== '/settings') {
        return <Navigate to="/settings" state={{ activeTab: 'security', forcedPasswordChange: true }} replace />;
    }

    if (user && user.isOnboardingComplete && (location.pathname.startsWith('/onboarding') || location.pathname === '/get-started')) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
