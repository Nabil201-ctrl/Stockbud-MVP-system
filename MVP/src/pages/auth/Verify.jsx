
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const Verify = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Missing verification token.');
                return;
            }

            try {
                const response = await authAPI.verifyEmail(token);
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/auth/login?verified=true');
                }, 3000);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The token may be invalid or expired.');
            }
        };

        verify();
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold text-white">Verifying Account</h1>
                        <p className="text-slate-400">Please wait while we secure your access...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-black text-white">Verified!</h1>
                        <p className="text-slate-300">{message}</p>
                        <p className="text-sm text-slate-500">Redirecting you to login...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
                        <p className="text-slate-400">{message}</p>
                        <button
                            onClick={() => navigate('/auth/login')}
                            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verify;
