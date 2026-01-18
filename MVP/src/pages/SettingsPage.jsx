import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, User, Lock, Save, Loader2, AlertCircle, CheckCircle2, Zap, ShoppingBag, Languages } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const SettingsPage = () => {
    const isOnline = useOnlineStatus();
    const { isDarkMode } = useTheme();
    const { user, updateProfile, token } = useAuth();
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
            const response = await fetch('http://localhost:3000/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            const response = await fetch('http://localhost:3000/users/shopify-credentials', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
            const response = await fetch('http://localhost:3000/users/shopify-stores/active', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ storeId })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                await updateProfile(updatedUser);
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
            const response = await fetch(`http://localhost:3000/users/shopify-stores/${storeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const updatedUser = await response.json();
                await updateProfile(updatedUser);
            } else {
                alert('Failed to remove store');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold dark:text-white">Settings</h1>

            {/* Network Status Block (Preserved) */}
            <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
                    <Globe size={20} />
                    Network Status
                </h2>
                <div className={`flex items-center gap-4 p-4 rounded-lg bg-opacity-10 ${isOnline ? 'bg-green-500 text-green-700 dark:text-green-400' : 'bg-red-500 text-red-700 dark:text-red-400'}`}>
                    <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                        {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{isOnline ? 'You are Online' : 'You are Offline'}</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {isOnline ? 'All systems are operational.' : 'Connection lost.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <nav className="-mb-px flex space-x-8 min-w-max">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'profile'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'security'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Lock className="w-4 h-4" />
                        Security
                    </button>
                    <button
                        onClick={() => setActiveTab('usage')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'usage'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        Usage & Limits
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'integrations'
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Integrations
                    </button>
                </nav>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-xl font-bold mb-6 dark:text-white">Profile Information</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
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
                            Save Changes
                        </button>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-xl font-bold mb-6 dark:text-white">Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.oldPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
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
                            Update Password
                        </button>
                    </form>
                </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
                <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className="text-xl font-bold mb-6 dark:text-white">Usage & Limits</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* AI Tokens */}
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 font-medium dark:text-gray-200">
                                    <Zap size={18} className="text-yellow-500" />
                                    AI Tokens
                                </div>
                                <span className="text-sm font-bold dark:text-white">{user?.aiTokens || 0} / 500</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div
                                    className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((user?.aiTokens || 0) / 500) * 100)}%` }}
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
                                    Report Tokens
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
                </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
                <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold dark:text-white">Connected Stores</h2>
                        <a
                            href="https://apps.shopify.com/stock-bud"
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ShoppingBag size={16} />
                            Add Store
                        </a>
                    </div>

                    {/* Store List */}
                    {user?.shopifyStores && user.shopifyStores.length > 0 ? (
                        <div className="space-y-3">
                            {user.shopifyStores.map((store) => (
                                <div
                                    key={store.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${user.activeShopId === store.id
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                                        : isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${user.activeShopId === store.id ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            <ShoppingBag className={user.activeShopId === store.id ? 'text-green-600' : 'text-gray-500'} size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold dark:text-white flex items-center gap-2">
                                                {store.name || store.shop.replace('.myshopify.com', '')}
                                                {user.activeShopId === store.id && (
                                                    <span className="text-xs px-2 py-0.5 bg-green-600 text-white rounded-full">Active</span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{store.shop}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {user.activeShopId !== store.id && (
                                            <button
                                                onClick={() => handleSetActiveShop(store.id)}
                                                className="px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 text-sm font-medium transition-colors dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400"
                                            >
                                                Set Active
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveStore(store.id, store.shop)}
                                            className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-sm font-medium transition-colors dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`text-center py-12 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <ShoppingBag className="mx-auto mb-4 text-gray-400" size={48} />
                            <h3 className="font-semibold text-lg dark:text-white mb-2">No stores connected</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Connect your Shopify store to get started.</p>
                        </div>
                    )}

                    {/* Token Info */}
                    {user?.shopifyStores && user.shopifyStores.length >= 2 && (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
                            <Zap className="text-yellow-600 dark:text-yellow-400" size={18} />
                            <span className="text-sm text-yellow-700 dark:text-yellow-300">
                                <strong>Bonus:</strong> You have 2+ stores connected! Your tokens have been doubled.
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
