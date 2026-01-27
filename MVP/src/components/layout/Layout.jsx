// components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Dashboard/Sidebar';
import Header from '../Dashboard/Header';
import ChatBotButton from '../ChatBot/ChatBotButton';
import OfflineBanner from '../common/OfflineBanner';
import FeedbackModal from '../Dashboard/FeedbackModal';
import { useTheme } from '../../context/ThemeContext';

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