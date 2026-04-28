
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CountryBarChart = () => {
  const { isDarkMode } = useTheme();

  const countryData = [
    { name: 'India', value: 2200, fill: '#3B82F6' },
    { name: 'USA', value: 1790, fill: '#3B82F6' },
    { name: 'Germany', value: 1200, fill: '#F59E0B' },
    { name: 'Indonesia', value: 1493, fill: '#F59E0B' },
    { name: 'Bangladesh', value: 975, fill: '#3B82F6' },
    { name: 'Canada', value: 531, fill: '#3B82F6' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Visitors: {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomYAxisTick = ({ x, y, payload }) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={-10} 
          y={0} 
          dy={4} 
          textAnchor="end" 
          fill={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={12}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const CustomXAxisTick = ({ x, y, payload }) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="middle" 
          fill={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={11}
          transform={`rotate(-45, ${x}, ${y})`}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
      <BarChart
        data={countryData}
        margin={{ top: 20, right: 10, left: 10, bottom: 40 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={isDarkMode ? '#374151' : '#E5E7EB'} 
          vertical={false}
        />
        <XAxis 
          dataKey="name" 
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          axisLine={false}
          tickLine={false}
          tick={<CustomXAxisTick />}
        />
        <YAxis 
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          axisLine={false}
          tickLine={false}
          tick={<CustomYAxisTick />}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="value" 
          name="Visitors" 
          radius={[8, 8, 0, 0]}
          animationDuration={1500}
          animationBegin={0}
        >
          {countryData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.fill}
              stroke={isDarkMode ? '#1F2937' : '#FFFFFF'}
              strokeWidth={2}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CountryBarChart;