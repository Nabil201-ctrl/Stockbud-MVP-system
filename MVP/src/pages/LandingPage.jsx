import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, BarChart2, Shield, Zap, Globe, Check, Menu, X, Bot, Sparkles, ShoppingBag, Package, MessageSquare, TrendingUp, FileText, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Slogo from '../assets/Slogo.png';
import BusinessVideo from '../assets/business_video.mp4';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { t, language, changeLanguage } = useLanguage();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (!authLoading && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const toggleLanguage = () => {
        changeLanguage(language === 'en' ? 'fr' : 'en');
    };

    return (
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-800'}`}>

            {/* Navigation */}
            <nav className={`px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? 'bg-gray-900/80 border-b border-gray-800' : 'bg-slate-50/80 border-b border-slate-200'}`}>
                <div className="flex items-center gap-2">
                    <img src={Slogo} alt="Stockbud Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                    <span className="text-lg sm:text-xl font-bold tracking-tight">stockbud.</span>
                </div>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-4">
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
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
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

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 rounded-lg"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className={`md:hidden fixed inset-x-0 top-[57px] z-40 ${isDarkMode ? 'bg-gray-900 border-b border-gray-800' : 'bg-slate-50 border-b border-slate-200'} px-4 pb-4 space-y-2 shadow-xl`}>
                    <button
                        onClick={() => { document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                        Pricing
                    </button>
                    <button
                        onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                        <Globe size={16} /> {language.toUpperCase()} (toggle)
                    </button>
                    <button
                        onClick={() => navigate('/auth/login')}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                        {t('nav.login')}
                    </button>
                    <button
                        onClick={() => navigate('/auth/signup')}
                        className="w-full px-4 py-3 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        {t('nav.getStarted')} <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-12 sm:py-20">
                <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        {t('landing.newFeature')}
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                        {t('landing.heroTitle1')} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t('landing.heroTitle2')}</span>
                    </h1>

                    <p className={`text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
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

                {/* Features grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-16 sm:mt-24 px-0">
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

                {/* Pricing section */}
                <div id="pricing" className="w-full max-w-6xl mx-auto mt-24 sm:mt-32 mb-12 sm:mb-16 px-0 sm:px-4">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                            {t('landing.pricing.title', 'Simple, Transparent Pricing')}
                        </h2>
                        <p className={`text-lg sm:text-xl ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                            {t('landing.pricing.subtitle', 'Choose the perfect plan for your business needs. No hidden fees.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">

                        {/* ── FREE PLAN ── */}
                        <div className={`rounded-3xl p-6 sm:p-8 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} transition-all hover:shadow-2xl flex flex-col`}>
                            <h3 className="text-2xl font-bold mb-1">Free</h3>
                            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>Get started at zero cost</p>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-extrabold">₦0</span>
                                <span className={`font-medium ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>/forever</span>
                            </div>

                            <ul className="space-y-3 mb-6 flex-1">
                                {[
                                    { icon: <ShoppingBag size={15} />, text: '1 Shopify store connection' },
                                    { icon: <MessageSquare size={15} />, text: 'WhatsApp & Instagram integration' },
                                    { icon: <Package size={15} />, text: 'Up to 50 products' },
                                    { icon: <FileText size={15} />, text: 'Order creation' },
                                    { icon: <TrendingUp size={15} />, text: 'Inventory tracking' },
                                    { icon: <BarChart2 size={15} />, text: 'Basic weekly insights (limited view)' },
                                ].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{f.text}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* AI Actions */}
                            <div className={`rounded-xl p-4 mb-6 ${isDarkMode ? 'bg-gray-700/50 border border-gray-700' : 'bg-slate-50 border border-slate-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Bot size={16} className="text-blue-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">5 AI Actions / month</span>
                                </div>
                                <ul className="space-y-2">
                                    {[
                                        'Ask AI about inventory status',
                                        'Get basic stock level summaries',
                                        'Simple revenue Q&A',
                                        'Product search queries',
                                        'Basic store health check',
                                    ].map((action, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Sparkles size={12} className="text-blue-500 shrink-0" />
                                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={() => navigate('/auth/signup')}
                                className={`w-full py-4 font-bold rounded-xl transition-all border-2 ${isDarkMode ? 'border-gray-700 hover:bg-gray-700 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-800'}`}
                            >
                                Get Started Free
                            </button>
                        </div>

                        {/* ── BEGINNER PLAN ── */}
                        <div className="rounded-3xl p-6 sm:p-8 border border-blue-500 bg-gradient-to-b from-blue-600 to-blue-800 text-white transform lg:-translate-y-4 shadow-2xl relative flex flex-col">
                            {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-blue-400 text-blue-900 px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-lg">
                                Most Popular
                            </div> */}
                            <h3 className="text-2xl font-bold mb-1 text-white">Beginner</h3>
                            <p className="text-sm text-blue-200 mb-4">Perfect for growing businesses</p>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-extrabold text-white">₦4,000</span>
                                <span className="text-blue-200 font-medium">/mo</span>
                            </div>

                            <ul className="space-y-3 mb-6 flex-1">
                                {[
                                    { icon: <ShoppingBag size={15} />, text: '2 Shopify store connections' },
                                    { icon: <MessageSquare size={15} />, text: 'WhatsApp & Instagram integration' },
                                    { icon: <Package size={15} />, text: 'Up to 200+ products' },
                                    { icon: <FileText size={15} />, text: 'Order creation' },
                                    { icon: <TrendingUp size={15} />, text: 'Inventory tracking' },
                                    { icon: <BarChart2 size={15} />, text: 'Weekly reports (full access)' },
                                    { icon: <Bell size={15} />, text: 'Basic support & data retention' },
                                    { icon: <Zap size={15} />, text: 'Limited daily insights preview' },
                                ].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="p-1 rounded-full bg-white/20 text-white shrink-0 mt-0.5">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        <span className="text-sm text-blue-50">{f.text}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* AI Actions */}
                            <div className="rounded-xl p-4 mb-6 bg-white/10 border border-white/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <Bot size={16} className="text-cyan-300" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">30 AI Actions / month</span>
                                </div>
                                <ul className="space-y-2">
                                    {[
                                        'Generate weekly sales reports',
                                        'AI-powered stock level alerts',
                                        'Revenue trend analysis',
                                        'Product performance ranking',
                                        'Order pattern detection',
                                        'Inventory restock suggestions',
                                        'Customer purchase insights',
                                    ].map((action, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Sparkles size={12} className="text-cyan-300 shrink-0" />
                                            <span className="text-xs text-blue-100">{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                disabled
                                className="w-full py-4 font-bold rounded-xl transition-all border border-transparent bg-white/20 text-white cursor-not-allowed shadow-xl"
                            >
                                Coming Soon
                            </button>
                        </div>

                        {/* ── PRO PLAN ── */}
                        <div className={`rounded-3xl p-6 sm:p-8 border-2 ${isDarkMode ? 'bg-gray-800 border-purple-600' : 'bg-white border-purple-400'} transition-all hover:shadow-2xl relative flex flex-col`}>
                            {/* <div className={`absolute top-0 right-4 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg`}>
                                Best Value
                            </div> */}
                            <h3 className="text-2xl font-bold mb-1">Pro</h3>
                            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>For serious store owners</p>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-5xl font-extrabold">₦10,000</span>
                                <span className={`font-medium ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>/mo</span>
                            </div>

                            <ul className="space-y-3 mb-6 flex-1">
                                {[
                                    { icon: <ShoppingBag size={15} />, text: 'Unlimited Shopify store connections' },
                                    { icon: <MessageSquare size={15} />, text: 'WhatsApp & Instagram integration' },
                                    { icon: <Package size={15} />, text: 'Unlimited products' },
                                    { icon: <FileText size={15} />, text: 'Order creation' },
                                    { icon: <TrendingUp size={15} />, text: 'Inventory tracking (advanced insights)' },
                                    { icon: <BarChart2 size={15} />, text: 'Daily, Weekly & Monthly reports' },
                                    { icon: <Bell size={15} />, text: 'Priority support' },
                                    { icon: <Zap size={15} />, text: 'Full data retention & history' },
                                    { icon: <Globe size={15} />, text: 'Multi-store performance dashboard' },
                                ].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className={`p-1 rounded-full shrink-0 mt-0.5 ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>{f.text}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* AI Actions */}
                            <div className={`rounded-xl p-4 mb-6 ${isDarkMode ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Bot size={16} className="text-purple-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">200 AI Actions / month</span>
                                </div>
                                <ul className="space-y-2">
                                    {[
                                        'Advanced AI insights & recommendations',
                                        'Full daily, weekly & monthly report generation',
                                        'AI-driven demand forecasting',
                                        'Automated restock alerts & predictions',
                                        'Cross-store performance comparison',
                                        'Revenue optimization suggestions',
                                        'Inventory anomaly detection',
                                        'Smart order pattern analysis',
                                        'Competitive pricing assistant',
                                        'Custom AI queries (unlimited depth)',
                                    ].map((action, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Sparkles size={12} className="text-purple-500 shrink-0" />
                                            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                disabled
                                className={`w-full py-4 font-bold rounded-xl transition-all border ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-500' : 'bg-gray-100 border-gray-300 text-gray-400'} cursor-not-allowed shadow-sm`}
                            >
                                Coming Soon
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            { }
            <footer className={`py-12 border-t mt-20 ${isDarkMode ? 'border-gray-800 text-gray-500' : 'border-slate-200 text-slate-400'}`}>
                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <img src={Slogo} alt="Stockbud Logo" className="w-6 h-6 grayscale opacity-50" />
                        <span className="font-bold tracking-tight">stockbud.</span>
                    </div>

                    <p className="text-sm">
                        {t('landing.footer')}
                    </p>

                    <div className="flex items-center gap-8">
                        <button onClick={() => navigate('/privacy')} className="hover:text-blue-500 transition-colors">Privacy Policy</button>
                        <button onClick={() => navigate('/privacy')} className="hover:text-blue-500 transition-colors">Terms of Service</button>
                        <button onClick={() => window.open('https://github.com/Nabil201-ctrl/Stockbud-MVP-system', '_blank')} className="hover:text-blue-500 transition-colors">GitHub</button>
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;
