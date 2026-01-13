import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Wifi, WifiOff, Globe, User, Lock, Save, Loader2, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

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
                                <span className="text-sm font-bold dark:text-white">{user?.aiTokens ?? 500} / 500</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div
                                    className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((user?.aiTokens ?? 500) / 500) * 100)}%` }}
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
                                <span className="text-sm font-bold dark:text-white">{user?.reportTokens ?? 250} / 250</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                                <div
                                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, ((user?.reportTokens ?? 250) / 250) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Used for generating weekly summary reports.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
