
import React from 'react';

const SalesHistory = ({ isDarkMode, data, currencySymbol = '$' }) => {
  const salesHistory = data || [];

  return (
    <div className={`rounded-lg p-6 border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">Sales History</span>
        <div className="text-gray-400">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="4" r="1.5" />
            <circle cx="8" cy="12" r="1.5" />
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        {salesHistory.map((sale, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${sale.color} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                {sale.avatar}
              </div>
              <span className="text-sm">{sale.name}</span>
            </div>
            <span className="font-semibold">{currencySymbol}{sale.amount}</span>
          </div>
        ))}
      </div>
      <button className="w-full mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline flex items-center justify-center gap-1">
        DOWNLOAD
      </button>
    </div>
  );
};

export default SalesHistory;