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

    // Shopify Form State
    const [shopifyUrl, setShopifyUrl] = useState('');
    const [shopifyToken, setShopifyToken] = useState('');
    const [errors, setErrors] = useState({});

    const platforms = [
        { id: 'shopify', name: 'Shopify', icon: ShoppingBag, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
        { id: 'whop', name: 'Whop', icon: Globe, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
        { id: 'api', name: 'Custom API', icon: Code, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300' },
    ];

    const validateShopifyForm = () => {
        const newErrors = {};
        if (!shopifyUrl) newErrors.url = 'Shop URL is required';
        else if (!shopifyUrl.includes('myshopify.com') && !shopifyUrl.includes('.')) newErrors.url = 'Please enter a valid shop URL';

        if (!shopifyToken) newErrors.token = 'Admin API Access Token is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePlatformSelect = (platformId) => {
        if (platformId === 'shopify') {
            setSelectedPlatform('shopify');
        } else {
            // For other platforms, just simulate connection for now
            handleConnect(platformId);
        }
    };

    const handleConnect = async (platformId) => {
        if (platformId === 'shopify' && !validateShopifyForm()) {
            return;
        }

        setConnecting(platformId);

        if (platformId === 'shopify') {
            try {
                // Save to Backend if authenticated
                if (isAuthenticated) {
                    const response = await authenticatedFetch('http://localhost:3000/users/shopify-credentials', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            shop: shopifyUrl,
                            token: shopifyToken
                        })
                    });
                    if (!response.ok) {
                        throw new Error('Failed to save to backend');
                    }
                    console.log('Credentials saved to Backend');
                }

                // Also save to IndexedDB as fallback/cache
                await storage.set('shopifyShop', shopifyUrl);
                await storage.set('shopifyToken', shopifyToken);
                console.log('Credentials saved to IndexedDB');

                // Complete Onboarding
                await completeOnboarding();

                setSuccess(true);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);

            } catch (error) {
                console.error('Failed to connect store:', error);
                setErrors({ ...errors, submit: 'Failed to connect store. Please try again.' });
            } finally {
                setConnecting(null);
            }
        } else {
            // Simulate connection for other platforms
            setTimeout(async () => {
                await completeOnboarding(); // Mark as complete for other platforms too
                setSuccess(true);
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);
            }, 1000);
        }
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
                    <span className="font-semibold dark:text-white">Shopify Setup</span>
                </div>
                <div className="w-9"></div> {/* Spacer for centering */}
            </div>

            <div className="w-full space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Shop URL
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LinkIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={shopifyUrl}
                            onChange={(e) => setShopifyUrl(e.target.value)}
                            placeholder="your-shop.myshopify.com"
                            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900/50 border ${errors.url ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'} focus:outline-none focus:ring-2 transition-all dark:text-white`}
                        />
                    </div>
                    {errors.url && <p className="mt-1 text-sm text-red-500 ml-1">{errors.url}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Admin API Access Token
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="password"
                            value={shopifyToken}
                            onChange={(e) => setShopifyToken(e.target.value)}
                            placeholder="shpat_..."
                            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-900/50 border ${errors.token ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500'} focus:outline-none focus:ring-2 transition-all dark:text-white`}
                        />
                    </div>
                    {errors.token && <p className="mt-1 text-sm text-red-500 ml-1">{errors.token}</p>}
                    <p className="mt-2 text-xs text-gray-400 ml-1">
                        Found in Shopify Admin &gt; Settings &gt; Apps and sales channels &gt; Develop apps.
                    </p>
                </div>

                {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}

                <button
                    onClick={() => handleConnect('shopify')}
                    disabled={connecting !== null}
                    className="w-full mt-4 py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {connecting === 'shopify' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            Connect Store
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
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
