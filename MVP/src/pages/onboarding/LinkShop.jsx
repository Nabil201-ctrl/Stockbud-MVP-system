import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Globe, Code, ArrowRight, Loader2, CheckCircle2, ArrowLeft, Key, Link as LinkIcon } from 'lucide-react';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { storage } from '../../utils/db';
import { useAuth } from '../../context/AuthContext';

const LinkShop = () => {
    const navigate = useNavigate();
    const { isAuthenticated, completeOnboarding, authenticatedFetch } = useAuth();
    const [connecting, setConnecting] = useState(null);
    const [success, setSuccess] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState(null);

    // Pairing Code State
    const [pairingCode, setPairingCode] = useState(null);
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState(null);

    const platforms = [
        { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
        { id: 'whop', name: 'Whop', icon: Globe, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
        { id: 'api', name: 'Custom API', icon: Code, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300' },
    ];

    const handleGeneratePairingCode = async () => {
        setCodeLoading(true);
        setCodeError(null);
        try {
            const response = await authenticatedFetch('http://localhost:3000/shopify/pairing-code', {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error('Failed to generate code');
            }
            const data = await response.json();
            setPairingCode(data.code);
        } catch (error) {
            console.error('Failed to generate pairing code:', error);
            setCodeError('Failed to generate code. Please try again.');
        } finally {
            setCodeLoading(false);
        }
    };

    const handlePlatformSelect = (platformId) => {
        if (platformId === 'shopify') {
            setSelectedPlatform('shopify');
            // Generate code immediately when Shopify is selected
            handleGeneratePairingCode();
        } else {
            // For other platforms, simulate connection
            handleConnect(platformId);
        }
    };

    const handleConnect = async (platformId) => {
        setConnecting(platformId);
        // Simulate connection for non-Shopify platforms
        setTimeout(async () => {
            await completeOnboarding();
            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        }, 1000);
    };

    const handleSkipOrComplete = async () => {
        // User can skip if they want to connect later
        await completeOnboarding();
        navigate('/dashboard');
    };

    const renderPlatformList = () => (
        <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold mb-2 dark:text-white">Link Your Shop</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                Choose your platform to import products and sales history.
            </p>

            <div className="w-full space-y-3">
                {platforms.map((platform) => (
                    <button
                        key={platform.id}
                        onClick={() => handlePlatformSelect(platform.id)}
                        disabled={connecting !== null}
                        className={`w-full p-4 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center justify-between group ${connecting === platform.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${platform.color}`}>
                                <platform.icon className="w-6 h-6" />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">{platform.name}</span>
                        </div>

                        {connecting === platform.id ? (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : (
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-8 text-sm text-gray-400">
                Don't see your platform? <button className="text-blue-600 hover:underline">Contact Support</button>
            </div>
        </div>
    );

    const renderShopifyForm = () => (
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-500 w-full">
            <div className="w-full flex items-center justify-between mb-6">
                <button
                    onClick={() => setSelectedPlatform(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600">
                        <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="font-semibold dark:text-white">Connect Shopify</span>
                </div>
                <div className="w-9"></div>
            </div>

            <div className="w-full space-y-5 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Enter this code in your <strong>Shopify App</strong> to connect your store.
                </p>

                {codeLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : codeError ? (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                        <p>{codeError}</p>
                        <button
                            onClick={handleGeneratePairingCode}
                            className="mt-2 text-sm underline"
                        >
                            Try Again
                        </button>
                    </div>
                ) : pairingCode ? (
                    <div className="py-6">
                        <div className="text-4xl font-mono font-bold tracking-widest text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 py-4 px-6 rounded-xl select-all">
                            {pairingCode}
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            Code expires in 10 minutes
                        </p>
                    </div>
                ) : null}

                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2 text-left bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                    <p className="font-medium dark:text-gray-300">How to connect:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                        <li>Install the <strong>Stock Bud</strong> app from the Shopify App Store</li>
                        <li>Open the app in your Shopify Admin</li>
                        <li>Enter the code shown above</li>
                        <li>Your store will be connected automatically!</li>
                    </ol>
                </div>

                <button
                    onClick={handleSkipOrComplete}
                    className="w-full mt-4 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-all duration-200"
                >
                    I'll connect later
                </button>
            </div>
        </div>
    );

    return (
        <OnboardingLayout step={3} totalSteps={3}>
            {success ? (
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in-95 duration-300 border border-green-200 dark:border-green-900/50">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold dark:text-white mb-2">Success!</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center">Your shop has been connected.</p>
                </div>
            ) : (
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
                    {selectedPlatform === 'shopify' ? renderShopifyForm() : renderPlatformList()}
                </div>
            )}
        </OnboardingLayout>
    );
};

export default LinkShop;
