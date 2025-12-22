import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            login(token);
            // Navigate to next onboarding step or dashboard
            // For now, let's go to notifications as that was the original flow from GetStarted
            navigate('/onboarding/notifications');
        } else {
            navigate('/');
        }
    }, [searchParams, login, navigate]);

    return (
        <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen items-center justify-center">
            <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                <h2 className="text-xl font-semibold dark:text-white">Completing sign in...</h2>
            </div>
        </div>
    );
};

export default AuthSuccess;
