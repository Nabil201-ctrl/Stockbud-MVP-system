import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authAPI, userAPI } from '../services/api';
import { storage } from '../utils/db';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            // Optimistically load user from cache if available for immediate render
            const cachedUser = await storage.get('stockbud_cached_user');
            if (cachedUser) {
                setUser(cachedUser);
            }

            const response = await userAPI.getProfile();
            setUser(response.data);
            await storage.set('stockbud_cached_user', response.data);
        } catch (error) {
            if (error.isOffline) {
                console.warn('Network offline. Using cached user session.');
                const cachedUser = await storage.get('stockbud_cached_user');
                if (cachedUser) {
                    setUser(cachedUser);
                } else {
                    setUser(null);
                }
            } else if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                // explicit unauthorization
                setUser(null);
                await storage.delete('stockbud_cached_user');
            } else {
                console.error('Failed to check auth', error);
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        const handleOnline = () => {
            console.log('App back online, re-syncing auth profile...');
            checkAuth();
        };

        // Listen for internal unauthorized logout triggers from api.js
        const handleAuthLogout = async () => {
            setUser(null);
            localStorage.removeItem('stockbud_access_token');
            await storage.delete('stockbud_cached_user');
        };

        window.addEventListener('online', handleOnline);
        globalThis.addEventListener('auth:logout', handleAuthLogout);
        return () => {
            window.removeEventListener('online', handleOnline);
            globalThis.removeEventListener('auth:logout', handleAuthLogout);
        };
    }, []);

    const loginLocal = async (email, password) => {
        try {
            const response = await authAPI.login(email, password);
            setUser(response.data.user);
            await storage.set('stockbud_cached_user', response.data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Invalid credentials' };
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (err) {
            console.error("Logout failed", err);
        }
        setUser(null);
        localStorage.removeItem('stockbud_access_token');
        await storage.delete('stockbud_cached_user');
    };

    const register = async (name, email, password) => {
        try {
            const response = await authAPI.register(name, email, password);
            setUser(response.data.user);
            await storage.set('stockbud_cached_user', response.data.user);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Registration failed' };
        }
    };


    const updateProfile = async (data) => {
        try {
            const response = await userAPI.updateProfile(data);
            setUser(response.data);
            await storage.set('stockbud_cached_user', response.data);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    };

    const completeOnboarding = async () => {
        try {
            const response = await userAPI.completeOnboarding();
            setUser(response.data);
            await storage.set('stockbud_cached_user', response.data);
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    };

    const value = {
        user,
        loginLocal,
        register,
        logout,
        updateProfile,
        completeOnboarding,
        isAuthenticated: !!user,
        loading,
        refreshUser: checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
