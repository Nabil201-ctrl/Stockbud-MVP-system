// components/Dashboard/Header.jsx
import React from 'react';
import { Menu, Search, Bell, ChevronDown, Sun, Moon } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Header = ({ isDarkMode, toggleTheme, toggleSidebar }) => {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button className="lg:hidden" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="flex-1"></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="5" r="1.5" />
              <circle cx="10" cy="15" r="1.5" />
            </svg>
          </button>
          <button className={`p-2 rounded-lg relative ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-2 cursor-pointer">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getInitials(user?.name)}
              </div>
            )}
            <div className="hidden md:block">
              <div className="text-sm font-medium">{user?.name || 'User'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{user?.email || 'Account'}</div>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;