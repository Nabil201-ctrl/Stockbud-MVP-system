// components/charts/RevenueChart.jsx
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const RevenueChart = ({ data, currencySymbol = '$' }) => {
  const { isDarkMode } = useTheme();

  // Use passed data or empty array if not provided
  const revenueData = data && data.length > 0 ? data : [
    { date: '', revenue: 0, target: 0 }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {currencySymbol}{entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
      <LineChart
        data={revenueData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDarkMode ? '#374151' : '#E5E7EB'}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={12}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={12}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#3B82F6"
          strokeWidth={3}
          dot={{ r: 0 }}
          activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke="#10B981"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 0 }}
          activeDot={{ r: 6, fill: '#10B981', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;