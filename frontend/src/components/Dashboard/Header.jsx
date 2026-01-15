// components/Dashboard/Header.jsx
import React from 'react';
import { Menu, Search, Bell, ChevronDown, Sun, Moon } from 'lucide-react';

const Header = ({ isDarkMode, toggleTheme, onOpenFeedback }) => {
  return (
    <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="lg:hidden">
            <Menu size={24} />
          </button>
          <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg px-3 py-2 w-64`}>
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="⌘ K To Search a keyword..."
              className={`bg-transparent outline-none text-sm w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
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
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
              KS
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium">Kolel S.</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Demo Account</div>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;