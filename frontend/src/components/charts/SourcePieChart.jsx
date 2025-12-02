// components/charts/SourcePieChart.jsx
import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const SourcePieChart = () => {
  const { isDarkMode } = useTheme();

  const sourceData = [
    { name: 'Social Media', value: 48, color: '#3B82F6' },
    { name: 'Direct Search', value: 38, color: '#10B981' },
    { name: 'Email Marketing', value: 24, color: '#8B5CF6' },
    { name: 'Referrals', value: 19, color: '#F59E0B' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            {payload[0].value}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
      <div className="relative h-full">
        <PieChart>
          <Pie
            data={sourceData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={renderCustomizedLabel}
            labelLine={false}
          >
            {sourceData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke={isDarkMode ? '#1F2937' : '#FFFFFF'}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '12px' }}
          />
        </PieChart>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            100%
          </div>
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            +8% Goal
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
};

export default SourcePieChart;