import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';

const Notifications = () => {
    const navigate = useNavigate();

    const handleContent = (allowed) => {
        // Logic to request notification permission would go here
        console.log(`Notifications ${allowed ? 'Allowed' : 'Skipped'}`);
        navigate('/onboarding/shop-access');
    };

    return (
        <OnboardingLayout step={1} totalSteps={3}>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                        <Bell className="w-10 h-10" />
                    </div>

                    <h2 className="text-2xl font-bold mb-3 dark:text-white">Stay Updated</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        Enable notifications to get real-time alerts about sales, inventory levels, and critical shop updates.
                    </p>

                    <div className="w-full space-y-3">
                        <button
                            onClick={() => handleContent(true)}
                            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Check className="w-5 h-5" />
                            Allow Notifications
                        </button>

                        <button
                            onClick={() => handleContent(false)}
                            className="w-full py-3.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium transition-colors duration-200"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>
        </OnboardingLayout>
    );
};

export default Notifications;
