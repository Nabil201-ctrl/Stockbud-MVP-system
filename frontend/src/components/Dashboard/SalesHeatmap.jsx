// components/Dashboard/SalesHeatmap.jsx
import React from 'react';

const SalesHeatmap = ({ isDarkMode }) => {
  const heatmapData = [
    [0, 0, 1, 1, 2, 1, 2],
    [2, 2, 1, 2, 2, 3, 2],
    [1, 2, 2, 1, 2, 2, 3],
    [0, 1, 1, 2, 1, 2, 1],
    [1, 0, 1, 1, 2, 1, 0]
  ];

  return (
    <div className={`rounded-lg p-6 border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">Sales per week</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {heatmapData.map((row, rowIdx) => (
          <React.Fragment key={rowIdx}>
            {row.map((cell, cellIdx) => (
              <div
                key={cellIdx}
                className={`aspect-square rounded ${
                  cell === 0
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : cell === 1
                    ? 'bg-blue-200 dark:bg-blue-900'
                    : cell === 2
                    ? 'bg-blue-400 dark:bg-blue-700'
                    : 'bg-blue-600 dark:bg-blue-600'
                }`}
              ></div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>MON</span>
        <span>TUE</span>
        <span>WED</span>
        <span>THU</span>
        <span>FRI</span>
        <span>SAT</span>
        <span>SUN</span>
      </div>
      <div className="flex justify-between items-center mt-4 text-xs text-gray-400">
        <span>0 - 300</span>
        <span>300 - 600</span>
        <span>600 - 900</span>
        <span>900 - 1200</span>
        <span>1200 - 1500</span>
      </div>
    </div>
  );
};

export default SalesHeatmap;