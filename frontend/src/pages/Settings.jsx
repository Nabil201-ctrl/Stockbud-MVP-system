import React, { useState, useEffect } from 'react';
import Timeline from '../components/Shopify/Timeline';
import { ShoppingBag, Key } from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';

const Settings = () => {
    const [shopUrl, setShopUrl] = useState('');
    const [token, setToken] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Socket Connection
    useEffect(() => {
        if (!shopUrl || !isConnecting) return;

        const socket = io(import.meta.env.VITE_API_BASE_URL);

        socket.on('connect', () => {
            console.log('Connected to Shopify Gateway');
            socket.emit('join-room', { shop: shopUrl });
        });

        socket.on('statusUpdate', (data) => {
            console.log('Received status update:', data);
            setCurrentStep(data.step);
            if (data.step === 5) {
                setIsConnected(true);
                setIsConnecting(false);
            }
        });

        return () => socket.disconnect();
    }, [isConnecting, shopUrl]);

    const handleDisconnect = async () => {
        if (!window.confirm("Are you sure you want to disconnect your Shopify store? This will stop all monitoring.")) {
            return;
        }

        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/users/shopify-credentials`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShopUrl('');
            setToken('');
            setIsConnected(false);
            setCurrentStep(0);
        } catch (error) {
            console.error("Disconnect failed:", error);
            alert("Failed to disconnect store");
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                Settings
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Integration Form */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <ShoppingBag className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shopify Integration</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Connect your store to unlock AI insights</p>
                            </div>
                        </div>

                        <form onSubmit={handleConnect} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Shop Domain</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={shopUrl}
                                        onChange={(e) => setShopUrl(e.target.value)}
                                        placeholder="your-store.myshopify.com"
                                        disabled={isConnecting || isConnected}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <ShoppingBag className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Access Token</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        placeholder="shpat_..."
                                        disabled={isConnecting || isConnected}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <Key className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                                </div>
                            </div>

                            {!isConnected ? (
                                <button
                                    type="submit"
                                    disabled={isConnecting || !shopUrl || !token}
                                    className="w-full py-3 rounded-xl font-semibold transition-all shadow-lg bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect Store'}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="w-full py-3 rounded-xl font-semibold text-center bg-green-100 text-green-700 border border-green-200">
                                        Store Connected Active
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDisconnect}
                                        className="w-full py-3 rounded-xl font-semibold transition-all bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                                    >
                                        Disconnect Store
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                { }
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                    {!isConnecting && !isConnected ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-[2px] z-10 p- text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                { }
                                <ShoppingBag className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Waiting to Connect</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">Enter your credentials to start the secure handshake process.</p>
                        </div>
                    ) : null}

                    <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Connection Status</h3>
                    <Timeline startAnimation={isConnecting} currentStepOverride={currentStep} />
                </div>
            </div>
        </div>
    );
};

export default Settings;
