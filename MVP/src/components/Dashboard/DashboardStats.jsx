
import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const DashboardStats = ({ isDarkMode, onSort, onFilter, onDateRange, currentSort, currentFilter, currentDateRange }) => {
  const { t } = useLanguage();
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const currentYear = currentDate.getFullYear();

  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
  const dateRangeString = `${currentMonth} 01 - ${daysInMonth} (${daysInMonth} DAYS)`;
  const monthYearString = `${currentMonth.charAt(0) + currentMonth.slice(1).toLowerCase()} ${currentYear}`;

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'highest', label: 'Highest Amount' },
    { value: 'lowest', label: 'Lowest Amount' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'web', label: 'Web Store' },
    { value: 'pos', label: 'Point of Sale' },
    { value: 'instagram', label: 'Instagram' }
  ];

  const dateOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  const handleSortSelect = (value) => {
    onSort(value);
    setShowSortDropdown(false);
  };

  const handleFilterSelect = (value) => {
    onFilter(value);
    setShowFilterDropdown(false);
  };

  const handleDateSelect = (value) => {
    onDateRange(value);
    setShowDateDropdown(false);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 relative z-50">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.analyticsOverview')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{dateRangeString}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); setShowDateDropdown(false); }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}
          >
            <span className="text-sm">{t('dashboard.sortBy')}</span>
            <ChevronDown size={14} className={`transform transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showSortDropdown && (
            <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} ring-1 ring-black/5`}>
              {sortOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleSortSelect(opt.value)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-blue-500 hover:text-white transition-colors ${currentSort === opt.value ? 'bg-blue-500/10 text-blue-500' : ''}`}
                >
                  {opt.label}
                  {currentSort === opt.value && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); setShowDateDropdown(false); }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}
          >
            <span className="text-sm">{t('dashboard.filterBy')}</span>
            <ChevronDown size={14} className={`transform transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showFilterDropdown && (
            <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterSelect(opt.value)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-blue-500 hover:text-white transition-colors ${currentFilter === opt.value ? 'bg-blue-500/10 text-blue-500' : ''}`}
                >
                  {opt.label}
                  {currentFilter === opt.value && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => { setShowDateDropdown(!showDateDropdown); setShowSortDropdown(false); setShowFilterDropdown(false); }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-50'}`}
          >
            <Calendar size={16} className="text-blue-500" />
            <span className="text-sm">{currentDateRange === '7days' ? 'Last 7 Days' : currentDateRange === 'month' ? monthYearString : 'This Year'}</span>
            <ChevronDown size={14} className={`transform transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showDateDropdown && (
            <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl shadow-xl overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} ring-1 ring-black/5`}>
              {dateOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleDateSelect(opt.value)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-blue-500 hover:text-white transition-colors ${currentDateRange === opt.value ? 'bg-blue-500/10 text-blue-500' : ''}`}
                >
                  {opt.label}
                  {currentDateRange === opt.value && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;