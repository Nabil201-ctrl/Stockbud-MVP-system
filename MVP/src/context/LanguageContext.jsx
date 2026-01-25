import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const translations = { en, fr };

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Check for saved preference or browser language
        const saved = localStorage.getItem('language');
        if (saved && translations[saved]) {
            return saved;
        }
        // Auto-detect from browser
        const browserLang = navigator.language.split('-')[0];
        return translations[browserLang] ? browserLang : 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.lang = language;
    }, [language]);

    /**
     * Translate a key like 'settings.title' to the localized string.
     * @param {string} key - Dot-notation key like 'nav.dashboard'
     * @param {object} params - Optional interpolation params (future use)
     * @returns {string} Translated string or the key if not found
     */
    const t = (key, params = {}) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation missing: ${key} for language: ${language}`);
                return key; // Fallback to key
            }
        }

        // Simple interpolation (e.g., {count} in string)
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/{(\w+)}/g, (_, paramKey) => params[paramKey] || `{${paramKey}}`);
        }

        return value;
    };

    const changeLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
        }
    };

    const availableLanguages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
    ];

    return (
        <LanguageContext.Provider value={{ language, t, changeLanguage, availableLanguages }}>
            {children}
        </LanguageContext.Provider>
    );
};
