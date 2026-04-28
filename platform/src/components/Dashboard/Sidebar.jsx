
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Sliders, Clock, Users, TrendingUp, Package,
  RefreshCw, Settings, FileText, Calendar, MessageSquare, LogOut,
  Globe
} from 'lucide-react';
import FeedbackModal from './FeedbackModal';
import FulLogo from '../../assets/FulLogo.png';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Sidebar = ({ selectedDate, setSelectedDate, isCalendarOpen, isDarkMode, isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [showFeedbackWidget, setShowFeedbackWidget] = useState(false);
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);


  React.useEffect(() => {
    if (!user) return;



    const accountCreatedDate = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    const daysSinceCreation = accountCreatedDate ? (Date.now() - accountCreatedDate) / (1000 * 60 * 60 * 24) : 14;

    if (daysSinceCreation < 14) {
      setShowFeedbackWidget(false);
      return;
    }

    const lastSubmitted = localStorage.getItem('feedback_last_submitted');
    if (!lastSubmitted) {
      setShowFeedbackWidget(true);
    } else {
      const daysSinceSubmit = (Date.now() - parseInt(lastSubmitted)) / (1000 * 60 * 60 * 24);

      if (daysSinceSubmit >= 14) {
        setShowFeedbackWidget(true);
      } else {
        setShowFeedbackWidget(false);
      }
    }
  }, [user]);

  const handleFeedbackSubmit = () => {
    localStorage.setItem('feedback_last_submitted', Date.now().toString());
    setShowFeedbackWidget(false);
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: t('nav.dashboard') },
    { to: '/chat', icon: <MessageSquare size={18} />, label: t('nav.botChat') },
    { to: '/bot-customization', icon: <Sliders size={18} />, label: t('nav.botCustomization') },
    { to: '/products', icon: <Package size={18} />, label: t('nav.products') },
    { to: '/scraper', icon: <Globe size={18} />, label: t('nav.monitoring') },
    { to: '/settings', icon: <Settings size={18} />, label: t('nav.settings') },
    { to: '/reports', icon: <FileText size={18} />, label: t('nav.reports') },
  ];

  return (
    <>
      <div id="app-sidebar" className={`
        fixed inset-y-0 left-0 z-[100] transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto


        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-gray-200'} border-r flex flex-col flex-shrink-0
      `}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <img src={FulLogo} alt="StockBud Logo" className="h-32 w-auto object-contain" />
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-6">
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
          </div>
        </nav>

        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {showFeedbackWidget && (
            <div className="bg-blue-600 rounded-lg p-3 text-white mb-4">
              <h4 className="text-xs font-medium mb-2 opacity-90">Help us improve</h4>
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="w-full bg-white text-blue-600 text-xs py-1.5 rounded-md font-medium hover:bg-blue-50 transition-colors shadow-sm"
              >
                Feedback
              </button>
            </div>
          )}

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors font-semibold ${isDarkMode
              ? 'text-red-400 hover:bg-red-900/20'
              : 'text-red-600 hover:bg-red-50'
              }`}
          >
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </div>

      <FeedbackModal
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={handleFeedbackSubmit}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default Sidebar;