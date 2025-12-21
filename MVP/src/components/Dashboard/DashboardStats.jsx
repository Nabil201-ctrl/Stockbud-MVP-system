// components/Dashboard/DashboardStats.jsx
import React from 'react';
import { Calendar } from 'lucide-react';

const DashboardStats = ({ isDarkMode }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Overview,</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">DECEMBER 01 - 08 (7 DAYS)</p>
      </div>
      <div className="flex gap-2">
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
          <span className="text-sm">Sort By</span>
        </button>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
          <span className="text-sm">Filter By</span>
        </button>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
          <Calendar size={16} />
          <span className="text-sm">December 2021</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardStats;