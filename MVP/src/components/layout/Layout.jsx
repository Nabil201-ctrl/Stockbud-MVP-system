
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../Dashboard/Sidebar';
import Header from '../Dashboard/Header';
import ChatBotButton from '../ChatBot/ChatBotButton';
import OfflineBanner from '../common/OfflineBanner';
import FeedbackModal from '../Dashboard/FeedbackModal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const Layout = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  useEffect(() => {
    const checkFeedback = () => {
      const lastFeedback = localStorage.getItem('lastFeedbackDate');
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

      if (!lastFeedback) {
        setTimeout(() => setShowFeedback(true), 5000);
      } else {
        const timeSince = Date.now() - parseInt(lastFeedback, 10);
        if (timeSince > TWO_WEEKS_MS) {
          setShowFeedback(true);
        }
      }
    };

    checkFeedback();
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      popoverClass: 'driverjs-theme',
      steps: [
        { element: '#app-sidebar', popover: { title: 'Navigation', description: 'Use the sidebar to navigate between different sections of the app.' } },
        { element: '#app-header', popover: { title: 'Header', description: 'Access your profile, notifications, and settings here.' } },

        ...(location.pathname === '/dashboard' ? [
          { element: '#dashboard-stats', popover: { title: 'Overview Stats', description: 'Quick view of your key metrics.' } },
          { element: '#revenue-chart', popover: { title: 'Revenue Chart', description: 'Track your revenue trends over time.' } },
          { element: '#source-chart', popover: { title: 'Traffic Sources', description: 'See where your customers are coming from.' } },
        ] : []),

        ...(location.pathname === '/products' ? [
          { element: '#products-stats', popover: { title: 'Product Stats', description: 'Summary of your product inventory.' } },
          { element: '#products-search', popover: { title: 'Search & Filter', description: 'Find specific products or filter by category.' } },
          { element: '#products-table', popover: { title: 'Product List', description: 'Manage your products here.' } },
        ] : []),

        ...(location.pathname === '/reports' ? [
          { element: '#reports-header', popover: { title: 'Reports Overview', description: 'View and manage your generated reports here.' } },
          { element: '#reports-stats-grid', popover: { title: 'Key Metrics', description: 'Quick summary of your business performance.' } },
          { element: '#reports-list', popover: { title: 'Generated Reports', description: 'Access your history of generated reports. You can preview, download, or delete them.' } },
        ] : []),

        ...(location.pathname === '/settings' ? [
          { element: '#settings-header', popover: { title: 'Settings', description: 'Manage your account, profile, and security preferences.' } },
          { element: '#settings-tabs', popover: { title: 'Configuration Categories', description: 'Switch between different settings categories like Profile, Security, and Integrations.' } },
        ] : []),

        ...(location.pathname === '/realtime' ? [
          { element: '#realtime-header', popover: { title: 'Realtime Analytics', description: 'Monitor live user activity on your store.' } },
          { element: '#realtime-stats', popover: { title: 'Live Stats', description: 'Real-time counters for active users, views, and clicks.' } },
          { element: '#realtime-activity', popover: { title: 'Activity Stream', description: 'Watch user actions as they happen.' } },
          { element: '#realtime-analytics', popover: { title: 'Detailed Breakdown', description: 'See geographic and device distribution of your current traffic.' } },
        ] : []),

        ...(location.pathname === '/bot-customization' ? [
          { element: '#bot-header', popover: { title: 'AI Bot Customization', description: 'Tailor your AI assistant to match your brand.' } },
          { element: '#bot-preview-card', popover: { title: 'Live Preview', description: 'See how your bot looks and behaves in real-time.' } },
          { element: '#bot-settings-card', popover: { title: 'Bot Settings', description: 'Configure personality, speed, language, and other behaviors.' } },
        ] : []),

        ...(location.pathname === '/users' ? [
          { element: '#users-header', popover: { title: 'User Management', description: 'View and manage your registered users.' } },
          { element: '#users-stats', popover: { title: 'User Growth', description: 'Track user acquisition and retention metrics.' } },
          { element: '#users-table', popover: { title: 'User Directory', description: 'Filter, search, and manage individual user accounts.' } },
        ] : []),

        ...(location.pathname === '/chat' ? [
          { element: '#chat-sidebar', popover: { title: 'Chat History', description: 'Access your previous conversations here.' } },
          { element: '#chat-input', popover: { title: 'Ask AI', description: 'Type your questions about your store data here.' } },
        ] : []),
      ],
      onDestroyed: async () => {
        if (user && !user.isOnboardingComplete) {
          try {
            await completeOnboarding();
            // User stays on the dashboard after completing the tour
          } catch (error) {
            console.error('Failed to complete onboarding:', error);
          }
        }
      }
    });

    driverObj.drive();
  };

  useEffect(() => {
    // If user is not onboarded, start tour automatically once
    if (user && !user.isOnboardingComplete) {
      const tourStarted = localStorage.getItem('tour_started_automatic');
      if (!tourStarted) {
        setTimeout(() => {
          startTour();
          localStorage.setItem('tour_started_automatic', 'true');
        }, 1500);
      }
    }
  }, [user]);

  const handleFeedbackSubmit = (feedback) => {
    console.log('Feedback submitted:', feedback);
    localStorage.setItem('lastFeedbackDate', Date.now().toString());
    setShowFeedback(false);
  };

  const handleFeedbackClose = () => {
    localStorage.setItem('lastFeedbackDate', Date.now().toString());
    setShowFeedback(false);
  };

  return (
    <div className={`flex min-h-screen w-full ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'} transition-colors duration-300`}>
      <OfflineBanner />
      <Sidebar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isCalendarOpen={isCalendarOpen}
        isDarkMode={isDarkMode}
        isOpen={isMobileSidebarOpen}
        onClose={closeMobileSidebar}
      />

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <Header
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          toggleSidebar={toggleMobileSidebar}
          startTour={startTour}
        />
        <main className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} transition-colors duration-300`}>
          <div className="min-h-full">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      <ChatBotButton />

      <FeedbackModal
        isOpen={showFeedback}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
};

export default Layout;