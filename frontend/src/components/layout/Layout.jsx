
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Dashboard/Sidebar';
import Header from '../Dashboard/Header';
import ChatBotButton from '../ChatBot/ChatBotButton';
import FeedbackModal from '../FeedbackModal';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={`flex h-screen min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isCalendarOpen={isCalendarOpen}
        isDarkMode={isDarkMode}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <Header
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onOpenFeedback={() => setIsFeedbackOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>

      <ChatBotButton />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

export default Layout;