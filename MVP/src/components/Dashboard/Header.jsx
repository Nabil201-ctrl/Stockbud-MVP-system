import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, Sun, Moon, LogOut, User as UserIcon, Zap, Globe, Check, Info, AlertTriangle, CheckCircle, ShoppingBag, HelpCircle, Store } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Header = ({ isDarkMode, toggleTheme, toggleSidebar, startTour }) => {
  const { user, logout, authenticatedFetch, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showShopMenu, setShowShopMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const menuRef = useRef(null);
  const shopMenuRef = useRef(null);
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
      if (shopMenuRef.current && !shopMenuRef.current.contains(event.target)) {
        setShowShopMenu(false);
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

  const handleShopSwitch = async (storeId) => {
    if (storeId === user.activeShopId) return;
    try {
      const response = await authenticatedFetch('http://localhost:3000/users/shopify-stores/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId })
      });
      if (response.ok) {
        await refreshUser();
        setShowShopMenu(false);

        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to switch shop", error);
    }
  };

  const allStores = [
    ...(user?.shopifyStores?.map(s => ({ ...s, isShopify: true })) || [])
  ];

  const activeStore = allStores.find(s => s.id === user?.activeShopId);

  return (
    <div id="app-header" className={`px-6 py-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-10`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button className="lg:hidden" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="hidden md:flex items-center relative" ref={shopMenuRef}>
            {(allStores.length > 0) ? (
              <>
                <button
                  id="shop-selector"
                  onClick={() => setShowShopMenu(!showShopMenu)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className={`p-1 rounded-md ${activeStore?.isSocial
                    ? (isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600')
                    : (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')
                    }`}>
                    {activeStore?.isSocial ? <Store size={16} /> : <ShoppingBag size={16} />}
                  </div>
                  <span className={`text-sm font-medium max-w-[150px] truncate ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
                    {activeStore ? (activeStore.name || activeStore.shop?.replace('.myshopify.com', '')) : t('header.selectStore') || 'Select Store'}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${showShopMenu ? 'rotate-180' : ''}`} />
                </button>
                {showShopMenu && (
                  <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl border overflow-hidden z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
                    <div className={`px-4 py-2 border-b text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-slate-100 text-slate-500'}`}>
                      {t('header.selectShop')}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {allStores.map(store => (
                        <button
                          key={store.id}
                          onClick={() => handleShopSwitch(store.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${user.activeShopId === store.id
                            ? (isDarkMode ? 'bg-indigo-900/10 text-indigo-400' : 'bg-indigo-50 text-indigo-700')
                            : (isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-50 text-slate-700')
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.activeShopId === store.id
                              ? 'bg-indigo-500 text-white'
                              : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-slate-200 text-slate-500')
                              }`}>
                              {store.isSocial ? <Store size={14} /> : (store.name || store.shop).substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{store.name || store.shop?.replace('.myshopify.com', '')}</div>
                              <div className="text-xs opacity-70 truncate">{store.isSocial ? store.type : store.shop}</div>
                            </div>
                          </div>
                          {user.activeShopId === store.id && <Check size={16} className="text-indigo-500" />}
                        </button>
                      ))}
                    </div>
                    <div className={`p-2 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-slate-100 bg-slate-50'}`}>
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full py-2 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingBag size={14} /> {t('header.addNewShop')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">{t('header.noShopSelected')}</div>
            )}
          </div>
          <div className="flex-1"></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">


          <div
            id="ai-tokens"
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
            onClick={startTour}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-slate-100 text-slate-600'}`}
            title={t('header.startTour') || 'Start Tour'}
          >
            <HelpCircle size={20} />
          </button>

          <button
            id="theme-toggle"
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
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{t('header.notifications')}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Check size={12} /> {t('header.markAllRead')}
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p>{t('header.noNotifications')}</p>
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
                    {t('header.viewAll')}
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

            { }
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
                  <span>{t('header.profile')}</span>
                </button>

                <button
                  className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                >
                  <LogOut size={16} />
                  <span>{t('header.logout')}</span>
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