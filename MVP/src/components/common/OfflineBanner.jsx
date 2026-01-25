import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const OfflineBanner = () => {
    const isOnline = useOnlineStatus();
    const [isVisible, setIsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        // Show banner when status changes
        setIsVisible(true);
        setHasLoaded(true);

        // Auto-hide after 1 minute (60000ms)
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 60000);

        return () => clearTimeout(timer);
    }, [isOnline]);

    if (!isVisible && hasLoaded) return null; // Keep hidden after user close or timeout
    // If we want it to show on initial load too:
    if (!isVisible && !hasLoaded) {
        // It will enter the effect and setVisible(true) immediately, so this is fine.
        // But actually the effect runs after render. Initial render -> effect -> rerender(visible).
        // If we want to hide "Online" state on initial load if it's the default, we could do check.
        // User asked "show if user is offline or online".
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
