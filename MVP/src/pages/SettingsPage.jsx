import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, User, Lock, Save, Loader2, AlertCircle, CheckCircle2, Zap, ShoppingBag, Languages, Copy, Key } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Timeline from '../components/Shopify/Timeline';
import SocialStoresPanel from '../components/Dashboard/SocialStoresPanel';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const SettingsPage = () => {
    const isOnline = useOnlineStatus();
    const { isDarkMode, fontSize, changeFontSize } = useTheme();
    const { user, updateProfile, authenticatedFetch, refreshUser } = useAuth();
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
            const res = await authenticatedFetch(`${API_URL}/users/me/plan`);
            if (res.ok) {
                const data = await res.json();
                setPlanData(data);
            }
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
            const res = await authenticatedFetch(`${API_URL}/users/me/plan/upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: newPlan })
            });
            if (res.ok) {
                alert(`Successfully upgraded to ${newPlan.toUpperCase()} plan!`);
                fetchPlanData();
                refreshUser();
            } else {
                const data = await res.json();
                alert(data.message || 'Upgrade failed');
            }
        } catch (error) {
            console.error('Failed to upgrade:', error);
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
                const response = await authenticatedFetch(`${API_URL}/payments/verify?reference=${reference}`);
                const data = await response.json();
                if (response.ok && data.success) return data;
                return { success: false, message: data.message || 'Verification failed' };
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
            const response = await authenticatedFetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword })
            });
            if (response.ok) {
                setPasswordMessage({ type: 'success', text: 'Password changed' });
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                setPasswordMessage({ type: 'error', text: data.message || 'Failed' });
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: 'Error' });
        }
        setPasswordLoading(false);
    };

    const handleSetActiveShop = async (storeId) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/users/shopify-stores/active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId })
            });
            if (response.ok) await refreshUser();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleRemoveStore = async (storeId, shopName) => {
        if (!window.confirm(`Remove ${shopName}?`)) return;
        try {
            const response = await authenticatedFetch(`${API_URL}/users/shopify-stores/${storeId}`, { method: 'DELETE' });
            if (response.ok) await refreshUser();
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
            const response = await authenticatedFetch(`${API_URL}/shopify/pairing-code`, { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                setPairingCode(data.code);
                setCodeCopied(false);
            }
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
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold dark:text-white">{t('settings.title')}</h1>

            {/* Online Status */}
            <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 dark:text-white">
                    <Globe size={18} />
                    {t('settings.networkStatus')}
                </h2>
                <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-opacity-10 ${isOnline ? 'bg-green-500 text-green-700 dark:text-green-400' : 'bg-red-500 text-red-700 dark:text-red-400'}`}>
                    <div className={`p-2.5 sm:p-3 rounded-full ${isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                    </div>
                    <div>
                        <h3 className="font-bold">{isOnline ? t('settings.online') : t('settings.offline')}</h3>
                        <p className="text-xs">{isOnline ? t('settings.allSystemsOperational') : t('settings.connectionLost')}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'profile', icon: User, label: t('settings.profile') },
                        { id: 'security', icon: Lock, label: t('settings.security') },
                        { id: 'usage', icon: Zap, label: t('settings.usageAndLimits') },
                        { id: 'integrations', icon: ShoppingBag, label: t('settings.integrations') },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-lg font-bold mb-6 dark:text-white">{t('settings.profile')}</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">{t('settings.fullName')}</label>
                            <input type="text" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">{t('settings.email')}</label>
                            <input type="email" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">{t('settings.language')}</label>
                            <select value={language} onChange={e => changeLanguage(e.target.value)} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700 dark:text-white">
                                {availableLanguages.map(lang => <option key={lang.code} value={lang.code}>{lang.nativeName}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={profileLoading} className="px-6 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2">
                            {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {t('settings.saveChanges')}
                        </button>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-lg font-bold mb-6 dark:text-white">{t('settings.changePassword')}</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">{t('settings.currentPassword')}</label>
                            <input type="password" value={passwordData.oldPassword} onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">{t('settings.newPassword')}</label>
                            <input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">{t('settings.confirmPassword')}</label>
                            <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                        </div>
                        <button type="submit" disabled={passwordLoading} className="px-6 py-2 rounded-lg bg-blue-600 text-white">
                            {t('settings.updatePassword')}
                        </button>
                    </form>
                </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-lg font-bold mb-6 dark:text-white">Plan & Limits</h2>
                    {planLoading && !planData ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : planData ? (
                        <div className="space-y-8">
                            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl text-white shadow-lg flex justify-between items-center flex-wrap gap-4">
                                <div>
                                    <p className="text-blue-200 text-sm font-medium uppercase tracking-wide">Current Plan</p>
                                    <h3 className="text-3xl font-black">{planData.planDisplayName}</h3>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold">₦{planData.price.toLocaleString()}</div>
                                    <div className="text-blue-200 text-sm">per month</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold flex items-center gap-2"><Zap className="text-yellow-500" size={18} /> AI Actions Remaining</h4>
                                        <span className="text-sm font-semibold">{planData.aiActions.remaining} / {planData.aiActions.limit}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(planData.aiActions.used / planData.aiActions.limit) * 100}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Actions reset on the 1st of every month.</p>
                                </div>

                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <h4 className="font-bold flex items-center gap-2 mb-4"><ShoppingBag className="text-blue-500" size={18} /> Connected Stores</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm dark:text-gray-300">Active Connections</span>
                                        <span className="font-semibold">{planData.stores.connected} / {planData.stores.limit}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h4 className="font-bold mb-4 dark:text-white">Upgrade Plan</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {planData.plan !== 'beginner' && (
                                        <button disabled className="relative p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800 rounded-xl text-left cursor-not-allowed opacity-80 overflow-hidden">
                                            <div className="absolute top-2 right-2 bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Coming Soon</div>
                                            <h5 className="font-bold text-blue-700/80 dark:text-blue-400/80">Beginner (₦4,000/mo)</h5>
                                            <p className="text-xs text-blue-600/80 dark:text-blue-300/80 mt-1">2 stores, 30 AI actions, weekly full reports</p>
                                        </button>
                                    )}
                                    {planData.plan !== 'pro' && (
                                        <button disabled className="relative p-4 border border-purple-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 dark:border-purple-800 rounded-xl text-left cursor-not-allowed opacity-80 overflow-hidden">
                                            <div className="absolute top-2 right-2 bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Coming Soon</div>
                                            <h5 className="font-bold text-purple-700/80 dark:text-purple-400/80">Pro (₦10,000/mo)</h5>
                                            <p className="text-xs text-purple-600/80 dark:text-purple-300/80 mt-1">Unlimited stores, 200 AI actions, all reports</p>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-500">Failed to load plan data.</p>
                    )}
                </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold dark:text-white">{t('settings.connectedStores')}</h2>
                        <div className="flex gap-2">
                            <button onClick={handleGeneratePairingCode} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2">
                                <Key size={14} /> Pair Code
                            </button>
                            <button onClick={handleAddStoreClick} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2">
                                <ShoppingBag size={14} /> Shopify
                            </button>
                        </div>
                    </div>

                    {pairingCode && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-600 font-bold uppercase">Your Pairing Code</p>
                                <p className="text-2xl font-mono font-black text-blue-700 dark:text-blue-400">{pairingCode}</p>
                            </div>
                            <button onClick={handleCopyCode} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                {codeCopied ? <CheckCircle2 className="text-green-500" /> : <Copy />}
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 mb-8">
                        {user?.shopifyStores?.map(store => (
                            <div key={store.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 border rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShoppingBag className="text-gray-400" />
                                    <div>
                                        <p className="font-bold dark:text-white">{store.name || store.shop}</p>
                                        <p className="text-xs text-gray-500">{store.shop}</p>
                                    </div>
                                    {user.activeShopId === store.id && <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold rounded-full">ACTIVE</span>}
                                </div>
                                <div className="flex gap-2">
                                    {user.activeShopId !== store.id && <button onClick={() => handleSetActiveShop(store.id)} className="text-xs font-bold text-blue-600">Set Active</button>}
                                    <button onClick={() => handleRemoveStore(store.id, store.shop)} className="text-xs font-bold text-red-500">Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                        <SocialStoresPanel isDarkMode={isDarkMode} authenticatedFetch={authenticatedFetch} user={user} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
