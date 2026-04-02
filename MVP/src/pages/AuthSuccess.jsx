import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loginSuccess = searchParams.get('login_success');

        // Close popup if this is an OAuth flow
        if (window.opener && loginSuccess) {
            window.opener.postMessage({
                type: 'STOCKBUD_AUTH_SUCCESS',
                status: 'success'
            }, '*');
            window.close();
            return;
        }

        // Wait for checkAuth in AuthProvider to finish loading user from HttpOnly cookies
        if (!loading) {
            if (user) {
                navigate('/dashboard'); // or /onboarding/notifications
            } else if (!loginSuccess) {
                navigate('/');
            }
        }
    }, [user, loading, navigate, searchParams]);

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
