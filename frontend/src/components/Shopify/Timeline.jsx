import React, { useEffect, useState } from 'react';
import { Check, Loader2, Server, ShieldCheck, RefreshCw, Database } from 'lucide-react';

const Timeline = ({ startAnimation }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            id: 1,
            title: "Initiating Handshake",
            description: "Establishing secure connection with Shopify Store",
            icon: <Server className="w-5 h-5" />,
            duration: 1500
        },
        {
            id: 2,
            title: "Verifying Credentials",
            description: "Validating access token and permissions",
            icon: <ShieldCheck className="w-5 h-5" />,
            duration: 2000
        },
        {
            id: 3,
            title: "Syncing Product Catalog",
            description: "Fetching inventory and product details",
            icon: <RefreshCw className="w-5 h-5" />,
            duration: 2500
        },
        {
            id: 4,
            title: "Analyzing Historical Data",
            description: "Processing sales history and customer insights",
            icon: <Database className="w-5 h-5" />,
            duration: 2000
        },
        {
            id: 5,
            title: "Connection Secure & Active",
            description: "Ready to power your insights",
            icon: <Check className="w-5 h-5" />,
            duration: 0
        }
    ];

    useEffect(() => {
        if (!startAnimation) return;

        let totalDelay = 0;
        setCurrentStep(1); // Start with step 1 immediately

        steps.forEach((step, index) => {
            if (index < steps.length - 1) {
                totalDelay += step.duration;
                setTimeout(() => {
                    setCurrentStep(index + 2);
                }, totalDelay);
            }
        });
    }, [startAnimation]);

    return (
        <div className="relative py-4">
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700" />

            <div className="space-y-8">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > index + 1;
                    const isActive = currentStep === index + 1;
                    const isPending = currentStep < index + 1;

                    return (
                        <div key={step.id} className={`relative flex items-start gap-4 transition-all duration-500 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                            <div
                                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-500
                  ${isCompleted || isActive
                                        ? 'border-blue-100 bg-blue-600 text-white dark:border-blue-900/50'
                                        : 'border-gray-100 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                                    }
                  ${isActive && 'ring-4 ring-blue-50 dark:ring-blue-900/20'}
                `}
                            >
                                {isActive && step.id !== 5 ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    step.icon
                                )}
                            </div>

                            <div className="pt-2">
                                <h3 className={`font-semibold text-lg transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {step.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {step.description}
                                </p>
                            </div>

                            {/* Status Indicator */}
                            {isCompleted && (
                                <div className="absolute right-0 top-3 text-green-500 animate-in fade-in slide-in-from-left-2">
                                    <Check className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timeline;
