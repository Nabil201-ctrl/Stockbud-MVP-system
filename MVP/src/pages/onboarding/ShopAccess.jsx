import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, ShieldCheck, ArrowRight } from 'lucide-react';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';

const ShopAccess = () => {
    const navigate = useNavigate();

    const handleAccess = () => {
        navigate('/onboarding/link-shop');
    };

    return (
        <OnboardingLayout step={2} totalSteps={3}>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                        <Database className="w-10 h-10" />
                    </div>

                    <h2 className="text-2xl font-bold mb-3 dark:text-white">Connect Your Data</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        To provide accurate insights, Stockbud needs access to your shop's inventory and sales data.
                    </p>

                    <div className="w-full bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-8 flex items-start gap-3 text-left">
                        <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">Secure & Private</h4>
                            <p className="text-blue-700 dark:text-blue-400/80 text-xs mt-1">
                                Your data is encrypted and never shared. We only access what's necessary for analytics.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleAccess}
                        className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 group"
                    >
                        Allow Access
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default ShopAccess;
