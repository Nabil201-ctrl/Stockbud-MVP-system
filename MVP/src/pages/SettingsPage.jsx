import React from 'react';
import { Wifi, WifiOff, Globe } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTheme } from '../context/ThemeContext';

const SettingsPage = () => {
    const isOnline = useOnlineStatus();
    const { isDarkMode } = useTheme();

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe size={20} />
                    Network Status
                </h2>

                <div className={`flex items-center gap-4 p-4 rounded-lg bg-opacity-10 ${isOnline
                        ? 'bg-green-500 text-green-700 dark:text-green-400'
                        : 'bg-red-500 text-red-700 dark:text-red-400'
                    }`}>
                    <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                        {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">
                            {isOnline ? 'You are Online' : 'You are Offline'}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {isOnline
                                ? 'All systems are operational. You have an active internet connection.'
                                : 'Connection lost. Some features may be unavailable.'}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${isOnline
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {isOnline ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Placeholder for other settings */}
            <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                }`}>
                <p className="text-center italic">More settings coming soon...</p>
            </div>
        </div>
    );
};

export default SettingsPage;
