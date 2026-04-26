import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Slogo from '../assets/Slogo.png';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    return (
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            {/* Simple Nav */}
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
                            <Shield size={32} />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>Last updated: April 15, 2026</p>
                    </div>

                    <div className={`prose prose-blue max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
                        <section className="space-y-6">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <Eye className="text-blue-500" />
                                <h2>1. Information We Collect</h2>
                            </div>
                            <p>We collect information you provide directly to us, such as when you create an account, connect your Shopify store, or contact us for support. This includes:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Account Information:</strong> Name, email address, password.</li>
                                <li><strong>Shopify Data:</strong> Store URL, access tokens, product catalog, order history, and customer metadata necessary for inventory synchronization.</li>
                                <li><strong>Meta (Facebook/Instagram) Data:</strong> If you connect a Meta store, we collect your Meta Business ID, Catalog ID, and temporary access tokens to sync your product catalog and inventory.</li>
                                <li><strong>Usage Data:</strong> Information about how you use the platform, including AI chat queries and report generation history.</li>

                            </ul>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <Lock className="text-green-500" />
                                <h2>2. How We Use Your Information</h2>
                            </div>
                            <p>Your data is used to provide and improve the Stockbud experience, specifically:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Inventory Sync:</strong> Synchronizing stock levels between Shopify and Social Stores (Meta, WhatsApp, Instagram).</li>
                                <li><strong>AI Insights:</strong> Analyzing your sales data to provide stockout predictions and revenue trends.</li>
                                <li><strong>Communication:</strong> Sending system alerts, security updates, and requested reports.</li>

                            </ul>
                        </section>

                        <section className="space-y-6 mt-12">
                            <div className="flex items-center gap-3 text-2xl font-bold">
                                <Globe className="text-purple-500" />
                                <h2>3. Data Sharing & Security</h2>
                            </div>
                            <p>We do not sell your personal or business data. We share information only with service providers necessary for our operations (e.g., database hosting, message queues). We implement industry-standard encryption and strict access controls to protect your data.</p>
                        </section>

                        <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-blue-900/10 border-blue-900/50' : 'bg-blue-50 border-blue-100'} mt-16`}>
                            <div className="flex items-center gap-3 mb-4">
                                <FileText className="text-blue-500" />
                                <h3 className="text-xl font-bold">Contact Us</h3>
                            </div>
                            <p className="mb-4">If you have any questions about this Privacy Policy, please contact our data protection team:</p>
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

export default PrivacyPage;
