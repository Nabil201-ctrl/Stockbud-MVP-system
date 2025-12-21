// components/layout/ChartLoading.jsx
import React from 'react';

const ChartLoading = ({ type = 'default' }) => {
  const loaders = {
    line: (
      <div className="h-full w-full flex flex-col">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
        <div className="flex-1 flex items-end space-x-1">
          {[30, 60, 45, 80, 50, 90, 65].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t animate-pulse"
              style={{ 
                height: `${height}%`,
                animationDelay: `${i * 0.1}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    ),
    pie: (
      <div className="h-full w-full flex items-center justify-center">
        <div className="relative">
          <div className="w-40 h-40 rounded-full border-8 border-gray-200 dark:border-gray-700 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    ),
    default: (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
            Loading chart...
          </div>
        </div>
      </div>
    )
  };

  return loaders[type] || loaders.default;
};

export default ChartLoading;