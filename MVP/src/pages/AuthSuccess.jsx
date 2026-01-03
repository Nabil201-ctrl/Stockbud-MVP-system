import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // If we have a user (meaning cookies worked), proceed
        if (!loading && user) {
            navigate('/onboarding/notifications');
        } else if (!loading && !user) {
            // If loading finished and still no user, something failed.
            // But wait, check URL param specifically to differentiate from random access
            const loginSuccess = searchParams.get('login_success');
            if (!loginSuccess) {
                navigate('/');
            }
            // If login_success is true but no user, maybe give it a moment or show error?
            // For now, let's just stay on loader or bounce back to login if it persists.
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
