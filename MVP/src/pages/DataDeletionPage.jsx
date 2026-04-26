import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ShieldAlert, Mail, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Slogo from '../assets/Slogo.png';

const DataDeletionPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    return (
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <nav className={`px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? 'bg-gray-900/80 border-b border-gray-800' : 'bg-slate-50/80 border-b border-slate-200'}`}>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <img src={Slogo} alt="Stockbud Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight">stockbud.</span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    <ArrowLeft size={18} /> Back to Home
                </button>
            </nav>

            <main className="flex-1 max-w-4xl mx-auto px-4 py-12 sm:py-20">
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-3 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-2">
                            <Trash2 size={32} />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Data Deletion Instructions</h1>
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>How to remove your data from Stockbud</p>
                    </div>

                    <div className={`prose prose-blue max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <ShieldAlert className="text-red-500" />
                                <h2>Requesting Data Deletion</h2>
                            </div>
                            <p>At Stockbud, we respect your privacy and provide simple ways to delete your data. You can request the removal of your account, connected Shopify stores, or Meta (Facebook/Instagram) business connections.</p>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <Settings className="text-blue-500" />
                                <h2>1. Manual Disconnection</h2>
                            </div>
                            <p>You can remove specific store connections directly from your dashboard:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Navigate to <strong>Settings</strong> > <strong>Stores</strong>.</li>
                                <li>Find the store or social channel you wish to remove.</li>
                                <li>Click the <strong>Trash</strong> icon to delete the connection and associated cached data.</li>
                            </ul>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <Mail className="text-purple-500" />
                                <h2>2. Full Account Deletion</h2>
                            </div>
                            <p>To completely delete your Stockbud account and all associated data from our servers, please send an email from your registered email address to:</p>
                            <p className="font-bold text-2xl text-blue-600 dark:text-blue-400 text-center py-4">stockbud.01@gmail.com</p>
                            <p>Please include "Data Deletion Request" in the subject line. We will process your request and purge all your data within 7 business days.</p>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <h2>Meta Data Deletion</h2>
                            </div>
                            <p>If you have connected a Meta catalog, you can also revoke access directly through your Meta Business Suite settings. Revoking access will stop all synchronization, and you can subsequently request data deletion via the email process mentioned above.</p>
                        </section>
                    </div>
                </div>
            </main>

            <footer className={`py-8 text-center text-sm border-t ${isDarkMode ? 'text-gray-500 border-gray-800' : 'text-slate-400 border-slate-200'}`}>
                © 2026 Stockbud. All rights reserved.
            </footer>
        </div>
    );
};

export default DataDeletionPage;
