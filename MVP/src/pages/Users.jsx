import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserCheck, UserX, TrendingUp, Calendar, Filter, Search, MoreVertical, Mail, Phone, Globe, Award, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const UsersPage = () => {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');

  const [userData, setUserData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    new: 0,
    inactive: 0,
    growth: 0,
    totalSignIns: 0,
    signInsToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:3000/users');
        const data = await response.json();

        const usersList = Array.isArray(data) ? data : (data.users || []);
        setUserData(usersList);

        const total = usersList.length;
        const today = new Date().toISOString().split('T')[0];
        const newToday = usersList.filter(u => u.createdAt?.startsWith(today)).length;
        const totalSignIns = usersList.reduce((sum, u) => sum + (u.signInCount || 0), 0);
        const signInsToday = usersList.reduce((sum, u) => {
          return sum + (u.loginDates ? u.loginDates.filter(d => d === today).length : 0);
        }, 0);

        setUserStats({
          total,
          active: Math.max(0, total - 2), 
          new: newToday,
          inactive: Math.min(2, total),
          growth: 12.4,
          totalSignIns,
          signInsToday
        });

        const chartMap = {};
        usersList.forEach(user => {
          if (user.createdAt) {
            const date = user.createdAt.split('T')[0];
            if (date !== 'Unknown') {
              if (!chartMap[date]) chartMap[date] = { date, signups: 0, signins: 0 };
              chartMap[date].signups += 1;
            }
          }
          if (user.loginDates && Array.isArray(user.loginDates)) {
            user.loginDates.forEach(date => {
              if (!chartMap[date]) chartMap[date] = { date, signups: 0, signins: 0 };
              chartMap[date].signins += 1;
            });
          }
        });
        const cData = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));
        setChartData(cData);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const planDistribution = [
    { plan: 'Free', users: 4200, color: 'bg-gray-400' },
    { plan: 'Basic', users: 3800, color: 'bg-blue-400' },
    { plan: 'Pro', users: 3200, color: 'bg-purple-400' },
    { plan: 'Premium', users: 2800, color: 'bg-green-400' },
    { plan: 'Enterprise', users: 1284, color: 'bg-orange-400' }
  ];

  if (loading) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8" id="users-header">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('users.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('users.subtitle')}
            </p>
          </div>
          <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
            <UserPlus size={20} />
            {t('users.addNew')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" id="users-stats">
          {[
            { icon: <Users size={24} />, label: t('users.totalUsers'), value: (userStats.total || 0).toLocaleString(), change: `+${userStats.growth || 0}%`, color: 'bg-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: <UserPlus size={24} />, label: t('users.newUsers'), value: (userStats.new || 0).toLocaleString(), change: '+15.3%', color: 'bg-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: <Zap size={24} />, label: 'Total Sign-ins', value: (userStats.totalSignIns || 0).toLocaleString(), change: '+8.2%', color: 'bg-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
            { icon: <UserCheck size={24} />, label: 'Sign-ins Today', value: (userStats.signInsToday || 0).toLocaleString(), change: '+5.1%', color: 'bg-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' }
          ].map((stat, idx) => (
            <div key={idx} className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <div className={stat.color.replace('bg-', 'text-')}>
                    {stat.icon}
                  </div>
                </div>
                <span className={`font-medium ${stat.change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {}
          <div className={`lg:col-span-2 rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`} id="users-table">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">{t('users.listTitle')}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg w-full sm:w-auto ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Search size={18} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder={t('users.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`bg-transparent outline-none text-sm w-full sm:w-48 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  />
                </div>
                <button className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full sm:w-auto ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  <Filter size={18} />
                  <span>{t('users.filter')}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3 px-4 font-medium">{t('users.user')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('users.status')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('users.plan')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('users.location')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('users.lastActive')}</th>
                    <th className="text-left py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {userData.map((user) => (
                    <tr key={user.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center font-medium`}>
                            {user.avatar}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.plan === 'Premium' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                          user.plan === 'Pro' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            user.plan === 'Enterprise' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Globe size={14} className="text-gray-400" />
                          <span>{user.location}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{user.lastActive}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing 6 of {userStats.total.toLocaleString()} users
              </div>
              <div className="flex gap-2">
                <button className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  Previous
                </button>
                <button className={`px-3 py-2 rounded-lg bg-blue-600 text-white`}>
                  1
                </button>
                <button className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  2
                </button>
                <button className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  3
                </button>
                <button className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  Next
                </button>
              </div>
            </div>
          </div>

          {}
          <div className="space-y-6">
            {}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('users.planDistribution')}</h3>
              <div className="space-y-4">
                {planDistribution.map((plan) => (
                  <div key={plan.plan} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{plan.plan}</span>
                      <span>{plan.users.toLocaleString()} users</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`${plan.color} h-2 rounded-full`}
                        style={{ width: `${(plan.users / userStats.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold">User Signups & Sign-ins Trend</h3>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} stroke={isDarkMode ? '#9ca3af' : '#6b7280'} tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        color: isDarkMode ? '#f3f4f6' : '#111827'
                      }}
                    />
                    <Bar dataKey="signups" name="Signups" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="signins" name="Sign-Ins" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('users.quickActions')}</h3>
              <div className="space-y-3">
                {[
                  { icon: <Mail size={18} />, label: 'Send Email Campaign', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
                  { icon: <UserPlus size={18} />, label: 'Import Users', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
                  { icon: <Award size={18} />, label: 'Assign Roles', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
                  { icon: <Phone size={18} />, label: 'Contact Support', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' }
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg hover:opacity-90 transition-opacity ${action.color}`}
                  >
                    {action.icon}
                    <span className="font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('users.userSegments')}</h3>
              <div className="space-y-3">
                {[
                  { label: 'Power Users', count: 2450, color: 'bg-green-500' },
                  { label: 'Frequent Buyers', count: 1820, color: 'bg-blue-500' },
                  { label: 'New Users', count: 1420, color: 'bg-purple-500' },
                  { label: 'At Risk', count: 620, color: 'bg-red-500' }
                ].map((segment, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${segment.color}`}></div>
                      <span>{segment.label}</span>
                    </div>
                    <span className="font-medium">{segment.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;