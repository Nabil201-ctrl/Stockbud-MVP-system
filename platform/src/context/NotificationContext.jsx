import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/common/Toast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Listen for global notification events (e.g. from axios interceptors)
    React.useEffect(() => {
        const handleEvent = (event) => {
            const { message, type, duration } = event.detail;
            showNotification(message, type, duration);
        };
        globalThis.addEventListener('app:notification', handleEvent);
        return () => globalThis.removeEventListener('app:notification', handleEvent);
    }, [showNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2 pointer-events-none">
                {notifications.map(n => (
                    <div key={n.id} className="pointer-events-auto">
                        <Toast
                            message={n.message}
                            type={n.type}
                            duration={n.duration}
                            onClose={() => removeNotification(n.id)}
                        />
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
