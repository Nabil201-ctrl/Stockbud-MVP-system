import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, Package, DollarSign, Loader2, RefreshCw, Trash2, Eye, X, Zap, Clock, Mail, CheckCircle, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { storage } from '../utils/db';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ReportsPage = () => {
    const { isDarkMode } = useTheme();
    const { authenticatedFetch, user } = useAuth();
    const { t } = useLanguage();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [instantGenerating, setInstantGenerating] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedType, setSelectedType] = useState('sales');
    const [previewReport, setPreviewReport] = useState(null);
    const [activeTab, setActiveTab] = useState('all');

    const currencySymbol = React.useMemo(() => {
        return user?.currency || '$';
    }, [user?.currency]);

    useEffect(() => {
        if (user?.activeShopId) {
            fetchReports();
            fetchStats();
        }
    }, [user?.activeShopId]);

    const fetchReports = async () => {
        try {
            const cacheKey = `reports_${user?.activeShopId || 'default'}`;
            const cachedReports = await storage.get(cacheKey);
            if (cachedReports) {
                setReports(cachedReports);
                setLoading(false);
            } else {
                setLoading(true);
            }

            const response = await authenticatedFetch(`${API_URL}/reports`);
            if (response.ok) {
                const data = await response.json();
                setReports(data);
                await storage.set(cacheKey, data);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const cacheKey = `report_stats_${user?.activeShopId || 'default'}`;
            const cachedStats = await storage.get(cacheKey);
            if (cachedStats) {
                setStats(cachedStats);
            }

            const response = await authenticatedFetch(`${API_URL}/reports/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
                await storage.set(cacheKey, data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };


    const handleGenerateReport = () => {
        setGenerating(true);

        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: 1000 * 100,
                metadata: {
                    userId: user.id,
                    type: 'report_payment'
                },
                callback: (transaction) => {
                    verifyAndGenerate(transaction.reference);
                },
                onClose: () => {
                    setGenerating(false);
                    alert('Payment cancelled. Report generation aborted.');
                }
            });
            handler.openIframe();
        } catch (error) {
            console.error("Paystack error:", error);
            setGenerating(false);
            alert("Could not load payment window.");
        }
    };


    const verifyWithRetry = async (reference, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await authenticatedFetch(`${API_URL}/payments/verify?reference=${reference}`);
                const data = await response.json();
                if (response.ok && data.success) {
                    return data;
                }
                return { success: false, message: data.message || 'Verification failed' };
            } catch (error) {
                console.warn(`[Payment] Verify attempt ${attempt}/${maxRetries} failed:`, error.message);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
                } else {
                    localStorage.setItem('pending_payment_ref', reference);
                    return { success: false, message: 'Network error. Your payment is safe — please refresh to retry.' };
                }
            }
        }
    };

    const verifyAndGenerate = async (reference) => {
        try {
            const result = await verifyWithRetry(reference);

            if (!result.success) {
                alert(result.message || 'Payment verification failed.');
                setGenerating(false);
                return;
            }

            const response = await authenticatedFetch(`${API_URL}/reports/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: selectedType })
            });

            if (response.ok) {
                await fetchReports();
            } else {
                alert('Failed to generate report');
            }
        } catch (error) {
            console.error('Report generation error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };


    const handleInstantReview = () => {
        setInstantGenerating(true);

        try {
            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: 2500 * 100,
                metadata: {
                    userId: user.id,
                    type: 'instant_review_payment'
                },
                callback: async (transaction) => {
                    try {
                        const result = await verifyWithRetry(transaction.reference);

                        if (!result.success) {
                            alert(result.message || 'Payment verification failed.');
                            setInstantGenerating(false);
                            return;
                        }

                        const response = await authenticatedFetch(`${API_URL}/reports/instant-review`, {
                            method: 'POST',
                        });

                        if (response.ok) {
                            await fetchReports();
                            alert(' Your instant review is being generated! It will be emailed to you shortly.');
                        } else {
                            alert('Failed to generate instant review.');
                        }
                    } catch (err) {
                        console.error('Instant review error:', err);
                        alert(`Error: ${err.message}`);
                    } finally {
                        setInstantGenerating(false);
                    }
                },
                onClose: () => {
                    setInstantGenerating(false);
                }
            });
            handler.openIframe();
        } catch (error) {
            console.error("Paystack error:", error);
            setInstantGenerating(false);
            alert("Could not load payment window.");
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm('Delete this report?')) return;

        try {
            const response = await authenticatedFetch(`${API_URL}/reports/${reportId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setReports(reports.filter(r => r.id !== reportId));
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };


    const handleDownloadDocx = async (report) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/reports/${report.id}/download`);

            if (!response.ok) {

                downloadReportFallback(report);
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `StockBud_${report.type.toUpperCase()}_${report.id.substr(0, 6)}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed, using fallback:', error);
            downloadReportFallback(report);
        }
    };


    const downloadReportFallback = (report) => {
        const title = report.title || 'Report';
        const date = formatDate(report.createdAt);
        const type = report.type.toUpperCase();

        const htmlContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <style>
                    body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #333; }
                    h1 { color: #2563eb; font-size: 24px; margin-bottom: 10px; }
                    h2 { color: #1e40af; font-size: 20px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
                    h3 { color: #374151; font-size: 16px; margin-top: 15px; font-weight: bold; }
                    p { margin-bottom: 10px; }
                    ul { margin-bottom: 10px; }
                    li { margin-bottom: 5px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                    .meta { color: #6b7280; font-size: 14px; margin-bottom: 5px; }
                    .stats-box { background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; margin-top: 30px; }
                    .stats-title { font-weight: bold; margin-bottom: 10px; font-size: 16px; border-bottom: 1px solid #9ca3af; padding-bottom: 5px; }
                    .stat-item { margin-bottom: 5px; font-family: 'Consolas', monospace; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${title}</h1>
                    <div class="meta">Generated on: ${date}</div>
                    <div class="meta">Report Type: ${type}</div>
                </div>
                <div class="content">
                    ${(report.data?.content || '')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                .replace(/\*(.*)\*/gim, '<i>$1</i>')
                .replace(/^\s*-\s+(.*$)/gim, '<ul><li>$1</li></ul>')
                .replace(/\n/g, '<br />')
            }
                </div>
                ${report.data?.stats ? `
                <div class="stats-box">
                    <div class="stats-title">Appendix: Key Metrics</div>
                    ${Object.entries(report.data.stats).map(([key, value]) =>
                `<div class="stat-item"><b>${key}:</b> ${value}</div>`
            ).join('')}
                </div>` : ''}
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title?.replace(/\s+/g, '_')}_${report.id.substr(0, 6)}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'sales':
            case 'weekly':
                return <TrendingUp className="text-green-500" size={20} />;
            case 'inventory':
                return <Package className="text-blue-500" size={20} />;
            case 'revenue':
            case 'monthly':
                return <DollarSign className="text-yellow-500" size={20} />;
            case 'welcome':
                return <Star className="text-orange-500" size={20} />;
            case 'instant':
                return <Zap className="text-purple-500" size={20} />;
            default:
                return <FileText className="text-gray-500" size={20} />;
        }
    };

    const getTypeBadge = (type) => {
        const badges = {
            sales: { label: 'Sales', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
            weekly: { label: 'Weekly', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
            inventory: { label: 'Inventory', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400' },
            revenue: { label: 'Revenue', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
            monthly: { label: 'Monthly', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
            welcome: { label: 'Welcome', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
            instant: { label: 'Instant', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
        };

        const badge = badges[type] || { label: type, bg: 'bg-gray-100', text: 'text-gray-700' };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };


    const filteredReports = activeTab === 'all'
        ? reports
        : reports.filter(r => {
            if (activeTab === 'weekly') return r.type === 'weekly' || r.type === 'sales';
            if (activeTab === 'monthly') return r.type === 'monthly' || r.type === 'revenue';
            if (activeTab === 'instant') return r.type === 'instant' || r.type === 'welcome';
            return true;
        });

    const renderPreviewContent = (report) => {
        if (!report || !report.data) return null;

        if (report.data.content) {
            return (
                <div className={`max-w-4xl mx-auto`}>
                    <div className={`shadow-lg rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className={`h-1.5 sm:h-2 ${report.type === 'monthly' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                            report.type === 'instant' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                report.type === 'welcome' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                    isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                            }`} />

                        <div className="p-4 sm:p-8 md:p-12">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6 mb-6 sm:mb-8">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            {getTypeBadge(report.type)}
                                            {report.emailSent && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                    <Mail size={10} />
                                                    Emailed
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold dark:text-white mb-1 sm:mb-2">{report.title}</h1>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Generated on {formatDate(report.createdAt)}</p>
                                    </div>
                                    <div className={`hidden sm:block p-3 rounded-lg flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        {getTypeIcon(report.type)}
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-lg sm:prose-xl dark:prose-invert max-w-none">
                                <MarkdownRenderer content={report.data.content} isDarkMode={isDarkMode} />
                            </div>

                            {report.data.stats && (
                                <div className={`mt-8 sm:mt-12 p-4 sm:p-6 rounded-lg ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                    <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">{t('reports.keyMetrics')}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                                        {Object.entries(report.data.stats).map(([key, value]) => (
                                            <div key={key}>
                                                <p className="text-[10px] sm:text-xs text-gray-400 uppercase mb-0.5 sm:mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-sm sm:text-lg font-mono font-medium dark:text-white">
                                                    {typeof value === 'number' ?
                                                        (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('margin') ?
                                                            `$${value.toLocaleString()}` : value.toLocaleString())
                                                        : String(value)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-4">
                    This is a legacy report format.
                </div>
                <pre className={`p-4 rounded-lg text-sm overflow-auto ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                    {JSON.stringify(report.data, null, 2)}
                </pre>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            { }
            <div className="space-y-3" id="reports-header">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold dark:text-white">{t('reports.title')}</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Weekly reports every Monday · Monthly reviews on the 1st · Instant reviews on demand
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className={`flex-1 sm:flex-none px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                    >
                        <option value="sales">{t('reports.salesSummary')}</option>
                        <option value="inventory">{t('reports.inventoryReport')}</option>
                        <option value="revenue">{t('reports.revenueAnalysis')}</option>
                    </select>
                    <button
                        onClick={handleGenerateReport}
                        disabled={generating}
                        className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
                    >
                        {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        <span className="hidden sm:inline">{t('reports.generate')}</span>
                        <span className="sm:hidden">Generate</span>
                    </button>
                </div>
            </div>

            { }
            <div className={`rounded-xl border-2 border-dashed p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isDarkMode ? 'border-purple-700 bg-purple-900/10' : 'border-purple-300 bg-purple-50'
                }`}>
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                        <Zap size={24} className="text-purple-600 dark:text-purple-400 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base sm:text-lg dark:text-white">Instant System Review</h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Get a comprehensive, real-time analysis of your entire store. Includes revenue deep dive, product matrix, growth strategy & more.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleInstantReview}
                    disabled={instantGenerating}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap shadow-lg shadow-purple-500/25"
                >
                    {instantGenerating ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Zap size={18} />
                    )}
                    Get Instant Review — ₦2,500
                </button>
            </div>

            { }
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" id="reports-stats-grid">
                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.totalRevenue')}</p>
                                <p className="text-xl font-bold dark:text-white">{currencySymbol} {stats.totalRevenue?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Package className="text-blue-600 dark:text-blue-400" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.topProducts')}</p>
                                <p className="text-xl font-bold dark:text-white">{stats.productCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                <DollarSign className="text-yellow-600 dark:text-yellow-400" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.recentOrders')}</p>
                                <p className="text-xl font-bold dark:text-white">{stats.orderCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('reports.lostRevenue')}</p>
                                <p className="text-xl font-bold dark:text-white">${stats.lostRevenue?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            { }
            <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'monthly', label: 'Monthly' },
                    { id: 'instant', label: 'Instant' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : isDarkMode
                                ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            { }
            <div className={`rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`} id="reports-list">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold dark:text-white">{t('reports.generated')}</h2>
                    <button
                        onClick={fetchReports}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                        <h3 className="font-semibold text-lg dark:text-white mb-2">{t('reports.noReports')}</h3>
                        <p className="text-gray-500 dark:text-gray-400">{t('reports.firstReport')}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredReports.map((report) => (
                            <div
                                key={report.id}
                                className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                            >
                                { }
                                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                                    { }
                                    <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        {getTypeIcon(report.type)}
                                    </div>

                                    { }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                            <h3 className="font-medium dark:text-white text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">{report.title}</h3>
                                            {getTypeBadge(report.type)}
                                            {report.emailSent && (
                                                <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title="Emailed to your inbox">
                                                    <CheckCircle size={12} />
                                                    Emailed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{report.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-400">{formatDate(report.createdAt)}</span>
                                            {report.emailSent && (
                                                <span className="sm:hidden flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                    <Mail size={10} />
                                                    Sent
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    { }
                                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                                        {report.status === 'generating' ? (
                                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-sm">
                                                <RefreshCw size={14} className="animate-spin" />
                                                Generating...
                                            </span>
                                        ) : report.status === 'failed' ? (
                                            <span className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                                                Failed
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setPreviewReport(report)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                                                >
                                                    <Eye size={14} />
                                                    {t('reports.preview')}
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadDocx(report)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                >
                                                    <Download size={14} />
                                                    .docx
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDeleteReport(report.id)}
                                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                { }
                                <div className="flex sm:hidden items-center gap-2 mt-2.5 ml-10">
                                    {report.status === 'generating' ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-xs">
                                            <RefreshCw size={12} className="animate-spin" />
                                            Generating...
                                        </span>
                                    ) : report.status === 'failed' ? (
                                        <span className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs">
                                            Failed
                                        </span>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setPreviewReport(report)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium"
                                            >
                                                <Eye size={12} />
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => handleDownloadDocx(report)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium"
                                            >
                                                <Download size={12} />
                                                .docx
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleDeleteReport(report.id)}
                                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors ml-auto"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            { }
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start gap-3">
                        <Clock className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="font-medium text-blue-800 dark:text-blue-300">Weekly Reports</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                Sent automatically every Monday at 8:00 AM with a DOCX attachment to your email.
                            </p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-start gap-3">
                        <Calendar className="text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="font-medium text-emerald-800 dark:text-emerald-300">Monthly Reviews</h4>
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                                Comprehensive strategic review on the 1st of every month. Aggregates all weekly data.
                            </p>
                        </div>
                    </div>
                </div>
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                    <div className="flex items-start gap-3">
                        <Zap className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                            <h4 className="font-medium text-purple-800 dark:text-purple-300">Instant Reviews</h4>
                            <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                                Premium on-demand review with 10-point analysis. Delivered to your email instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            { }
            {previewReport && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full sm:max-w-5xl xl:max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        { }
                        <div className={`flex items-center justify-between p-3 sm:p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    {getTypeIcon(previewReport.type)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                        <h3 className="font-semibold dark:text-white text-sm sm:text-base truncate">{previewReport.title}</h3>
                                        {getTypeBadge(previewReport.type)}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(previewReport.createdAt)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewReport(null)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        { }
                        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                            {renderPreviewContent(previewReport)}
                        </div>

                        { }
                        <div className={`flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <button
                                onClick={() => setPreviewReport(null)}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                {t('reports.close')}
                            </button>
                            <button
                                onClick={() => {
                                    handleDownloadDocx(previewReport);
                                    setPreviewReport(null);
                                }}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Download .docx</span>
                                <span className="sm:hidden">.docx</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
