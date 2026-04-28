import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storesAPI } from '../services/api';
import { CheckCircle, Lock, User } from 'lucide-react';

const VerifySitePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await storesAPI.scraper.verifySite(id, credentials);
            setSuccess(true);
            globalThis.dispatchEvent(new CustomEvent('app:notification', {
                detail: { message: 'Site verified and scraper triggered successfully!', type: 'success' }
            }));
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } catch (err) {
            console.error(err);
            globalThis.dispatchEvent(new CustomEvent('app:notification', {
                detail: { message: err.response?.data?.message || 'Failed to verify site', type: 'error' }
            }));
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 text-center border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Complete</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        The credentials have been securely stored and the AI scraper has been triggered.
                    </p>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 font-medium transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Staff Verification</h2>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
                        Provide the newly created credentials for this monitoring request.
                    </p>
                    <div className="mt-4 py-2 px-4 bg-gray-50 dark:bg-gray-900 rounded-lg inline-block">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1">Site ID</span>
                        <code className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{id}</code>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username / Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={18} className="text-gray-400" />
                            </div>
                            <input 
                                type="text"
                                required
                                value={credentials.username}
                                onChange={e => setCredentials({...credentials, username: e.target.value})}
                                className="w-full pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                placeholder="Enter registered username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={18} className="text-gray-400" />
                            </div>
                            <input 
                                type="password"
                                required
                                value={credentials.password}
                                onChange={e => setCredentials({...credentials, password: e.target.value})}
                                className="w-full pl-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                placeholder="Enter password"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3.5 font-medium transition-colors mt-6 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={20} />
                                <span>Complete Verification</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VerifySitePage;
