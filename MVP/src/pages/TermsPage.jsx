import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gavel, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Slogo from '../assets/Slogo.png';

const TermsPage = () => {
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
                        <div className="inline-flex p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-2">
                            <Gavel size={32} />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Terms of Service</h1>
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Last updated: April 25, 2026</p>
                    </div>

                    <div className={`prose prose-blue max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <CheckCircle className="text-green-500" />
                                <h2>1. Acceptance of Terms</h2>
                            </div>
                            <p>By accessing or using Stockbud, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the service.</p>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <ShieldCheck className="text-blue-500" />
                                <h2>2. Use of Service</h2>
                            </div>
                            <p>Stockbud provides inventory synchronization and AI-driven business insights. You are responsible for maintaining the security of your account and for all activities that occur under your account. You must provide accurate information when connecting third-party platforms like Shopify or Meta.</p>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <AlertTriangle className="text-amber-500" />
                                <h2>3. Limitations of Liability</h2>
                            </div>
                            <p>Stockbud is provided "as is" without warranty of any kind. We shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, including but not limited to loss of profits or data.</p>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <h2 className="text-2xl font-bold">4. Acceptable Use</h2>
                            </div>
                            <p>You agree not to use Stockbud for any unlawful purposes or to conduct any activities that would harm our platform or other users. This includes attempts to reverse-engineer our AI models or bypass security controls.</p>
                        </section>

                        <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-blue-900/10 border-blue-900/50' : 'bg-blue-50 border-blue-100'} mt-16`}>
                            <h3 className="text-xl font-bold mb-4">Questions?</h3>
                            <p className="mb-4">For questions regarding our terms, please contact:</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400">stockbud.01@gmail.com</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className={`py-8 text-center text-sm border-t ${isDarkMode ? 'text-gray-500 border-gray-800' : 'text-slate-400 border-slate-200'}`}>
                © 2026 Stockbud. All rights reserved.
            </footer>
        </div>
    );
};

export default TermsPage;
