// components/charts/VisitorAreaChart.jsx
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const VisitorAreaChart = () => {
  const { isDarkMode } = useTheme();

  const visitorData = [
    { time: '9 AM', visitors: 400 },
    { time: '10 AM', visitors: 600 },
    { time: '11 AM', visitors: 800 },
    { time: '12 PM', visitors: 1200 },
    { time: '1 PM', visitors: 900 },
    { time: '2 PM', visitors: 1100 },
    { time: '3 PM', visitors: 1300 },
    { time: '4 PM', visitors: 1600 },
    { time: '5 PM', visitors: 1400 },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <p className="font-medium">{payload[0].payload.time}</p>
          <p className="text-sm" style={{ color: '#3B82F6' }}>
            Visitors: {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={192}>
      <AreaChart
        data={visitorData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={isDarkMode ? '#374151' : '#E5E7EB'} 
          vertical={false}
        />
        <XAxis 
          dataKey="time" 
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={11}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={11}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="visitors" 
          name="Visitors" 
          stroke="#3B82F6" 
          strokeWidth={3}
          fill="url(#visitorGradient)" 
          fillOpacity={1}
          dot={{ r: 0 }}
          activeDot={{ 
            r: 6, 
            fill: '#3B82F6', 
            stroke: isDarkMode ? '#1F2937' : '#FFFFFF', 
            strokeWidth: 2 
          }}
          animationDuration={1500}
          animationBegin={0}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default VisitorAreaChart;