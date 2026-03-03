import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, User, Lock, Save, Loader2, AlertCircle, CheckCircle2, Zap, ShoppingBag, Languages, Copy, Key } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Timeline from '../components/Shopify/Timeline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SettingsPage = () => {
    const isOnline = useOnlineStatus();
    const { isDarkMode } = useTheme();
    const { user, updateProfile, authenticatedFetch, refreshUser } = useAuth();
    const { t, language, changeLanguage, availableLanguages } = useLanguage();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'profile');

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);

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
            }, 3000); // Poll every 3 seconds
        }
        return () => clearInterval(interval);
    }, [pairingCode, refreshUser]);

    // Detect when a new store is added
    useEffect(() => {
        const currentCount = user?.shopifyStores?.length || 0;
        if (currentCount > prevStoreCountRef.current) {
            if (pairingCode) {
                setPairingCode(null);
                // Ideally use a toast, but alert is consistent with existing code
                alert('Shopify store connected successfully!');
            }
        }
        prevStoreCountRef.current = currentCount;
    }, [user?.shopifyStores?.length, pairingCode]);



    // Payment State
    const [purchaseAmount, setPurchaseAmount] = useState(100);
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    // URL Verification (Legacy/Fallback) + Pending payment recovery
    React.useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const reference = queryParams.get('reference');

        if (reference) {
            verifyPayment(reference);
            window.history.replaceState({}, document.title, location.pathname);
        }

        // Recover pending payment from previous failed verification
        const pendingRef = localStorage.getItem('pending_payment_ref');
        if (pendingRef && !reference) {
            console.log('[Payment] Recovering pending payment:', pendingRef);
            localStorage.removeItem('pending_payment_ref');
            verifyPayment(pendingRef);
        }
    }, [location.search]);

    const handlePurchase = () => {
        setPurchaseLoading(true);
        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: (purchaseAmount / 100) * 500 * 100, // Amount in kobo
                metadata: {
                    userId: user.id,
                    tokenCount: purchaseAmount
                },
                callback: (transaction) => {
                    setPurchaseLoading(true); // Ensure loading is still on while verifying
                    verifyPayment(transaction.reference);
                },
                onClose: () => {
                    setPurchaseLoading(false);
                    alert('Transaction was not completed, window closed.');
                }
            });
            handler.openIframe();
        } catch (error) {
            console.error("Paystack error:", error);
            setPurchaseLoading(false);
            alert("Could not load payment window. Please try again.");
        }
    };

    // Retry-enabled payment verification (safe because backend is idempotent)
    const verifyWithRetry = async (reference, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await authenticatedFetch(`${API_URL}/payments/verify?reference=${reference}`);
                const data = await response.json();
                if (response.ok && data.success) {
                    return data;
                }
                // Non-retryable failure (e.g. Paystack says transaction failed)
                return { success: false, message: data.message || 'Verification failed' };
            } catch (error) {
                console.warn(`[Payment] Verify attempt ${attempt}/${maxRetries} failed:`, error.message);
                if (attempt < maxRetries) {
                    // Exponential backoff: 2s, 4s, 8s
                    await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
                } else {
                    // Store reference for manual retry
                    localStorage.setItem('pending_payment_ref', reference);
                    return { success: false, message: 'Network error. Your payment is safe — please refresh the page to retry.' };
                }
            }
        }
    };

    const verifyPayment = async (reference) => {
        const result = await verifyWithRetry(reference);
        if (result.success) {
            alert(`Success! ${result.message}${result.newBalance ? `. New Balance: ${result.newBalance}` : ''}`);
            await refreshUser();
        } else {
            alert(result.message || 'Payment verification failed.');
        }
        setPurchaseLoading(false);
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMessage(null);

        const result = await updateProfile(profileData);
        if (result.success) {
            setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
        } else {
            setProfileMessage({ type: 'error', text: 'Failed to update profile' });
        }
        setProfileLoading(false);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setPasswordLoading(true);
        setPasswordMessage(null);

        try {
            const response = await authenticatedFetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    oldPassword: passwordData.oldPassword,
                    newPassword: passwordData.newPassword
                })
            });

            if (response.ok) {
                setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                setPasswordMessage({ type: 'error', text: data.message || 'Failed to change password' });
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: 'Something went wrong' });
        }
        setPasswordLoading(false);
    };

    const handleDisconnectShopify = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Shopify store? This will stop data synchronization.')) {
            return;
        }

        try {
            const response = await authenticatedFetch(`${API_URL}/users/shopify-credentials`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const updatedUser = { ...user, shopifyShop: null, shopifyToken: null, shopifyStores: [], activeShopId: null };
                await updateProfile(updatedUser);
            } else {
                console.error('Disconnect failed status:', response.status, response.statusText);
                alert(`Failed to disconnect store. Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            alert(`An error occurred while disconnecting: ${error.message}`);
        }
    };

    const handleSetActiveShop = async (storeId) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/users/shopify-stores/active`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ storeId })
            });

            if (response.ok) {
                await refreshUser();
            } else {
                alert('Failed to set active shop');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleRemoveStore = async (storeId, shopName) => {
        if (!window.confirm(`Are you sure you want to remove ${shopName}?`)) {
            return;
        }

        try {
            const response = await authenticatedFetch(`${API_URL}/users/shopify-stores/${storeId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await refreshUser();
            } else {
                alert('Failed to remove store');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleGeneratePairingCode = async () => {
        // Enforce store limit (check only if we are adding a NEW store? Pairing code is usually for NEW connection)
        // Actually, pairing code is for ANY connection. But typically used to add a store.
        const currentStoreCount = user?.shopifyStores?.length || 0;
        const limit = user?.storeLimit || 2;

        if (currentStoreCount >= limit) {
            // Ask to pay to increase limit
            if (confirm(t('settings.storeLimitReached', { limit }))) {
                initiateStoreLimitPayment();
            }
            return;
        }

        setPairingLoading(true);
        try {
            const response = await authenticatedFetch(`${API_URL}/shopify/pairing-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPairingCode(data.code);
                setCodeCopied(false);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Pairing code error:', response.status, errorData);
                alert(`Failed to generate pairing code: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Pairing code fetch error:', error);
            alert(`Error: ${error.message}`);
        }
        setPairingLoading(false);
    };

    const initiateStoreLimitPayment = () => {
        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: 5000 * 100, // 5000 NGN
                metadata: {
                    userId: user.id,
                    type: 'store_slot'
                },
                callback: (transaction) => {
                    verifyStoreLimitPayment(transaction.reference);
                },
                onClose: () => {
                    alert('Payment cancelled.');
                }
            });
            handler.openIframe();
        } catch (error) {
            console.error("Paystack error:", error);
            alert("Could not load payment window.");
        }
    };

    const verifyStoreLimitPayment = async (reference) => {
        const result = await verifyWithRetry(reference);
        if (result.success) {
            alert(t('settings.storeLimitIncreased'));
            await refreshUser();
        } else {
            alert(result.message || 'Verification failed.');
        }
    };

    const initiateRetentionPayment = (months, amount) => {
        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: amount * 100, // Amount in kobo
                metadata: {
                    userId: user.id,
                    type: 'retention_extend',
                    months: months
                },
                callback: (transaction) => {
                    verifyRetentionPayment(transaction.reference, months);
                },
                onClose: () => {
                    alert('Payment cancelled.');
                }
            });
            handler.openIframe();
        } catch (error) {
            console.error("Paystack error:", error);
            alert("Could not load payment window.");
        }
    };

    const verifyRetentionPayment = async (reference, months) => {
        const result = await verifyWithRetry(reference);
        if (result.success) {
            alert(`Success! Data retention extended by ${months} months.`);
            await refreshUser();
        } else {
            alert(result.message || 'Verification failed.');
        }
    };

    const handleAddStoreClick = (e) => {
        e.preventDefault();
        const currentStoreCount = user?.shopifyStores?.length || 0;
        const limit = user?.storeLimit || 2;

        if (currentStoreCount >= limit) {
            if (confirm(t('settings.storeLimitReached', { limit }))) {
                initiateStoreLimitPayment();
            }
        } else {
            window.open('https://apps.shopify.com/stock-bud', '_blank');
        }
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
            <h1 className="text-xl sm:text-2xl font-bold dark:text-white" id="settings-header">{t('settings.title')}</h1>

            {/* Network Status Block */}
            <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 dark:text-white">
                    <Globe size={18} />
                    {t('settings.networkStatus')}
                </h2>
                <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-opacity-10 ${isOnline ? 'bg-green-500 text-green-700 dark:text-green-400' : 'bg-red-500 text-red-700 dark:text-red-400'}`}>
                    <div className={`p-2.5 sm:p-3 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-base sm:text-lg">{isOnline ? t('settings.online') : t('settings.offline')}</h3>
                        <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {isOnline ? t('settings.allSystemsOperational') : t('settings.connectionLost')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" id="settings-tabs">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
                    {[
                        { id: 'profile', icon: User, label: t('settings.profile') },
                        { id: 'security', icon: Lock, label: t('settings.security') },
                        { id: 'usage', icon: Zap, label: t('settings.usageAndLimits') },
                        { id: 'integrations', icon: ShoppingBag, label: t('settings.integrations') },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap pb-3 sm:pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 dark:text-white">{t('settings.profile')}</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.fullName')}</label>
                            <input
                                type="text"
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.email')}</label>
                            <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>

                        {/* Language Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                                <Languages className="w-4 h-4" />
                                {t('settings.language')}
                            </label>
                            <select
                                value={language}
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            >
                                {availableLanguages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.nativeName} ({lang.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {profileMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${profileMessage.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {profileMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={profileLoading}
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
                        >
                            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {t('settings.saveChanges')}
                        </button>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 dark:text-white">{t('settings.changePassword')}</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.currentPassword')}</label>
                            <input
                                type="password"
                                value={passwordData.oldPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.newPassword')}</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('settings.confirmPassword')}</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>

                        {passwordMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {passwordMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {passwordMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70"
                        >
                            {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {t('settings.updatePassword')}
                        </button>
                    </form>
                </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 dark:text-white">Usage & Limits</h2>

                    {/* Token Purchase Section */}
                    <div className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-xl border ${isDarkMode ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                    <Zap size={18} className="fill-current" />
                                    {t('settings.getMoreTokens')}
                                </h3>
                                <p className={`mt-1 text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {t('settings.tokensDesc')}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 self-start whitespace-nowrap">
                                ₦500 / 100 Tokens
                            </div>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <div className="flex justify-between text-xs sm:text-sm font-medium mb-2">
                                    <span className={isDarkMode ? 'text-white' : 'text-gray-700'}>{t('settings.selectAmount')}</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{purchaseAmount} Tokens</span>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="500"
                                    step="100"
                                    value={purchaseAmount}
                                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>100</span>
                                    <span>500</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div>
                                    <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('settings.totalPrice')}</span>
                                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                        ₦{((purchaseAmount / 100) * 500).toLocaleString()}
                                    </div>
                                </div>
                                <button
                                    onClick={handlePurchase}
                                    disabled={purchaseLoading}
                                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {purchaseLoading ? <Loader2 size={18} className="animate-spin" /> : <ShoppingBag size={18} />}
                                    {t('settings.buyNow')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {/* AI Tokens */}
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 font-medium dark:text-gray-200">
                                    <Zap size={18} className="text-yellow-500" />
                                    {t('settings.aiTokens')}
                                </div>
                                <span className="text-sm font-bold dark:text-white">{user?.aiTokens || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div
                                    className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((user?.aiTokens || 0) / 1000) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Used for generating chat responses and insights.
                            </p>
                        </div>

                        {/* Report Tokens */}
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 font-medium dark:text-gray-200">
                                    <CheckCircle2 size={18} className="text-blue-500" />
                                    {t('settings.reportTokens')}
                                </div>
                                <span className="text-sm font-bold dark:text-white">{user?.reportTokens || 0} / 250</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div
                                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((user?.reportTokens || 0) / 250) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Used for generating weekly summary reports.
                            </p>
                        </div>
                    </div>

                    <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl border ${isDarkMode ? 'bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
                            <div>
                                <h3 className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                    <Save size={18} className="fill-current" />
                                    {t('settings.dataRetention')}
                                </h3>
                                <p className={`mt-1 text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {t('settings.retentionDesc')}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900 self-start whitespace-nowrap">
                                Current: {user?.retentionMonths || 3} Months
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">{t('settings.extend3Months')}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.extend3MonthsDesc')}</p>
                                </div>
                                <div className="mt-3 sm:mt-4 flex items-center justify-between">
                                    <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">₦5,000</span>
                                    <button
                                        onClick={() => initiateRetentionPayment(3, 5000)}
                                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium transition-colors"
                                    >
                                        {t('settings.buyNow')}
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">{t('settings.extend6Months')}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.extend6MonthsDesc')}</p>
                                </div>
                                <div className="mt-3 sm:mt-4 flex items-center justify-between">
                                    <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">₦9,000</span>
                                    <button
                                        onClick={() => initiateRetentionPayment(6, 9000)}
                                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium transition-colors"
                                    >
                                        {t('settings.buyNow')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className={`p-4 sm:p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-bold dark:text-white">{t('settings.connectedStores')}</h2>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                                {user?.shopifyStores?.length || 0} / {user?.storeLimit || 2}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleGeneratePairingCode}
                                disabled={pairingLoading}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-70"
                            >
                                {pairingLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                                <span className="hidden sm:inline">{t('onboarding.generateCode')}</span>
                                <span className="sm:hidden">Pair</span>
                            </button>
                            <button
                                onClick={handleAddStoreClick}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                            >
                                <ShoppingBag size={14} />
                                <span className="hidden sm:inline">{t('settings.connectStore')}</span>
                                <span className="sm:hidden">Connect</span>
                            </button>
                        </div>
                    </div>

                    {/* Pairing Code Display */}
                    {pairingCode && (
                        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{t('onboarding.enterCodeInApp')}</p>
                                    <p className="text-xl sm:text-2xl font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400">{pairingCode}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('onboarding.codeExpires')}</p>
                                </div>
                                <button
                                    onClick={handleCopyCode}
                                    className={`p-2.5 sm:p-3 rounded-lg transition-colors flex-shrink-0 ${codeCopied ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                >
                                    {codeCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Store List */}
                    {user?.shopifyStores && user.shopifyStores.length > 0 ? (
                        <div className="space-y-3">
                            {user.shopifyStores.map((store) => (
                                <div
                                    key={store.id}
                                    className={`p-3 sm:p-4 rounded-lg border transition-all ${user.activeShopId === store.id
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                                        : isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                        <div className={`p-2.5 sm:p-3 rounded-full flex-shrink-0 ${user.activeShopId === store.id ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            <ShoppingBag className={user.activeShopId === store.id ? 'text-green-600' : 'text-gray-500'} size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold dark:text-white flex items-center gap-2 text-sm sm:text-base flex-wrap">
                                                <span className="truncate">{store.name || store.shop.replace('.myshopify.com', '')}</span>
                                                {user.activeShopId === store.id && (
                                                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-green-600 text-white rounded-full">Active</span>
                                                )}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{store.shop}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2.5 sm:mt-3 ml-11 sm:ml-14">
                                        {user.activeShopId !== store.id && (
                                            <button
                                                onClick={() => handleSetActiveShop(store.id)}
                                                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 text-xs sm:text-sm font-medium transition-colors dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400"
                                            >
                                                {t('settings.setActive')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveStore(store.id, store.shop)}
                                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs sm:text-sm font-medium transition-colors dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                                        >
                                            {t('settings.remove')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`text-center py-8 sm:py-12 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <ShoppingBag className="mx-auto mb-3 sm:mb-4 text-gray-400" size={40} />
                            <h3 className="font-semibold text-base sm:text-lg dark:text-white mb-1.5 sm:mb-2">{t('settings.noStores')}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 px-4">{t('settings.connectToStart')}</p>
                        </div>
                    )}

                    {/* Token Info */}
                    {user?.shopifyStores && user.shopifyStores.length >= 2 && (
                        <div className="mt-3 sm:mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start sm:items-center gap-2">
                            <Zap className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" size={16} />
                            <span className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                                <strong>Bonus:</strong> You have 2+ stores connected! Your tokens have been doubled.
                            </span>
                        </div>
                    )}

                    {/* Connection Timeline */}
                    {user?.shopifyStores && user.shopifyStores.length > 0 && (
                        <div className={`mt-4 sm:mt-6 p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <h3 className="font-semibold text-base sm:text-lg dark:text-white mb-3 sm:mb-4">Connection Status</h3>
                            <Timeline currentStepOverride={5} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
