import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const authenticatedFetch = async (url, options = {}) => {
        let response = await fetch(url, {
            ...options,
            credentials: 'include', 
            headers: {
                ...options.headers,
                
            }
        });

        if (response.status === 401) {
            
            try {
                const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include'
                });

                if (refreshResponse.ok) {
                    
                    response = await fetch(url, {
                        ...options,
                        credentials: 'include'
                    });
                } else {
                    
                    setUser(null);
                }
            } catch (error) {
                console.error("Token refresh failed", error);
                setUser(null);
            }
        }
        return response;
    };

    const checkAuth = async () => {
        try {
            
            const response = await authenticatedFetch(`${API_URL}/users/me?t=${Date.now()}`);
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to check auth', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const loginLocal = async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            return { success: true };
        } else {
            return { success: false, error: 'Invalid credentials' };
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error("Logout failed", err);
        }
        setUser(null);
    };

    const register = async (name, email, password) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (response.ok) {
            
            return loginLocal(email, password);
        } else {
            const data = await response.json();
            return { success: false, error: data.message || 'Registration failed' };
        }
    };

    const updateProfile = async (data) => {
        const response = await authenticatedFetch(`${API_URL}/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            const updatedUser = await response.json();
            setUser(updatedUser);
            return { success: true };
        }
        return { success: false };
    };

    const completeOnboarding = async () => {
        const response = await authenticatedFetch(`${API_URL}/users/onboarding/complete`, {
            method: 'POST'
        });
        if (response.ok) {
            const updatedUser = await response.json();
            setUser(updatedUser);
            return { success: true };
        }
        return { success: false };
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
        authenticatedFetch,
        refreshUser: checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
