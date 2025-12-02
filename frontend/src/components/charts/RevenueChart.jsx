// components/charts/RevenueChart.jsx
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const RevenueChart = () => {
  const { isDarkMode } = useTheme();

  const revenueData = [
    { date: 'DEC 1', revenue: 25600, target: 22000 },
    { date: 'DEC 2', revenue: 31200, target: 25000 },
    { date: 'DEC 3', revenue: 29800, target: 28000 },
    { date: 'DEC 4', revenue: 38000, target: 32000 },
    { date: 'DEC 5', revenue: 35200, target: 35000 },
    { date: 'DEC 6', revenue: 42000, target: 40000 },
    { date: 'DEC 7', revenue: 49800, target: 45000 },
    { date: 'DEC 8', revenue: 56000, target: 50000 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString()}
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
          tickFormatter={(value) => `$${value/1000}k`}
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