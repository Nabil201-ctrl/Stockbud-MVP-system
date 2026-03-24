import React, { useEffect, useState } from 'react';
import { Check, Loader2, Server, ShieldCheck, RefreshCw, Database } from 'lucide-react';

const Timeline = ({ startAnimation, currentStepOverride }) => {
    const [internalStep, setInternalStep] = useState(0);

    
    const currentStep = currentStepOverride !== undefined ? currentStepOverride : internalStep;

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
        
        if (!startAnimation || currentStepOverride !== undefined) return;

        let totalDelay = 0;
        setInternalStep(1); 

        steps.forEach((step, index) => {
            if (index < steps.length - 1) {
                totalDelay += step.duration;
                setTimeout(() => {
                    setInternalStep(index + 2);
                }, totalDelay);
            }
        });
    }, [startAnimation, currentStepOverride]);

    return (
        <div className="relative w-full py-8 overflow-hidden">
            {}
            <div className="absolute top-12 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />

            <div className="flex justify-between items-start w-full">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > index + 1;
                    const isActive = currentStep === index + 1;
                    const isPending = currentStep < index + 1;

                    return (
                        <div key={step.id} className={`flex flex-col items-center flex-1 transition-all duration-500 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                            <div
                                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 transition-all duration-500 mb-4
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

                                {}
                                {isCompleted && (
                                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 text-white border-2 border-white dark:border-gray-900">
                                        <Check className="w-2.5 h-2.5" />
                                    </div>
                                )}
                            </div>

                            <div className="text-center px-2">
                                <h3 className={`font-semibold text-sm md:text-base transition-colors duration-300 mb-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {step.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timeline;
