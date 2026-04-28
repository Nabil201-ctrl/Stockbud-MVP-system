import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Chrome } from 'lucide-react';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';

const GetStarted = () => {
    const navigate = useNavigate();

    const handleContinue = () => {
        navigate('/onboarding/notifications');
    };

    return (
        <OnboardingLayout>
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="relative bg-gradient-to-tr from-blue-600 to-purple-600 p-6 rounded-2xl shadow-xl transform transition-transform hover:scale-105 duration-300">
                        <Sparkles className="w-16 h-16 text-white" />
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                    Welcome to Stockbud
                </h1>

                <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-sm leading-relaxed">
                    Your intelligent companion for managing shop operations, notifications, and analytics in one place.
                </p>

                <button
                    onClick={handleContinue}
                    className="group relative w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 block flex items-center justify-center gap-3"
                >
                    <span>Let's Get Started</span>
                    <ArrowRight className="w-5 h-5 ml-auto text-blue-200 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </OnboardingLayout>
    );

};

export default GetStarted;
