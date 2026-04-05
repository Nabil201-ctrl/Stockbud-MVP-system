
import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const SourcePieChart = ({ data }) => {
  const { isDarkMode } = useTheme();

  const sourceData = data && data.length > 0 ? data : [
    { name: 'No Data', value: 100, color: '#E5E7EB' }
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

  const totalValue = sourceData.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const sortedData = [...sourceData].sort((a, b) => b.value - a.value);
  const mainSource = sortedData.length > 0 && sortedData[0].name !== 'No Data'
    ? sortedData[0]
    : { name: 'Direct', value: 100 };

  const CustomLegend = () => {
    return (
      <div className="flex flex-col gap-5 justify-center h-full sm:ml-8">
        {sortedData.map((entry, index) => (
          <div key={index} className="flex items-start gap-3 w-full group">
            <div
              className="mt-1.5 w-2 h-2 rounded-full shadow-sm flex-shrink-0 transition-transform group-hover:scale-150"
              style={{ backgroundColor: entry.color }}
            ></div>
            <div className="flex flex-col gap-0.5">
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-blue-500 transition-colors truncate max-w-[100px]`}>
                {entry.name}
              </span>
              <span className={`text-xl font-black tabular-nums leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tighter`}>
                {entry.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between h-full w-full">
      <div className="relative h-64 w-[55%]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={5}
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
              stroke="none"
              cornerRadius={4}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="outline-none cursor-pointer hover:opacity-90 transition-all duration-300 transform"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className={`text-3xl sm:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} leading-none tracking-tighter`}>
            {mainSource.value}%
          </div>
          <div className={`text-[8px] sm:text-[10px] uppercase font-black tracking-[0.2em] mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {mainSource.name}
          </div>
        </div>
      </div>
      <div className="w-[45%] pl-4 border-l border-gray-100 dark:border-gray-700/50">
        <CustomLegend />
      </div>
    </div>
  );
};

export default SourcePieChart;