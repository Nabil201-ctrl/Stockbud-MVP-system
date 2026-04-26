import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    GlobeAltIcon, 
    PlusIcon, 
    ArrowPathIcon, 
    TrashIcon,
    ExclamationCircleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

const ScraperPage = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSite, setNewSite] = useState({
        name: '',
        url: '',
        loginUrl: '',
        username: '',
        password: '',
        platform: 'custom'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/scraper/sites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/scraper/sites`, newSite, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddModal(false);
            setNewSite({ name: '', url: '', loginUrl: '', username: '', password: '', platform: 'custom' });
            fetchSites();
        } catch (err) {
            console.error('Failed to add site', err);
        } finally {
            setSubmitting(false);
        }
    };

    const triggerScrape = async (siteId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/scraper/sites/${siteId}/scrape`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Scrape triggered successfully!');
            fetchSites();
        } catch (err) {
            console.error('Failed to trigger scrape', err);
        }
    };

    const deleteSite = async (siteId) => {
        if (!window.confirm('Are you sure you want to delete this site?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_URL}/scraper/sites/${siteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSites();
        } catch (err) {
            console.error('Failed to delete site', err);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">External Monitoring</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor stock and prices on standalone e-commerce sites.</p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Website
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sites.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <GlobeAltIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300">No websites added yet</h3>
                            <p className="text-gray-400 mt-2">Connect your first standalone store to start monitoring.</p>
                        </div>
                    ) : (
                        sites.map(site => (
                            <div key={site.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl">
                                        <GlobeAltIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => triggerScrape(site.id)}
                                            title="Scrape Now"
                                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        >
                                            <ArrowPathIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => deleteSite(site.id)}
                                            title="Delete"
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{site.name}</h3>
                                <a href={site.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-500 hover:underline mb-4 block truncate">
                                    {site.url}
                                </a>
                                
                                <div className="space-y-3 mt-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                                        <span className={`flex items-center gap-1 font-medium ${site.status === 'failed' ? 'text-red-500' : 'text-green-500'}`}>
                                            {site.status === 'failed' ? <ExclamationCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                                            {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Last Scrape</span>
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {site.lastScrapeAt ? new Date(site.lastScrapeAt).toLocaleString() : 'Never'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Platform</span>
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 uppercase font-bold">
                                            {site.platform || 'Custom'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Website</h2>
                        <form onSubmit={handleAddSite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website Name</label>
                                <input 
                                    type="text"
                                    required
                                    value={newSite.name}
                                    onChange={e => setNewSite({...newSite, name: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="https://example.com/admin"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                    <input 
                                        type="text"
                                        value={newSite.username}
                                        onChange={e => setNewSite({...newSite, username: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input 
                                        type="password"
                                        value={newSite.password}
                                        onChange={e => setNewSite({...newSite, password: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    {submitting && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
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
