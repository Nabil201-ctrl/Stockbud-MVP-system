// components/Dashboard/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Sliders, Clock, Users, TrendingUp, Package,
  RefreshCw, Settings, Bookmark, Calendar, MessageSquare, LogOut
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ selectedDate, setSelectedDate, isCalendarOpen, isDarkMode, isOpen, onClose }) => {
  const { logout } = useAuth();
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/chat', icon: <MessageSquare size={18} />, label: 'Bot Chat' },
    { to: '/bot-customization', icon: <Sliders size={18} />, label: 'Bot Customization' },
    { to: '/products', icon: <Package size={18} />, label: 'Products' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
    { to: '/bookmarks', icon: <Bookmark size={18} />, label: 'Bookmarks' },
  ];

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      w-64 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col flex-shrink-0
    `}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">a</span>
          </div>
          <span className="font-bold text-xl">stockbud.</span>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto flex flex-col">
        <div className="mb-6 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-colors ${isActive
                  ? isDarkMode
                    ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-colors ${isDarkMode
              ? 'text-red-400 hover:bg-red-900/20'
              : 'text-red-600 hover:bg-red-50'
              }`}
          >
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>

        {/* Calendar Widget */}
        {isCalendarOpen && (
          <div className="bg-blue-600 rounded-lg p-4 text-white">
            {/* ... calendar widget code ... */}
          </div>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;