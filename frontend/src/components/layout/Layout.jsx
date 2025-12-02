// components/Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Dashboard/Sidebar';
import Header from '../Dashboard/Header';
import ChatBotButton from '../ChatBot/ChatBotButton';
import { useTheme } from '../../context/ThemeContext';

const Layout = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
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
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
      
      <ChatBotButton />
    </div>
  );
};

export default Layout;