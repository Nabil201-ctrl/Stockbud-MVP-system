// components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Dashboard/Sidebar';
import Header from '../Dashboard/Header';
import ChatBotButton from '../ChatBot/ChatBotButton';
import OfflineBanner from '../common/OfflineBanner';
import FeedbackModal from '../Dashboard/FeedbackModal';
import { useTheme } from '../../context/ThemeContext';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const Layout = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  // Check for weekly feedback prompt
  useEffect(() => {
    const checkFeedback = () => {
      const lastFeedback = localStorage.getItem('lastFeedbackDate');
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

      if (!lastFeedback) {
        // First visit? Maybe delay slightly so it doesn't pop up INSTANTLY on first load ever?
        // Or just show it. Let's show it after a slight delay to be polite.
        setTimeout(() => setShowFeedback(true), 5000);
      } else {
        const timeSince = Date.now() - parseInt(lastFeedback, 10);
        if (timeSince > ONE_WEEK_MS) {
          setShowFeedback(true);
        }
      }
    };

    checkFeedback();
  }, []);

  const location = useLocation();

  const startTour = () => {
    // Define base steps common to all pages (optional, maybe just sidebar/header)
    const baseSteps = [
      { element: '#app-sidebar', popover: { title: 'Navigation', description: 'Use the sidebar to navigate between different sections of the app.' } },
      { element: '#app-header', popover: { title: 'Header', description: 'Access your profile, notifications, and settings here.' } },
      { element: '#shop-selector', popover: { title: 'Shop Selector', description: 'Switch between your connected Shopify stores.' } },
      { element: '#ai-tokens', popover: { title: 'AI Tokens', description: 'View your remaining AI tokens.' } },
      { element: '#theme-toggle', popover: { title: 'Theme', description: 'Toggle between light and dark mode.' } },
    ];

    // Define page-specific steps
    const pageSteps = {
      '/dashboard': [
        { element: '#dashboard-stats', popover: { title: 'Overview Stats', description: 'Quick view of your key metrics.' } },
        { element: '#revenue-chart', popover: { title: 'Revenue Chart', description: 'Track your revenue trends over time.' } },
        { element: '#source-chart', popover: { title: 'Traffic Sources', description: 'See where your customers are coming from.' } },
      ],
      '/products': [
        { element: '#products-stats', popover: { title: 'Product Stats', description: 'Summary of your product inventory.' } },
        { element: '#products-search', popover: { title: 'Search & Filter', description: 'Find specific products or filter by category.' } },
        { element: '#products-table', popover: { title: 'Product List', description: 'Manage your products here.' } },
      ],
      '/chat': [
        { element: '#chat-sidebar', popover: { title: 'Chat History', description: 'Access your previous conversations here.' } },
        { element: '#chat-input', popover: { title: 'Ask AI', description: 'Type your questions about your store data here.' } },
      ]
    };

    // Get steps for current path, normalize path (remove trailing slash if needed)
    const currentPath = location.pathname.endsWith('/') && location.pathname.length > 1
      ? location.pathname.slice(0, -1)
      : location.pathname;

    const specificSteps = pageSteps[currentPath] || [];

    const driverObj = driver({
      showProgress: true,
      steps: [
        ...baseSteps,
        ...specificSteps
      ]
    });
    driverObj.drive();
  };

  useEffect(() => {
    const tourSeen = localStorage.getItem('tour_seen');
    if (!tourSeen) {
      setTimeout(() => {
        startTour();
        localStorage.setItem('tour_seen', 'true');
      }, 1500);
    }
  }, []);

  const handleFeedbackSubmit = (feedback) => {
    // Here we would send feedback to backend API
    console.log('Feedback submitted:', feedback);
    localStorage.setItem('lastFeedbackDate', Date.now().toString());
    setShowFeedback(false);
  };

  const handleFeedbackClose = () => {
    // If they close without submitting, maybe remind them sooner? 
    // For now, let's treat closing as "remind me later" (e.g., check again next session)
    // Or just enforce weekly interval anyway to avoid annoyance.
    // Let's set it to 1 day from now if closed without submit? 
    // User request said "comeup every one week". 
    // I'll set timestamp to now so it waits another week. 
    localStorage.setItem('lastFeedbackDate', Date.now().toString());
    setShowFeedback(false);
  }

  return (
    <div className={`flex h-screen min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-slate-800'}`}>
      <OfflineBanner />
      <Sidebar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isCalendarOpen={isCalendarOpen}
        isDarkMode={isDarkMode}
        isOpen={isMobileSidebarOpen}
        onClose={closeMobileSidebar}
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
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
        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
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