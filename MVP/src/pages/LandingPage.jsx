import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart2, Shield, Zap, Globe, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import Slogo from '../assets/Slogo.png';
import BusinessVideo from '../assets/business_video.mp4';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { t, language, changeLanguage } = useLanguage();

    const toggleLanguage = () => {
        changeLanguage(language === 'en' ? 'fr' : 'en');
    };

    return (
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {}
            <nav className={`px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? 'bg-gray-900/80 border-b border-gray-800' : 'bg-slate-50/80 border-b border-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <img src={Slogo} alt="Stockbud Logo" className="w-10 h-10 object-contain" />
                    <span className="text-xl font-bold tracking-tight">stockbud.</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleLanguage}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
                        title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
                    >
                        <Globe size={20} />
                        <span className="text-sm font-medium uppercase">{language}</span>
                    </button>
                    <button
                        onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                        className={`hidden md:block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
                    >
                        Pricing
                    </button>
                    <button
                        onClick={() => navigate('/auth/login')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        {t('nav.login')}
                    </button>
                    <button
                        onClick={() => navigate('/auth/signup')}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 flex items-center gap-2"
                    >
                        {t('nav.getStarted')} <ArrowRight size={16} />
                    </button>
                </div>
            </nav>

            {}
            <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        {t('landing.newFeature')}
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                        {t('landing.heroTitle1')} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('landing.heroTitle2')}</span>
                    </h1>

                    <p className={`text-xl md:text-2xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                        {t('landing.heroSubtitle')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => navigate('/auth/signup')}
                            className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1"
                        >
                            {t('landing.startFreeTrial')}
                        </button>
                        <button
                            onClick={() => navigate('/auth/login')}
                            className={`w-full sm:w-auto px-8 py-4 text-lg font-bold rounded-xl border-2 transition-all ${isDarkMode ? 'border-gray-700 hover:bg-gray-800 text-white' : 'border-slate-200 hover:bg-white text-slate-700 hover:border-slate-300'}`}
                        >
                            {t('landing.viewDemo')}
                        </button>
                    </div>

                    <div className="mt-12 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-gray-800">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-auto"
                        >
                            <source src={BusinessVideo} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>

                {}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-24">
                    {[
                        {
                            icon: <BarChart2 size={32} className="text-blue-500" />,
                            title: t('landing.features.analyticsTitle'),
                            desc: t('landing.features.analyticsDesc')
                        },
                        {
                            icon: <Zap size={32} className="text-yellow-500" />,
                            title: t('landing.features.predictionsTitle'),
                            desc: t('landing.features.predictionsDesc')
                        },
                        {
                            icon: <Shield size={32} className="text-green-500" />,
                            title: t('landing.features.securityTitle'),
                            desc: t('landing.features.securityDesc')
                        }
                    ].map((feature, idx) => (
                        <div key={idx} className={`p-8 rounded-2xl border transition-all hover:scale-105 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${isDarkMode ? 'bg-gray-700/50' : 'bg-slate-100'}`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>{feature.desc}</p>
                        </div>
                    ))}
                </div>

                {}
                <div id="pricing" className="w-full max-w-6xl mx-auto mt-32 mb-16 px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                            {t('landing.pricing.title', 'Simple, Transparent Pricing')}
                        </h2>
                        <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                            {t('landing.pricing.subtitle', 'Choose the perfect plan for your business needs. No hidden fees.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {}
                        <div className={`rounded-3xl p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} transition-all hover:shadow-2xl flex flex-col`}>
                            <h3 className="text-2xl font-bold mb-2">{t('landing.pricing.starter', 'Starter')}</h3>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-extrabold">{t('landing.pricing.starterPrice', 'Free')}</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[
                                    t('landing.pricing.features.oneStore', '1 Shopify Store Connection'),
                                    t('landing.pricing.features.basicReports', 'Weekly Inventory Reports'),
                                    t('landing.pricing.features.starterTokens', '500 AI Chat Tokens / mo')
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => navigate('/auth/signup')}
                                className={`w-full py-4 font-bold rounded-xl transition-all border-2 ${isDarkMode ? 'border-gray-700 hover:bg-gray-700 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-800'}`}
                            >
                                {t('landing.pricing.getStarted', 'Get Started')}
                            </button>
                        </div>

                        {}
                        <div className="rounded-3xl p-8 border border-blue-500 bg-gradient-to-b from-blue-600 to-blue-800 text-white transform md:-translate-y-4 shadow-2xl relative flex flex-col">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-lg">
                                Most Popular
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-white">{t('landing.pricing.pro', 'Professional')}</h3>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-extrabold text-white">{t('landing.pricing.proPrice', '$29')}</span>
                                <span className="text-blue-200 font-medium">/mo</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[
                                    t('landing.pricing.features.threeStores', 'Up to 2 Shopify Stores'),
                                    t('landing.pricing.features.dailyReports', 'Advanced Daily Reports'),
                                    t('landing.pricing.features.proTokens', '5,000 AI Chat Tokens / mo'),
                                    t('landing.pricing.features.stockoutAlerts', 'AI Stockout Predictions')
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="p-1 rounded-full bg-white/20 text-white shrink-0">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                        <span className="text-blue-50">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => navigate('/auth/signup')}
                                className="w-full py-4 font-bold rounded-xl transition-all border border-transparent bg-white text-blue-700 hover:bg-blue-50 shadow-xl"
                            >
                                {t('landing.pricing.getStarted', 'Get Started')}
                            </button>
                        </div>

                        {}
                        <div className={`rounded-3xl p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} transition-all hover:shadow-2xl flex flex-col`}>
                            <h3 className="text-2xl font-bold mb-2">{t('landing.pricing.enterprise', 'Enterprise')}</h3>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-extrabold">{t('landing.pricing.enterprisePrice', 'Custom')}</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[
                                    t('landing.pricing.features.unlimitedStores', 'Unlimited Store Connections'),
                                    t('landing.pricing.features.unlimitedTokens', 'Unlimited AI Queries & Reports'),
                                    t('landing.pricing.features.customRetention', 'Custom Data Retention'),
                                    t('landing.pricing.features.restockAutomation', 'Restock Automation & Alerts')
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => navigate('/auth/signup')}
                                className={`w-full py-4 font-bold rounded-xl transition-all border-2 ${isDarkMode ? 'border-gray-700 hover:bg-gray-700 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-800'}`}
                            >
                                {t('landing.pricing.contactSales', 'Contact Sales')}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {}
            <footer className={`py-8 text-center text-sm ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                {t('landing.footer')}
            </footer>
        </div>
    );
};

export default LandingPage;
