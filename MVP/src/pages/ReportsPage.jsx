import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, Package, DollarSign, Loader2, RefreshCw, Trash2, Eye, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';

const ReportsPage = () => {
    const { isDarkMode } = useTheme();
    const { authenticatedFetch, user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedType, setSelectedType] = useState('sales');
    const [previewReport, setPreviewReport] = useState(null);

    useEffect(() => {
        fetchReports();
        fetchStats();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:3000/reports');
            if (response.ok) {
                const data = await response.json();
                setReports(data);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        }
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:3000/reports/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleGenerateReport = () => {
        setGenerating(true);

        const paystack = new PaystackPop();
        paystack.newTransaction({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            email: user.email,
            amount: 1000 * 100, // 1000 NGN in kobo
            metadata: {
                userId: user.id,
                type: 'report_payment'
            },
            onSuccess: (transaction) => {
                verifyAndGenerate(transaction.reference);
            },
            onCancel: () => {
                setGenerating(false);
                alert('Payment cancelled. Report generation aborted.');
            }
        });
    };

    const verifyAndGenerate = async (reference) => {
        try {
            // Verify payment first
            const verifyRes = await authenticatedFetch(`http://localhost:3000/payments/verify?reference=${reference}`);
            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
                alert('Payment verification failed.');
                setGenerating(false);
                return;
            }

            // If payment successful, generate report
            const response = await authenticatedFetch('http://localhost:3000/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: selectedType })
            });

            if (response.ok) {
                // Refresh reports list
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

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm('Delete this report?')) return;

        try {
            const response = await authenticatedFetch(`http://localhost:3000/reports/${reportId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setReports(reports.filter(r => r.id !== reportId));
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'sales':
                return <TrendingUp className="text-green-500" size={20} />;
            case 'inventory':
                return <Package className="text-blue-500" size={20} />;
            case 'revenue':
                return <DollarSign className="text-yellow-500" size={20} />;
            default:
                return <FileText className="text-gray-500" size={20} />;
        }
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

    const downloadReport = (report) => {
        const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.type}-report-${report.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderPreviewContent = (report) => {
        if (!report || !report.data) return null;

        // Check if it's an AI-generated document report
        if (report.data.content) {
            return (
                <div className={`max-w-4xl mx-auto p-4`}>
                    <div className={`shadow-lg rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {/* Document Header Bar */}
                        <div className={`h-2 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`} />

                        <div className="p-8 md:p-12">
                            {/* Document Title Section */}
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-3xl font-bold dark:text-white mb-2">{report.title}</h1>
                                        <p className="text-gray-500 dark:text-gray-400">Generated on {formatDate(report.createdAt)}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        {getTypeIcon(report.type)}
                                    </div>
                                </div>
                            </div>

                            {/* Markdown Content */}
                            <div className="prose prose-lg dark:prose-invert max-w-none">
                                <MarkdownRenderer content={report.data.content} isDarkMode={isDarkMode} />
                            </div>

                            {/* Key Stats Appendix (Optional, if we want to show raw numbers at the bottom) */}
                            {report.data.stats && (
                                <div className={`mt-12 p-6 rounded-lg ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Key Metrics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {Object.entries(report.data.stats).map(([key, value]) => (
                                            <div key={key}>
                                                <p className="text-xs text-gray-400 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-lg font-mono font-medium dark:text-white">
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

        // Fallback for legacy reports
        const data = report.data;
        // ... (Using simpler fallback for old data to save space if needed, or we can keep the switch statement if user has old data they care about. The user asked for "proper reports", so converting the view is key. I'll include a simple fallback.)

        return (
            <div className="p-4">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-4">
                    This is a legacy report format. New reports will be generated as documents.
                </div>
                <pre className={`p-4 rounded-lg text-sm overflow-auto ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-2xl font-bold dark:text-white">Reports</h1>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                    >
                        <option value="sales">Sales Summary</option>
                        <option value="inventory">Inventory Report</option>
                        <option value="revenue">Revenue Analysis</option>
                    </select>
                    <button
                        onClick={handleGenerateReport}
                        disabled={generating}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                        {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                                <p className="text-xl font-bold dark:text-white">${stats.totalRevenue?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>
                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Package className="text-blue-600 dark:text-blue-400" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Top Products</p>
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
                                <p className="text-sm text-gray-500 dark:text-gray-400">Recent Orders</p>
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
                                <p className="text-sm text-gray-500 dark:text-gray-400">Lost Revenue</p>
                                <p className="text-xl font-bold dark:text-white">${stats.lostRevenue?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports List */}
            <div className={`rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold dark:text-white">Generated Reports</h2>
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
                ) : reports.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                        <h3 className="font-semibold text-lg dark:text-white mb-2">No reports yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">Generate your first report to get started.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                        {getTypeIcon(report.type)}
                                    </div>
                                    <div>
                                        <h3 className="font-medium dark:text-white">{report.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar size={12} className="text-gray-400" />
                                            <span className="text-xs text-gray-400">{formatDate(report.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
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
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => downloadReport(report)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                            >
                                                <Download size={14} />
                                                Download
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
                        ))}
                    </div>
                )}
            </div>

            {/* Report Info */}
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-3">
                    <FileText className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-medium text-blue-800 dark:text-blue-300">About Reports</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Reports are generated from your connected Shopify store data. They include sales performance,
                            inventory levels, and revenue analytics. Connect a store in Settings to get real data.
                        </p>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    {getTypeIcon(previewReport.type)}
                                </div>
                                <div>
                                    <h3 className="font-semibold dark:text-white">{previewReport.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(previewReport.createdAt)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewReport(null)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {renderPreviewContent(previewReport)}
                        </div>

                        {/* Modal Footer */}
                        <div className={`flex items-center justify-end gap-3 p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <button
                                onClick={() => setPreviewReport(null)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    downloadReport(previewReport);
                                    setPreviewReport(null);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                            >
                                <Download size={16} />
                                Download Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
