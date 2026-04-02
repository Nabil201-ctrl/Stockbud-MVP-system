
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { storage } from '../utils/db';
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
import { RefreshCw, TrendingUp } from 'lucide-react';

const RevenueChart = lazy(() => import('../components/charts/RevenueChart'));
const SourcePieChart = lazy(() => import('../components/charts/SourcePieChart'));

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(17);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useLanguage();


  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetType, setTargetType] = useState('monthly');
  const [targetValue, setTargetValue] = useState(0);


  const [stats, setStats] = useState(null);
  const [filteredStats, setFilteredStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'web', 'pos', 'instagram'
  const [dateRange, setDateRange] = useState('month'); // '7days', 'month', 'year'
  const { authenticatedFetch, user } = useAuth();


  const userCurrency = user?.currency || 'USD';
  const getCurrencySymbol = (currency) => {
    try {
      return (0).toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();
    } catch (e) {
      return '$';
    }
  };
  const currencySymbol = getCurrencySymbol(userCurrency);

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
      const response = await authenticatedFetch(`/api/dashboard/stats?range=${dateRange}`);

      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (data && data.targetDetails) {
        setTargetType(data.targetDetails.type);
        setTargetValue(data.targetDetails.value);
      }


      setStats(data);
      await storage.set(cacheKey, data);

    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [authenticatedFetch, user?.activeShopId, dateRange]);

  useEffect(() => {
    if (!stats) return;

    let history = [...(stats.salesHistory || [])];

    // Handle Filtering (Mock logic based on names or random for now as source isn't in history item yet)
    if (filterBy !== 'all') {
      // In a real app, each sale item would have a source
      // For now, let's just filter a subset to show it works
      history = history.filter((_, idx) => filterBy === 'web' ? idx % 2 === 0 : idx % 2 !== 0);
    }

    // Handle Sorting
    if (sortBy === 'highest') {
      history.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'lowest') {
      history.sort((a, b) => a.amount - b.amount);
    } else if (sortBy === 'oldest') {
      history.reverse();
    }

    setFilteredStats({
      ...stats,
      salesHistory: history
    });

  }, [stats, sortBy, filterBy]);

  const saveTarget = async () => {
    try {
      const response = await authenticatedFetch('/api/dashboard/target', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: targetType, value: targetValue }),
      });

      if (response.ok) {
        setIsTargetModalOpen(false);


        if (user?.activeShopId) {
          setLoading(true);
          const fresh = await authenticatedFetch('/api/dashboard/stats');
          if (fresh.ok) {
            const freshData = await fresh.json();
            setStats(freshData);
            await storage.set(`dashboard_stats_${user.activeShopId}`, freshData);
          }
          setLoading(false);
        }
      } else {
        console.error('Failed to save target.');
      }
    } catch (error) {
      console.error('Network error saving target', error);
    }
  };

  return (
    <div className={`flex h-screen min-h-screen ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>

      <ChatBotButton />

      <div className="flex-1 flex flex-col min-h-0">

        {/* Dashboard Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <button
              onClick={() => fetchStats()}
              className={`p-2 rounded-lg transition-all ${loading ? 'animate-spin text-blue-500' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
              title="Refresh Stats"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTargetModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <TrendingUp size={16} />
              {t('dashboard.setTarget')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div id="dashboard-stats">
            <DashboardStats
              isDarkMode={isDarkMode}
              onSort={setSortBy}
              onFilter={setFilterBy}
              onDateRange={setDateRange}
              currentSort={sortBy}
              currentFilter={filterBy}
              currentDateRange={dateRange}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div id="revenue-chart" className="lg:col-span-2 rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[400px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('dashboard.totalRevenue')}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {stats?.revenue ? `${currencySymbol} ${stats.revenue.total.toLocaleString()}` : `${currencySymbol} 0.00`}
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
                    <RevenueChart data={stats?.revenue?.chartData || []} currencySymbol={currencySymbol} />
                  </Suspense>
                </div>
              </div>

              { }
              <div id="source-chart" className="rounded-lg p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[400px]">
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
                    <SourcePieChart data={stats?.source || []} />
                  </Suspense>
                </div>
              </div>

              { }

              { }

              <div className="lg:col-span-2">
                <SalesHeatmap isDarkMode={isDarkMode} data={stats?.heatmap || []} />
              </div>
              <div className="lg:col-span-1">
                <SalesHistory
                  isDarkMode={isDarkMode}
                  currencySymbol={currencySymbol}
                  data={filteredStats?.salesHistory || []}
                />
              </div>
            </div>
          )}

          { }
          <div className="h-6"></div>
        </div>
      </div>

      { }
      {isTargetModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-xl p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-2xl transition-all`}>
            <h2 className="text-xl font-bold mb-4">Set Goal Target</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Target Timeframe</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-300 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 opacity-80">Target Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={targetValue || ''}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  placeholder="e.g. 5000"
                  className={`w-full px-4 py-2.5 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white' : 'bg-gray-50 border-gray-300 focus:border-blue-500'} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  min="0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={saveTarget}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;