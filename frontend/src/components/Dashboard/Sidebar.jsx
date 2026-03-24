
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Sliders, Clock, Users, TrendingUp, Package,
  RefreshCw, Settings, Bookmark, Calendar
} from 'lucide-react';

const Sidebar = ({ selectedDate, setSelectedDate, isCalendarOpen, isDarkMode }) => {
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/bot-customization', icon: <Sliders size={18} />, label: 'Bot Customization' },
    { to: '/realtime', icon: <Clock size={18} />, label: 'Realtime' },
    { to: '/users', icon: <Users size={18} />, label: 'Users' },
    { to: '/posts-margin', icon: <TrendingUp size={18} />, label: 'Posts Margin' },
    { to: '/products', icon: <Package size={18} />, label: 'Products' },
    { to: '/conversions', icon: <RefreshCw size={18} />, label: 'Conversions' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
    { to: '/bookmarks', icon: <Bookmark size={18} />, label: 'Bookmarks' },
  ];

  return (
    <div className={`w-64 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col flex-shrink-0`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">a</span>
          </div>
          <span className="font-bold text-xl">stockbud.</span>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="mb-6">
          {navItems.slice(0, 2).map((item) => (
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
        </div>

        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 px-3 mb-2">REPORTS</div>
          {navItems.slice(2, 7).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${isActive
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
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 px-3 mb-2">GENERAL</div>
          {navItems.slice(7).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${isActive
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
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {}
        {isCalendarOpen && (
          <div className="bg-blue-600 rounded-lg p-4 text-white">
            {}
          </div>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;