import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storesAPI } from '../services/api';
import { CheckCircle, Lock, User } from 'lucide-react';

const VerifySitePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [site, setSite] = React.useState(null);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);

    React.useEffect(() => {
        const fetchSite = async () => {
            try {
                // Use the dedicated verification endpoint that doesn't require being the owner
                const res = await storesAPI.scraper.getSiteForVerification(id);
                setSite(res.data);
            } catch (err) {
                console.error('Failed to fetch site details', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSite();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        // Validation: if requiresLogin is true, credentials are required
        if (site?.requiresLogin && (!credentials.username || !credentials.password)) {
            globalThis.dispatchEvent(new CustomEvent('app:notification', {
                detail: { message: 'Username and Password are required for this site.', type: 'error' }
            }));
            setSubmitting(false);
            return;
        }

        console.log(`[VerifySitePage] Submitting verification for ID: ${id}`, credentials);
        try {
            await storesAPI.scraper.verifySite(id, credentials);
            setSuccess(true);
            globalThis.dispatchEvent(new CustomEvent('app:notification', {
                detail: { message: 'Site verified and activated successfully!', type: 'success' }
            }));
        } catch (err) {
            console.error(err);
            globalThis.dispatchEvent(new CustomEvent('app:notification', {
                detail: { message: err.response?.data?.message || 'Failed to verify site', type: 'error' }
            }));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 text-center border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Complete</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
                        Site verified! We have automatically triggered the first scrape. You can now see products being imported in real-time.
                    </p>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-8 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial Process</span>
                            <span className="text-xs font-bold text-indigo-500 animate-pulse">Scraping in progress...</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full w-1/2 animate-shimmer" style={{
                                backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                                backgroundSize: '200% 100%'
                            }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl px-4 py-3 font-bold transition-all"
                        >
                            Home
                        </button>
                        <button 
                            onClick={() => navigate('/scraper')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            View Site
                        </button>
                    </div>
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
                        {site?.requiresLogin 
                            ? 'Please verify the site and provide the newly created credentials.'
                            : 'Please verify if the site is permitted for monitoring.'}
                    </p>
                    
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-left border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col gap-2">
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Site Name</span>
                                <p className="text-gray-900 dark:text-white font-semibold">{site?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Target URL</span>
                                <p className="text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                    <a href={site?.url} target="_blank" rel="noreferrer">{site?.url}</a>
                                </p>
                            </div>
                            {site?.loginUrl && (
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Login URL</span>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-medium truncate">
                                        <a href={site?.loginUrl} target="_blank" rel="noreferrer">{site?.loginUrl}</a>
                                    </p>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-gray-800">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Auth Required</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${site?.requiresLogin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {site?.requiresLogin ? 'YES' : 'NO'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {site?.requiresLogin && (
                        <>
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
                        </>
                    )}

                    <div className="pt-4">
                        <p className="text-xs text-gray-400 text-center mb-4">
                            By clicking below, you confirm that this site is not prohibited and is ready for automated monitoring.
                        </p>
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className={`w-full ${site?.requiresLogin ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl px-4 py-3.5 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg active:scale-[0.98]`}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    <span>{site?.requiresLogin ? 'Verify & Save Credentials' : 'Verify & Activate Site'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VerifySitePage;
