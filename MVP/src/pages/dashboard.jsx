// Dashboard.jsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { storage } from '../utils/db'; // Import storage
import Sidebar from '../components/Dashboard/Sidebar';
import Header from '../components/Dashboard/Header';
import DashboardStats from '../components/Dashboard/DashboardStats';
import SalesHeatmap from '../components/Dashboard/SalesHeatmap';
import SalesHistory from '../components/Dashboard/SalesHistory';
import ChartLoading from '../components/layout/ChatLoading';
import ChatBotButton from '../components/ChatBot/ChatBotButton';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Lazy loaded chart components
const RevenueChart = lazy(() => import('../components/charts/RevenueChart'));
const SourcePieChart = lazy(() => import('../components/charts/SourcePieChart'));

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage();

  // New State for Data
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authenticatedFetch, user } = useAuth(); // Import authenticatedFetch and user

  useEffect(() => {
    const fetchStats = async () => {
      // If no active shop, stop
      if (!user?.activeShopId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const cacheKey = `dashboard_stats_${user.activeShopId}`;

      try {
        // 1. Try to load from cache first for instant load
        const cachedStats = await storage.get(cacheKey);
        if (cachedStats) {
          setStats(cachedStats);
          setLoading(false); // Show content immediately if we have cache
        }

        // 2. Fetch fresh data using authenticated cookie
        // The backend knows the active shop from the user session/state
        const response = await authenticatedFetch('http://localhost:3000/dashboard/stats');

        if (!response.ok) {
          if (response.status === 401) throw new Error('Unauthorized');
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // 3. Update state and cache
        setStats(data);
        await storage.set(cacheKey, data);

      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
        // We rely on the cached data if fetch fails
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [authenticatedFetch, user?.activeShopId]);

  return (
    <div className={`flex h-screen min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>

      <ChatBotButton />

      <div className="flex-1 flex flex-col min-h-0">

        <div className="flex-1 overflow-y-auto p-6">
          <DashboardStats isDarkMode={isDarkMode} />

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <div className="lg:col-span-2 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[400px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.totalRevenue')}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {stats?.revenue ? `$ ${stats.revenue.total.toLocaleString()}` : '$ 0.00'}
                      </span>
                      <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded">
                        +{stats?.revenue?.change}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-500 dark:text-gray-400">{t('dashboard.currentWeek')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                      <span className="text-gray-500 dark:text-gray-400">{t('dashboard.lastWeek')}</span>
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
                  <span className="font-semibold">{t('dashboard.sourceOfPurchases')}</span>
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

              {/* 72 Countries - Bar Chart REMOVED */}

              {/* Visitors - Area Chart REMOVED */}

              <div className="lg:col-span-2">
                <SalesHeatmap isDarkMode={isDarkMode} />
              </div>
              <div className="lg:col-span-1">
                <SalesHistory isDarkMode={isDarkMode} />
              </div>
            </div>
          )}

          {/* Ensure there's enough space at the bottom to prevent white space */}
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;