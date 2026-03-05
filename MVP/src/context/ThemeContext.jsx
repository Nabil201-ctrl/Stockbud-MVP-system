import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [fontSize, setFontSize] = useState(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    return savedFontSize ? parseInt(savedFontSize) : 100; // default 100%
  });

  useEffect(() => {
    // Update localStorage and document class when theme changes
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString());
    document.documentElement.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const changeFontSize = (newSize) => {
    // Constrain the font size between 80% and 150%
    setFontSize(Math.max(80, Math.min(150, newSize)));
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, fontSize, changeFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};