// Dashboard.jsx
import React, { useState, lazy, Suspense } from 'react';
import Sidebar from '../components/Dashboard/Sidebar';
import Header from '../components/Dashboard/Header';
import DashboardStats from '../components/Dashboard/DashboardStats';
import SalesHeatmap from '../components/Dashboard/SalesHeatmap';
import SalesHistory from '../components/Dashboard/SalesHistory';
import ChartLoading from '../components/layout/ChatLoading';
import ChatBotButton from '../components/ChatBot/ChatBotButton';
import { useTheme } from '../context/ThemeContext';

// Lazy loaded chart components
const RevenueChart = lazy(() => import('../components/charts/RevenueChart'));
const SourcePieChart = lazy(() => import('../components/charts/SourcePieChart'));
const CountryBarChart = lazy(() => import('../components/charts/CountryBarChart'));
const VisitorAreaChart = lazy(() => import('../components/charts/VisitorAreaChart'));

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={`flex h-screen min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      <ChatBotButton />

      <div className="flex-1 flex flex-col min-h-0">
        
        <div className="flex-1 overflow-y-auto p-6">
          <DashboardStats isDarkMode={isDarkMode} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">$ 40,256,92.00</span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded">+2.94%</span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-500 dark:text-gray-400">Current Week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                    <span className="text-gray-500 dark:text-gray-400">Last Week</span>
                  </div>
                </div>
              </div>
              <div className="h-64 min-h-[256px] w-full">
                <Suspense fallback={<ChartLoading type="line" />}>
                  <RevenueChart />
                </Suspense>
              </div>
            </div>

            {/* Source of Purchases - Pie Chart */}
            <div className="rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Source of Purchases</span>
                <div className="text-gray-400">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="4" r="1.5" />
                    <circle cx="8" cy="12" r="1.5" />
                  </svg>
                </div>
              </div>
              <div className="h-64 min-h-[256px] w-full">
                <Suspense fallback={<ChartLoading type="pie" />}>
                  <SourcePieChart />
                </Suspense>
              </div>
            </div>

            {/* 72 Countries - Bar Chart */}
            <div className="rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">72 Countries <span className="text-gray-400 text-sm">(7/604 Sales)</span></span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</span>
              </div>
              <div className="h-64 min-h-[256px] w-full">
                <Suspense fallback={<ChartLoading type="default" />}>
                  <CountryBarChart />
                </Suspense>
              </div>
            </div>

            {/* Visitors - Area Chart */}
            <div className="rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Visitors (Today)</span>
                <div className="text-gray-400">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="4" r="1.5" />
                    <circle cx="8" cy="12" r="1.5" />
                  </svg>
                </div>
              </div>
              <div className="h-48 min-h-[192px] w-full">
                <Suspense fallback={<ChartLoading type="default" />}>
                  <VisitorAreaChart />
                </Suspense>
              </div>
              <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <div className="text-sm text-gray-600 dark:text-gray-300">Congratulations...</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Visitor growth increased by 24% this month
                </div>
              </div>
            </div>

            <SalesHeatmap isDarkMode={isDarkMode} />
            <SalesHistory isDarkMode={isDarkMode} />
          </div>

          {/* Ensure there's enough space at the bottom to prevent white space */}
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;