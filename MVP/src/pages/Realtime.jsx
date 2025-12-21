// components/pages/Realtime.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Users, Eye, MousePointer, Globe, Cpu, Activity, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Realtime = () => {
  const { isDarkMode } = useTheme();
  const [activeUsers, setActiveUsers] = useState(1564);
  const [pageViews, setPageViews] = useState(8920);
  const [clicks, setClicks] = useState(3245);
  const [conversionRate, setConversionRate] = useState(3.2);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 10 - 5));
      setPageViews(prev => prev + Math.floor(Math.random() * 50));
      setClicks(prev => prev + Math.floor(Math.random() * 20));
      setConversionRate(prev => parseFloat((prev + (Math.random() * 0.2 - 0.1)).toFixed(1)));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const events = [
    { id: 1, user: 'John Doe', action: 'Purchased Product', amount: '$49.99', time: 'Just now', type: 'purchase' },
    { id: 2, user: 'Jane Smith', action: 'Added to Cart', item: 'Premium Plan', time: '30s ago', type: 'cart' },
    { id: 3, user: 'Alex Johnson', action: 'Signed Up', plan: 'Free Trial', time: '1m ago', type: 'signup' },
    { id: 4, user: 'Sarah Wilson', action: 'Page View', page: '/dashboard', time: '2m ago', type: 'view' },
    { id: 5, user: 'Mike Brown', action: 'Clicked Ad', source: 'Google Ads', time: '3m ago', type: 'click' }
  ];

  const countries = [
    { name: 'United States', users: 420, percentage: 27, flag: '🇺🇸' },
    { name: 'Germany', users: 280, percentage: 18, flag: '🇩🇪' },
    { name: 'United Kingdom', users: 195, percentage: 12, flag: '🇬🇧' },
    { name: 'India', users: 168, percentage: 11, flag: '🇮🇳' },
    { name: 'Canada', users: 142, percentage: 9, flag: '🇨🇦' }
  ];

  const devices = [
    { type: 'Desktop', percentage: 62, color: 'bg-blue-500' },
    { type: 'Mobile', percentage: 32, color: 'bg-green-500' },
    { type: 'Tablet', percentage: 6, color: 'bg-purple-500' }
  ];

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Realtime Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Live tracking of user activity and interactions
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">LIVE</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: <Users size={24} />, label: 'Active Users', value: activeUsers.toLocaleString(), change: '+2.1%', color: 'bg-blue-500' },
            { icon: <Eye size={24} />, label: 'Page Views', value: pageViews.toLocaleString(), change: '+4.7%', color: 'bg-green-500' },
            { icon: <MousePointer size={24} />, label: 'Clicks', value: clicks.toLocaleString(), change: '+3.2%', color: 'bg-purple-500' },
            { icon: <TrendingUp size={24} />, label: 'Conversion Rate', value: `${conversionRate}%`, change: '+0.8%', color: 'bg-orange-500' }
          ].map((stat, idx) => (
            <div key={idx} className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <div className={stat.color.replace('bg-', 'text-')}>
                    {stat.icon}
                  </div>
                </div>
                <span className="text-green-600 dark:text-green-400 font-medium">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Live Events */}
          <div className={`lg:col-span-2 rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Live Activity Stream</h2>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span className="text-sm">Updates every 3s</span>
              </div>
            </div>

            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className={`flex items-center justify-between p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.type === 'purchase' ? 'bg-green-100 dark:bg-green-900/30' :
                      event.type === 'cart' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      event.type === 'signup' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {event.type === 'purchase' && <span className="text-green-600 dark:text-green-400">💰</span>}
                      {event.type === 'cart' && <span className="text-blue-600 dark:text-blue-400">🛒</span>}
                      {event.type === 'signup' && <span className="text-purple-600 dark:text-purple-400">👤</span>}
                      {event.type === 'view' && <Eye size={18} className="text-gray-600 dark:text-gray-400" />}
                      {event.type === 'click' && <MousePointer size={18} className="text-gray-600 dark:text-gray-400" />}
                    </div>
                    <div>
                      <div className="font-medium">{event.user}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {event.action} {event.item && `• ${event.item}`} {event.amount && `• ${event.amount}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{event.time}</div>
                </div>
              ))}
            </div>

            {/* Live Map Simulation */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Live User Locations</h3>
              <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} relative h-64 overflow-hidden`}>
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 bg-blue-500 rounded-full animate-pulse"
                    style={{
                      left: `${Math.random() * 90}%`,
                      top: `${Math.random() * 90}%`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  ></div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Globe size={48} className="text-gray-400 opacity-30" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Analytics */}
          <div className="space-y-6">
            {/* Geographic Distribution */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">User Distribution</h3>
              <div className="space-y-4">
                {countries.map((country) => (
                  <div key={country.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{country.flag}</span>
                      <span className="font-medium">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${country.percentage}%` }}
                        ></div>
                      </div>
                      <span className="font-medium w-10 text-right">{country.users}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">Device Usage</h3>
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.type} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{device.type}</span>
                      <span>{device.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`${device.color} h-2 rounded-full`}
                        style={{ width: `${device.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'API Response Time', value: '142ms', status: 'good' },
                  { label: 'Server Load', value: '34%', status: 'good' },
                  { label: 'Database Queries', value: '2.4k/s', status: 'warning' },
                  { label: 'Cache Hit Rate', value: '92%', status: 'good' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'good' ? 'bg-green-500' :
                        item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span>{item.label}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-yellow-500" />
                <h3 className="text-lg font-semibold">Recent Alerts</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                  High traffic spike detected (3,200+ concurrent users)
                </div>
                <div className="text-sm p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                  System update scheduled for 2:00 AM UTC
                </div>
                <div className="text-sm p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                  Database backup completed successfully
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Realtime;