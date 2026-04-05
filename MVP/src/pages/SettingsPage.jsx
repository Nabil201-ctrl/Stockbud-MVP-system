import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, User, Lock, Save, Loader2, AlertCircle, CheckCircle2, Zap, ShoppingBag, Languages, Copy, Key } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Timeline from '../components/Shopify/Timeline';
import SocialStoresPanel from '../components/Dashboard/SocialStoresPanel';
import { authAPI, userAPI, storesAPI } from '../services/api';

const SettingsPage = () => {
    const isOnline = useOnlineStatus();
    const { isDarkMode, fontSize, changeFontSize } = useTheme();
    const { user, updateProfile, refreshUser } = useAuth();
    const { t, language, changeLanguage, availableLanguages } = useLanguage();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'profile');

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        currency: user?.currency || 'USD',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);

    const [planData, setPlanData] = useState(null);
    const [planLoading, setPlanLoading] = useState(false);

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState(null);

    // Pairing code state
    const [pairingCode, setPairingCode] = useState(null);
    const [pairingLoading, setPairingLoading] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const prevStoreCountRef = useRef(user?.shopifyStores?.length || 0);

    // Polling for new store connection when pairing code is active
    useEffect(() => {
        let interval;
        if (pairingCode) {
            interval = setInterval(async () => {
                await refreshUser();
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [pairingCode, refreshUser]);

    // Detect when a new store is added
    useEffect(() => {
        const currentCount = user?.shopifyStores?.length || 0;
        if (currentCount > prevStoreCountRef.current) {
            if (pairingCode) {
                setPairingCode(null);
                alert('Shopify store connected successfully!');
            }
        }
        prevStoreCountRef.current = currentCount;
    }, [user?.shopifyStores?.length, pairingCode]);

    const [purchaseAmount, setPurchaseAmount] = useState(100);
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const reference = queryParams.get('reference');

        if (reference) {
            verifyPayment(reference);
            window.history.replaceState({}, document.title, location.pathname);
        }

        const pendingRef = localStorage.getItem('pending_payment_ref');
        if (pendingRef && !reference) {
            localStorage.removeItem('pending_payment_ref');
            verifyPayment(pendingRef);
        }
    }, [location.search]);

    const fetchPlanData = async () => {
        setPlanLoading(true);
        try {
            const res = await userAPI.getPlan();
            setPlanData(res.data);
        } catch (error) {
            console.error('Failed to fetch plan:', error);
        } finally {
            setPlanLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'usage') {
            fetchPlanData();
        }
    }, [activeTab]);

    const handleUpgradePlan = async (newPlan) => {
        try {
            await userAPI.upgradePlan(newPlan);
            alert(`Successfully upgraded to ${newPlan.toUpperCase()} plan!`);
            fetchPlanData();
            refreshUser();
        } catch (error) {
            console.error('Failed to upgrade:', error);
            alert(error.response?.data?.message || 'Upgrade failed');
        }
    };

    const handlePurchase = () => {
        setPurchaseLoading(true);
        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: (purchaseAmount / 100) * 500 * 100,
                metadata: { userId: user.id, tokenCount: purchaseAmount },
                callback: (transaction) => {
                    setPurchaseLoading(true);
                    verifyPayment(transaction.reference);
                },
                onClose: () => {
                    setPurchaseLoading(false);
                    alert('Transaction was not completed, window closed.');
                }
            });
            handler.openIframe();
        } catch (error) {
            setPurchaseLoading(false);
            alert("Could not load payment window.");
        }
    };

    const verifyWithRetry = async (reference, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await userAPI.verifyPayment(reference);
                return response.data;
            } catch (error) {
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
                } else {
                    localStorage.setItem('pending_payment_ref', reference);
                    return { success: false, message: 'Network error. Retry later.' };
                }
            }
        }
    };

    const verifyPayment = async (reference) => {
        const result = await verifyWithRetry(reference);
        if (result.success) {
            alert(`Success! ${result.message}`);
            await refreshUser();
        } else {
            alert(result.message || 'Payment verification failed.');
        }
        setPurchaseLoading(false);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        const result = await updateProfile(profileData);
        if (result.success) setProfileMessage({ type: 'success', text: 'Profile updated' });
        else setProfileMessage({ type: 'error', text: 'Update failed' });
        setProfileLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }
        setPasswordLoading(true);
        try {
            await authAPI.changePassword(passwordData.oldPassword, passwordData.newPassword);
            setPasswordMessage({ type: 'success', text: 'Password changed' });
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.response?.data?.message || 'Error' });
        }
        setPasswordLoading(false);
    };

    const handleSetActiveShop = async (storeId) => {
        try {
            await storesAPI.setActiveShop(storeId);
            await refreshUser();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleRemoveStore = async (storeId, shopName) => {
        if (!window.confirm(`Remove ${shopName}?`)) return;
        try {
            await storesAPI.deleteShop(storeId);
            await refreshUser();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleGeneratePairingCode = async () => {
        const currentStoreCount = user?.shopifyStores?.length || 0;
        const limit = user?.storeLimit || 2;
        if (currentStoreCount >= limit) {
            if (confirm(t('settings.storeLimitReached', { limit }))) initiateStoreLimitPayment();
            return;
        }
        setPairingLoading(true);
        try {
            const res = await storesAPI.getPairingCode();
            setPairingCode(res.data.pairingCode);
            setCodeCopied(false);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
        setPairingLoading(false);
    };

    const initiateStoreLimitPayment = () => {
        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: 5000 * 100,
                metadata: { userId: user.id, type: 'store_slot' },
                callback: (transaction) => verifyStoreLimitPayment(transaction.reference),
                onClose: () => alert('Payment cancelled.')
            });
            handler.openIframe();
        } catch (error) {
            alert("Could not load payment window.");
        }
    };

    const verifyStoreLimitPayment = async (reference) => {
        const result = await verifyWithRetry(reference);
        if (result.success) {
            alert(t('settings.storeLimitIncreased'));
            await refreshUser();
        }
    };

    const initiateRetentionPayment = (months, amount) => {
        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: amount * 100,
                metadata: { userId: user.id, type: 'retention_extend', months: months },
                callback: (transaction) => verifyRetentionPayment(transaction.reference, months),
                onClose: () => alert('Payment cancelled.')
            });
            handler.openIframe();
        } catch (error) {
            alert("Could not load payment window.");
        }
    };

    const verifyRetentionPayment = async (reference, months) => {
        const result = await verifyWithRetry(reference);
        if (result.success) {
            alert(`Retention extended by ${months} months.`);
            await refreshUser();
        }
    };

    const handleAddStoreClick = (e) => {
        e.preventDefault();
        window.open('https://apps.shopify.com/stock-bud', '_blank');
    };

    const handleCopyCode = () => {
        if (pairingCode) {
            navigator.clipboard.writeText(pairingCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    return (
        <div className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 min-h-full">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black dark:text-white tracking-tight">{t('settings.title')}</h1>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 -mx-3 px-3 sm:mx-0 sm:px-0">
                <nav className="flex space-x-4 sm:space-x-8">
                    {[
                        { id: 'profile', icon: User, label: 'Profile' },
                        { id: 'security', icon: Lock, label: 'Security' },
                        { id: 'usage', icon: Zap, label: 'Plan' },
                        { id: 'integrations', icon: ShoppingBag, label: 'Stores' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 px-1 border-b-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            <tab.icon size={14} />
                            <span className="hidden xs:inline">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-all`}>
                    <div className="mb-8">
                        <h2 className="text-xl font-bold dark:text-white">{t('settings.profile')}</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage your account information and preferences.</p>
                    </div>
                    <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300 tracking-tight">{t('settings.fullName')}</label>
                                <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300 tracking-tight">{t('settings.email')}</label>
                                <input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300 tracking-tight">{t('settings.language')}</label>
                                <select value={language} onChange={e => changeLanguage(e.target.value)} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none">
                                    {availableLanguages.map(lang => <option key={lang.code} value={lang.code}>{lang.nativeName}</option>)}
                                </select>
                            </div>
                            <div className="pt-7">
                                <button type="submit" disabled={profileLoading} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-95">
                                    {profileLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {t('settings.saveChanges')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className={`p-6 sm:p-8 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-all`}>
                    <div className="mb-8">
                        <h2 className="text-xl font-bold dark:text-white">{t('settings.security')}</h2>
                        <p className="text-sm text-gray-500 mt-1">Keep your account secure by updating your password regularly.</p>
                    </div>
                    <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                        <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">{t('settings.currentPassword')}</label>
                            <input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300">{t('settings.newPassword')}</label>
                                <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300">{t('settings.confirmPassword')}</label>
                                <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
                            </div>
                        </div>
                        <button type="submit" disabled={passwordLoading} className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95">
                            {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : t('settings.updatePassword')}
                        </button>
                    </form>
                </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
                <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-all`}>
                    <div className="mb-8">
                        <h2 className="text-xl font-bold dark:text-white">Plan & Limits</h2>
                        <p className="text-sm text-gray-500 mt-1">Monitor your resource consumption and plan details.</p>
                    </div>
                    {planLoading && !planData ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                    ) : planData ? (
                        <div className="space-y-8">
                            <div className="p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl text-white shadow-xl flex justify-between items-center flex-wrap gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                <div className="relative z-10">
                                    <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Active Plan</p>
                                    <h3 className="text-3xl sm:text-4xl font-black mt-1">{planData.planDisplayName}</h3>
                                </div>
                                <div className="text-right relative z-10">
                                    <div className="text-3xl font-bold">₦{planData.price.toLocaleString()}</div>
                                    <div className="text-blue-200 text-xs font-medium uppercase mt-1">per month</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex justify-between items-center mb-5">
                                        <h4 className="font-bold flex items-center gap-2 dark:text-white"><Zap className="text-yellow-500" size={18} /> AI Actions</h4>
                                        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-md">{planData.aiActions.remaining} Left</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-3">
                                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (planData.aiActions.used / planData.aiActions.limit) * 100)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 font-medium">
                                        <span>{planData.aiActions.used} Actions Used</span>
                                        <span>Limit: {planData.aiActions.limit}</span>
                                    </div>
                                </div>

                                <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                    <h4 className="font-bold flex items-center gap-2 mb-5 dark:text-white"><ShoppingBag className="text-blue-500" size={18} /> Connected Stores</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm dark:text-gray-300 font-medium font-medium">Usage</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-black dark:text-white">{planData.stores.connected}</span>
                                            <span className="text-gray-400 font-bold"> / {planData.stores.limit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <AlertCircle className="text-red-500 mb-2" size={48} />
                            <p className="text-gray-500">Failed to load plan metrics.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-all`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">{t('settings.connectedStores')}</h2>
                            <p className="text-sm text-gray-500 mt-1">Link your Shopify and social channels.</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleGeneratePairingCode} className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all">
                                <Key size={16} /> Pair Code
                            </button>
                            <button onClick={handleAddStoreClick} className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 active:scale-95 transition-all">
                                <ShoppingBag size={16} /> Shopify
                            </button>
                        </div>
                    </div>

                    {pairingCode && (
                        <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between group">
                            <div>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mb-1">Pairing Code</p>
                                <p className="text-3xl font-mono font-black text-blue-800 dark:text-blue-300 tracking-tighter">{pairingCode}</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium italic">Expires in 10 minutes</p>
                            </div>
                            <button onClick={handleCopyCode} className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-90 flex items-center justify-center">
                                {codeCopied ? <CheckCircle2 className="text-green-500" size={24} /> : <Copy className="dark:text-blue-400" size={24} />}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-10">
                        {user?.shopifyStores?.map(store => (
                            <div key={store.id} className="p-5 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-black dark:text-white truncate text-sm sm:text-base">{store.name || store.shop}</p>
                                            {user.activeShopId === store.id && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded-full ring-1 ring-green-500/20">ACTIVE</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{store.shop}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 ml-4">
                                    {user.activeShopId !== store.id && (
                                        <button onClick={() => handleSetActiveShop(store.id)} className="text-xs font-black text-blue-600 hover:text-blue-700 p-2 uppercase tracking-tight">Focus</button>
                                    )}
                                    <button onClick={() => handleRemoveStore(store.id, store.shop)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-10 border-t border-gray-100 dark:border-gray-800">
                        <SocialStoresPanel isDarkMode={isDarkMode} user={user} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
