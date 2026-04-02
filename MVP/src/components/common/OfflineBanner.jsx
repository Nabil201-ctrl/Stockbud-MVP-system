import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const OfflineBanner = () => {
    const isOnline = useOnlineStatus();
    const [isVisible, setIsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setIsVisible(true);
        } else if (hasLoaded) {
            // When back online, show message for 3 seconds then hide
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
        setHasLoaded(true);
    }, [isOnline]);

    if (!isVisible && hasLoaded) return null;

    if (!isVisible && !hasLoaded) {




    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 transform ${isVisible ? 'translate-y-0' : '-translate-y-full'
                } ${isOnline ? 'bg-green-500' : 'bg-red-500'
                } text-white px-4 py-3 shadow-md flex items-center justify-between`}
        >
            <div className="flex items-center gap-2 justify-center w-full">
                {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                <span className="font-medium">
                    {isOnline ? 'You are back online' : 'You are currently offline. Check your internet connection.'}
                </span>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors absolute right-4"
                aria-label="Close banner"
            >
                <X size={20} />
            </button>
        </div>
    );
};

export default OfflineBanner;
