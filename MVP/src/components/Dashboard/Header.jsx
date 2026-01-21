import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, Sun, Moon, LogOut, User as UserIcon, Zap, Globe, Check, Info, AlertTriangle, CheckCircle } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Header = ({ isDarkMode, toggleTheme, toggleSidebar }) => {
  const { user, logout, authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  const fetchNotifications = async () => {
    try {
        const response = await authenticatedFetch('http://localhost:3000/notifications');
        if (response.ok) {
            const data = await response.json();
            setNotifications(data);
        }
    } catch (error) {
        console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    if (user) {
        fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'fr' : 'en');
  };

  const markAllAsRead = async () => {
    try {
        const response = await authenticatedFetch('http://localhost:3000/notifications/read-all', {
            method: 'PATCH'
        });
        if (response.ok) {
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        }
    } catch (error) {
        console.error("Failed to mark all as read", error);
    }
  };
  
  const markAsRead = async (id, e) => {
      e.stopPropagation();
      try {
        const response = await authenticatedFetch(`http://localhost:3000/notifications/${id}/read`, {
            method: 'PATCH'
        });
        if (response.ok) {
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        }
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button className="lg:hidden" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="flex-1"></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">

          {/* AI Token Display */}
          <div
            onClick={() => navigate('/settings', { state: { activeTab: 'usage' } })}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
          >
            <Zap size={14} className="text-yellow-500 fill-yellow-500" />
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
              {user?.aiTokens || 0}
            </span>
          </div>

          <button
            onClick={toggleLanguage}
            className={`p-2 rounded-lg flex items-center gap-1 ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-100 text-slate-600'}`}
            title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
          >
            <Globe size={20} />
            <span className="text-sm font-medium uppercase hidden sm:inline">{language}</span>
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-100'}`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg relative ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-100'}`}
            >
              <Bell size={20} className={isDarkMode ? 'text-gray-300' : 'text-slate-600'} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} z-50 transform origin-top-right transition-all`}>
                <div className={`px-4 py-3 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-slate-100 bg-slate-50'}`}>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Check size={12} /> Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={(e) => !notification.read && markAsRead(notification.id, e)}
                        className={`p-4 border-b last:border-b-0 hover:bg-opacity-50 transition-colors cursor-pointer flex gap-3 ${isDarkMode
                            ? 'border-gray-700 hover:bg-gray-700'
                            : 'border-slate-100 hover:bg-slate-50'
                          } ${!notification.read ? (isDarkMode ? 'bg-gray-700/30' : 'bg-blue-50/50') : ''}`}
                      >
                        <div className={`mt-1 min-w-[32px] w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'error' ? 'bg-red-100 text-red-600' :
                            notification.type === 'success' ? 'bg-green-100 text-green-600' :
                              'bg-blue-100 text-blue-600'
                          }`}>
                          {notification.type === 'error' ? <AlertTriangle size={14} /> :
                            notification.type === 'success' ? <CheckCircle size={14} /> :
                              <Info size={14} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-slate-800'} ${!notification.read ? 'font-bold' : ''}`}>
                              {notification.title}
                            </h4>
                            <span className={`text-xs whitespace-nowrap ${isDarkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'} leading-relaxed`}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className={`px-4 py-2 border-t text-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-slate-100 bg-slate-50'}`}>
                  <button className={`text-xs font-medium hover:underline ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <div
              className={`flex items-center gap-2 cursor-pointer p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-100'}`}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
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
                <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>{user?.name || 'User'}</div>
                <div className={`text-xs truncate max-w-[100px] ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{user?.email || 'Account'}</div>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-200 ${isDarkMode ? 'text-gray-400' : 'text-slate-400'} ${showProfileMenu ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} z-50`}>
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 md:hidden">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                </div>

                <button
                  className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setShowProfileMenu(false)}
                >
                  <UserIcon size={16} />
                  <span>Profile</span>
                </button>

                <button
                  className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;