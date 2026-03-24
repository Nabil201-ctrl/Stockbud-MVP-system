import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const OnboardingLayout = ({ children, step, totalSteps }) => {
    const { isDarkMode } = useTheme();

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen w-full px-4 overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            {}
            <div className={`absolute top-0 left-0 w-full h-full overflow-hidden -z-10`}>
                <div className={`absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-20 ${isDarkMode ? 'bg-purple-600' : 'bg-purple-300'}`}></div>
                <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-300'}`}></div>
            </div>

            <div className={`w-full max-w-md z-10 transition-all duration-500 ease-in-out`}>
                {}
                {step && totalSteps && (
                    <div className="mb-8 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        ></div>
                    </div>
                )}

                <div className={`relative`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default OnboardingLayout;
