
import React from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const SalesHistory = ({ isDarkMode, data, currencySymbol = '$' }) => {
  const { t } = useLanguage();
  const salesHistory = data || [];

  const downloadSalesData = () => {
    if (salesHistory.length === 0) return;

    const headers = ['Customer Name', 'Amount', 'Date'];
    const csvContent = [
      headers.join(','),
      ...salesHistory.map(sale => `"${sale.name}","${sale.amount}","${new Date().toLocaleDateString()}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-lg p-6 border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between mb-6">
        <span className="font-semibold text-lg">{t ? t('dashboard.salesHistory') : 'Sales History'}</span>
        <div className="text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="7" r="1" />
            <circle cx="12" cy="17" r="1" />
          </svg>
        </div>
      </div>
      <div className="space-y-4">
        {salesHistory.length > 0 ? salesHistory.map((sale, idx) => (
          <div key={idx} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${sale.color || 'bg-blue-500'} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-gray-700`}>
                {sale.avatar}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-medium">{sale.name}</span>
                <span className="text-[10px] text-gray-500 font-mono tracking-tight uppercase">Confirmed</span>
              </div>
            </div>
            <span className="font-bold text-sm tabular-nums">{currencySymbol}{sale.amount.toLocaleString()}</span>
          </div>
        )) : (
          <div className="py-8 text-center text-gray-400 text-sm italic">
            No sales recorded yet
          </div>
        )}
      </div>
      <button
        onClick={downloadSalesData}
        disabled={salesHistory.length === 0}
        className={`w-full mt-6 py-2.5 rounded-lg border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${salesHistory.length === 0
          ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
          : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-gray-900 active:scale-95'
          }`}
      >
        <Download size={16} />
        {t ? t('dashboard.download') : 'DOWNLOAD CSV'}
      </button>
    </div>
  );
};

export default SalesHistory;