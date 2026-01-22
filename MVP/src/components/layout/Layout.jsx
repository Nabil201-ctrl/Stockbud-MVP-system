// components/Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Dashboard/Sidebar';
import Header from '../Dashboard/Header';
import ChatBotButton from '../ChatBot/ChatBotButton';
import OfflineBanner from '../common/OfflineBanner';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

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
    </div>
  );
};

export default Layout;