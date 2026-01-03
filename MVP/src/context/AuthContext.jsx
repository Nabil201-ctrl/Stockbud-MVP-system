import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const authenticatedFetch = async (url, options = {}) => {
        let response = await fetch(url, {
            ...options,
            credentials: 'include', //  Send cookies
            headers: {
                ...options.headers,
                // No Authorization header needed
            }
        });

        if (response.status === 401) {
            // Try refresh
            try {
                const refreshResponse = await fetch('http://localhost:3000/auth/refresh', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (refreshResponse.ok) {
                    // Retry original request
                    response = await fetch(url, {
                        ...options,
                        credentials: 'include'
                    });
                } else {
                    // Refresh failed, logout
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
            // We use users/me to check if we are logged in (cookie is valid)
            const response = await authenticatedFetch('http://localhost:3000/users/me');
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
        const response = await fetch('http://localhost:3000/auth/login', {
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
            await fetch('http://localhost:3000/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error("Logout failed", err);
        }
        setUser(null);
    };

    const register = async (name, email, password) => {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        if (response.ok) {
            // Auto login after register
            return loginLocal(email, password);
        } else {
            const data = await response.json();
            return { success: false, error: data.message || 'Registration failed' };
        }
    };

    const updateProfile = async (data) => {
        const response = await authenticatedFetch('http://localhost:3000/users/me', {
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
        const response = await authenticatedFetch('http://localhost:3000/users/onboarding/complete', {
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
        authenticatedFetch
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
