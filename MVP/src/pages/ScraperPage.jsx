import React, { useState, useEffect } from 'react';
import { 
    Globe, 
    Plus, 
    RefreshCw, 
    Trash2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { storesAPI } from '../services/api';

const ScraperPage = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSite, setNewSite] = useState({
        name: '',
        url: '',
        loginUrl: '',
        platform: 'generic'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const res = await storesAPI.scraper.getSites();
            setSites(res.data);
        } catch (err) {
            console.error('Failed to fetch sites', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSite = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await storesAPI.scraper.createSite(newSite);
            setShowAddModal(false);
            setNewSite({ name: '', url: '', loginUrl: '', platform: 'generic' });
            fetchSites();
        } catch (err) {
            console.error('Failed to add site', err);
        } finally {
            setSubmitting(false);
        }
    };

    const triggerScrape = async (siteId) => {
        try {
            await storesAPI.scraper.triggerScrape(siteId);
            alert('Scrape triggered successfully!');
            fetchSites();
        } catch (err) {
            console.error('Failed to trigger scrape', err);
        }
    };

    const deleteSite = async (siteId) => {
        if (!window.confirm('Are you sure you want to delete this site?')) return;
        try {
            await storesAPI.scraper.deleteSite(siteId);
            fetchSites();
        } catch (err) {
            console.error('Failed to delete site', err);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div id="monitor-header">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">External Monitoring</h1>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Monitor stock and prices on standalone e-commerce sites.</p>
                </div>
                <button 
                    id="monitor-add-btn"
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Add Website</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div id="monitor-sites-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {sites.length === 0 ? (
                        <div className="col-span-full text-center py-16 sm:py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6">
                            <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300">No websites added yet</h3>
                            <p className="text-sm sm:text-base text-gray-400 mt-2">Connect your first standalone store to start monitoring.</p>
                        </div>
                    ) : (
                        sites.map(site => (
                            <div key={site.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 sm:p-3 rounded-xl">
                                        <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex gap-1 sm:gap-2">
                                        <button 
                                            onClick={() => triggerScrape(site.id)}
                                            title="Scrape Now"
                                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-gray-50 dark:bg-gray-900 sm:bg-transparent rounded-lg"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => deleteSite(site.id)}
                                            title="Delete"
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 dark:bg-gray-900 sm:bg-transparent rounded-lg"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">{site.name}</h3>
                                <a href={site.url} target="_blank" rel="noreferrer" className="text-xs sm:text-sm text-indigo-500 hover:underline mb-4 block truncate">
                                    {site.url}
                                </a>
                                
                                <div className="space-y-3 mt-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                                        <span className={`flex items-center gap-1 font-medium ${site.status === 'failed' ? 'text-red-500' : 'text-green-500'}`}>
                                            {site.status === 'failed' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {(site.status || 'pending').charAt(0).toUpperCase() + (site.status || 'pending').slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Last Scrape</span>
                                        <span className="text-gray-700 dark:text-gray-300 text-right">
                                            {site.lastScrapeAt ? new Date(site.lastScrapeAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Platform</span>
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase font-bold">
                                            {site.platform || 'Generic'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Website</h2>
                        <form onSubmit={handleAddSite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website Name</label>
                                <input 
                                    type="text"
                                    required
                                    value={newSite.name}
                                    onChange={e => setNewSite({...newSite, name: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                    placeholder="e.g. My Competitor Store"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target URL</label>
                                <input 
                                    type="url"
                                    required
                                    value={newSite.url}
                                    onChange={e => setNewSite({...newSite, url: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                    placeholder="https://example.com/admin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login URL (Optional)</label>
                                <input 
                                    type="url"
                                    value={newSite.loginUrl}
                                    onChange={e => setNewSite({...newSite, loginUrl: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                    placeholder="https://example.com/login"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 mt-8">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="order-2 sm:order-1 flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="order-1 sm:order-2 flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
                                >
                                    {submitting && <RefreshCw className="w-5 h-5 animate-spin" />}
                                    {submitting ? 'Saving...' : 'Add Website'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScraperPage;
