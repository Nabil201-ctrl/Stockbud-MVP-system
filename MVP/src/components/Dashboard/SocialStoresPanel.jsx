import React, { useState, useEffect } from 'react';
import {
    Instagram,
    Trash2,
    ExternalLink,
    TrendingUp,
    Plus,
    Loader2,
    Globe,
    Copy,
    CheckCircle2,
    AlertCircle,
    MessageCircle,
    Smartphone
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SocialStoresPanel = ({ isDarkMode, authenticatedFetch, user }) => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newStore, setNewStore] = useState({ name: '', contact: '', type: 'instagram' });
    const [addLoading, setAddLoading] = useState(false);
    const [stats, setStats] = useState({}); // { storeId: { totalVisits, chartData } }
    const [copiedId, setCopiedId] = useState(null);

    const fetchStores = async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/social-stores`);
            if (response.ok) {
                const data = await response.json();
                setStores(data);

                // Fetch stats for each store
                data.forEach(store => fetchStoreStats(store.id));
            }
        } catch (error) {
            console.error("Failed to fetch social stores", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStoreStats = async (storeId) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/social-stores/${storeId}/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(prev => ({ ...prev, [storeId]: data }));
            }
        } catch (error) {
            console.error(`Failed to fetch stats for ${storeId}`, error);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const handleAddStore = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            const response = await authenticatedFetch(`${API_URL}/social-stores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStore)
            });
            if (response.ok) {
                await fetchStores();
                setIsAdding(false);
                setNewStore({ name: '', contact: '', type: 'instagram' });
            }
        } catch (error) {
            alert("Failed to add store");
        } finally {
            setAddLoading(false);
        }
    };

    const handleDeleteStore = async (id) => {
        if (!window.confirm("Are you sure you want to remove this social store integration?")) return;
        try {
            const response = await authenticatedFetch(`${API_URL}/social-stores/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setStores(stores.filter(s => s.id !== id));
            }
        } catch (error) {
            alert("Failed to delete store");
        }
    };

    const copyLink = (id) => {
        const link = `${window.location.origin}/store/${id}`;
        navigator.clipboard.writeText(link);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                        <Globe className="text-blue-500" />
                        Social Stores
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Create storefronts for Instagram or WhatsApp that link to your Shopify products.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={16} />
                        Add Social Store
                    </button>
                )}
            </div>

            {isAdding && (
                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} transition-all`}>
                    <form onSubmit={handleAddStore} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Store Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStore.name}
                                    onChange={e => setNewStore({ ...newStore, name: e.target.value })}
                                    placeholder="e.g. My Boutique"
                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Platform</label>
                                <select
                                    value={newStore.type}
                                    onChange={e => setNewStore({ ...newStore, type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                                >
                                    <option value="instagram">Instagram</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                                    {newStore.type === 'instagram' ? 'Instagram Handle' : 'WhatsApp Number'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newStore.contact}
                                    onChange={e => setNewStore({ ...newStore, contact: e.target.value })}
                                    placeholder={newStore.type === 'instagram' ? '@handle' : 'e.g. +234...'}
                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={addLoading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center disabled:opacity-70"
                            >
                                {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Create Store
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {stores.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                        <Globe className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={48} />
                        <p className="text-gray-500">No social stores connected yet.</p>
                    </div>
                ) : (
                    stores.map(store => (
                        <div key={store.id} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm group hover:shadow-md transition-all`}>
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${store.type === 'instagram'
                                                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'
                                                    : 'bg-green-500'
                                                }`}>
                                                {store.type === 'instagram' ? <Instagram size={24} /> : <MessageCircle size={24} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg dark:text-white">{store.name}</h4>
                                                <p className={`text-sm font-medium ${store.type === 'instagram' ? 'text-pink-500' : 'text-green-500'}`}>
                                                    {store.contact}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => copyLink(store.id)}
                                                className={`p-2 rounded-lg transition-colors ${copiedId === store.id ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'}`}
                                                title="Copy Catalog Link"
                                            >
                                                {copiedId === store.id ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStore(store.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete Store"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Visits</div>
                                            <div className="text-xl font-bold dark:text-white">{stats[store.id]?.totalVisits || 0}</div>
                                        </div>
                                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Inquiries</div>
                                            <div className="text-xl font-bold dark:text-white">{stats[store.id]?.totalInquiries || 0}</div>
                                        </div>
                                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'} hidden sm:block`}>
                                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Sync</div>
                                            <div className="text-sm font-bold text-green-600 flex items-center gap-1">
                                                <CheckCircle2 size={14} /> Active
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <a
                                            href={`${window.location.origin}/store/${store.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 dark:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all"
                                        >
                                            <Globe size={14} />
                                            View Storefront
                                        </a>
                                    </div>
                                </div>

                                <div className="lg:w-64 h-48 lg:h-auto border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-700 pt-6 lg:pt-0 lg:pl-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold uppercase text-gray-500">7-Day Monitoring</span>
                                        <TrendingUp size={14} className="text-green-500" />
                                    </div>
                                    {stats[store.id]?.chartData ? (
                                        <div className="h-32 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats[store.id].chartData}>
                                                    <defs>
                                                        <linearGradient id={`grad-${store.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={store.type === 'instagram' ? '#ec4899' : '#10b981'} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={store.type === 'instagram' ? '#ec4899' : '#10b981'} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Area type="monotone" dataKey="visits" stroke={store.type === 'instagram' ? '#ec4899' : '#10b981'} fillOpacity={1} fill={`url(#grad-${store.id})`} strokeWidth={2} name="Visits" />
                                                    <Area type="monotone" dataKey="inquiries" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} name="Inquiries" strokeDasharray="3 3" />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-32 flex items-center justify-center text-xs text-gray-400 italic">No data yet</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SocialStoresPanel;
