// components/Dashboard/DashboardStats.jsx
import React from 'react';
import { Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const DashboardStats = ({ isDarkMode }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.analyticsOverview')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.decemberWeeks')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <button className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
          <span className="text-sm">{t('dashboard.sortBy')}</span>
        </button>
        <button className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
          <span className="text-sm">{t('dashboard.filterBy')}</span>
        </button>
        <button className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}>
          <Calendar size={16} />
          <span className="text-sm">{t('dashboard.december2021')}</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardStats;