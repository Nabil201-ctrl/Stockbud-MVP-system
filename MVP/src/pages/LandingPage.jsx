import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ArrowRight, BarChart2, Shield, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    return (
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-white text-gray-900'}`}>

            {/* Navbar */}
            <nav className={`px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? 'bg-gray-900/80 border-b border-gray-800' : 'bg-white/80 border-b border-gray-200'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Bot className="text-white" size={24} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">stockbud.</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/auth/login')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Log in
                    </button>
                    <button
                        onClick={() => navigate('/auth/signup')}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 flex items-center gap-2"
                    >
                        Get Started <ArrowRight size={16} />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        New: AI-Powered Analytics
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                        Your Personal AI <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Stock Assistant</span>
                    </h1>

                    <p className={`text-xl md:text-2xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Track, analyze, and optimize your inventory with the power of artificial intelligence. Smart insights for modern businesses.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => navigate('/auth/signup')}
                            className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1"
                        >
                            Start Free Trial
                        </button>
                        <button
                            onClick={() => navigate('/auth/login')}
                            className={`w-full sm:w-auto px-8 py-4 text-lg font-bold rounded-xl border-2 transition-all ${isDarkMode ? 'border-gray-700 hover:bg-gray-800 text-white' : 'border-gray-200 hover:bg-white text-gray-700 hover:border-gray-300'}`}
                        >
                            View Demo
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-24">
                    {[
                        {
                            icon: <BarChart2 size={32} className="text-blue-500" />,
                            title: "Real-time Analytics",
                            desc: "Get instant insights into your stock levels and sales performance."
                        },
                        {
                            icon: <Zap size={32} className="text-yellow-500" />,
                            title: "AI Predictions",
                            desc: "Smart algorithms predict demand helping you prevent stockouts."
                        },
                        {
                            icon: <Shield size={32} className="text-green-500" />,
                            title: "Secure & Reliable",
                            desc: "Enterprise-grade security keeps your business data safe."
                        }
                    ].map((feature, idx) => (
                        <div key={idx} className={`p-8 rounded-2xl border transition-all hover:scale-105 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'}`}>
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className={`py-8 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                © 2026 Stockbud. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingPage;
