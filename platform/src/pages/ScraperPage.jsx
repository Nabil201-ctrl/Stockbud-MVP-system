import React, { useState, useEffect } from 'react';
import { 
    Globe, 
    Plus, 
    RefreshCw, 
    Trash2,
    AlertCircle,
    CheckCircle2,
    Package,
    ArrowLeft,
    Search,
    Edit
} from 'lucide-react';
import { storesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/common/ConfirmModal';

const ScraperPage = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores siteId to delete
    const [newSite, setNewSite] = useState({
        name: '',
        url: '',
        loginUrl: '',
        requiresLogin: true,
        platform: 'generic',
        targetStoreId: '',
        targetStoreType: ''
    });
    const [submitting, setSubmitting] = useState(false);
    
    // For viewing products
    const [selectedSite, setSelectedSite] = useState(null);
    const [editingSite, setEditingSite] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSites();
        
        // Poll for updates every 10 seconds to show scrape progress
        const interval = setInterval(fetchSites, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchSites = async () => {
        try {
            const res = await storesAPI.scraper.getSites();
            setSites(res.data);
            // Update selected site if it's currently open
            if (selectedSite) {
                const updatedSite = res.data.find(s => s.id === selectedSite.id);
                if (updatedSite) setSelectedSite(updatedSite);
            }
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
            // Clean data: remove empty strings for optional URL fields
            const dataToSave = { 
                ...newSite,
                url: newSite.url.trim(),
                loginUrl: newSite.loginUrl?.trim()
            };
            if (!dataToSave.loginUrl) delete dataToSave.loginUrl;
            if (!dataToSave.requiresLogin) {
                delete dataToSave.loginUrl;
            }
            if (!dataToSave.targetStoreId) {
                delete dataToSave.targetStoreId;
                delete dataToSave.targetStoreType;
            }

            if (editingSite) {
                await storesAPI.scraper.updateSite(editingSite.id, dataToSave);
                showNotification('Website settings updated successfully', 'success');
            } else {
                await storesAPI.scraper.createSite(dataToSave);
                showNotification('Website added successfully', 'success');
            }
            setShowAddModal(false);
            setEditingSite(null);
            setNewSite({ 
                name: '', 
                url: '', 
                loginUrl: '', 
                requiresLogin: true,
                platform: 'generic',
                targetStoreId: '',
                targetStoreType: ''
            });
            fetchSites();
        } catch (err) {
            console.error('Failed to save site', err);
        } finally {
            setSubmitting(false);
        }
    };

    const triggerScrape = async (siteId) => {
        try {
            await storesAPI.scraper.triggerScrape(siteId);
            showNotification('Scrape triggered successfully!', 'success');
            fetchSites();
        } catch (err) {
            console.error('Failed to trigger scrape', err);
            showNotification('Failed to trigger scrape', 'error');
        }
    };

    const deleteSite = async (siteId) => {
        try {
            if (selectedSite && selectedSite.id === siteId) {
                setSelectedSite(null);
            }
            await storesAPI.scraper.deleteSite(siteId);
            showNotification('Website deleted successfully', 'success');
            fetchSites();
        } catch (err) {
            console.error('Failed to delete site', err);
            showNotification('Failed to delete website', 'error');
        }
    };

    const renderProductsView = () => {
        // Fallback robustly for snapshot data
        const products = selectedSite?.snapshots?.[0]?.data || [];
        // Support array of products
        const productsList = Array.isArray(products) ? products : (products.products ? products.products : []);
        
        const filteredProducts = productsList.filter(p => 
            (p.name || p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <button 
                    onClick={() => setSelectedSite(null)}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sites
                </button>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {selectedSite.name} Products
                            <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-full font-bold uppercase">
                                {productsList.length} Items
                            </span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Latest scraped data from {selectedSite.url}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg w-full sm:w-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Search size={18} className="text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent outline-none text-sm w-full sm:w-48 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {filteredProducts.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No products found</p>
                            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or wait for the next scrape.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                        <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 text-sm">Product</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 text-sm">Category</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 text-sm">Price</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 text-sm">Stock</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600">
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.title || product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="text-gray-400" size={24} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white text-base">{product.title || product.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-gray-900 dark:text-white text-base">
                                                {product.currency || '$'}{Number(product.price || 0).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                                        <div 
                                                            className={`h-2 rounded-full ${Number(product.stock) > 20 ? 'bg-green-500' : Number(product.stock) > 5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                            style={{ width: `${Math.min((Number(product.stock || 0) / 100) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{product.stock || 0}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                                                    product.status === 'in_stock' || product.status === 'active' || Number(product.stock) > 0
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' 
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                                                }`}>
                                                    {product.status === 'in_stock' || product.status === 'active' || Number(product.stock) > 0 ? 'In Stock' : 'Out of Stock'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
            {!selectedSite && (
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
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            ) : selectedSite ? (
                renderProductsView()
            ) : (
                <div id="monitor-sites-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {sites.length === 0 ? (
                        <div className="col-span-full text-center py-16 sm:py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 shadow-sm">
                            <Globe className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300">No websites added yet</h3>
                            <p className="text-sm sm:text-base text-gray-400 mt-2">Connect your first standalone store to start monitoring.</p>
                        </div>
                    ) : (
                        sites.map(site => (
                            <div key={site.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2.5 sm:p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                        <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex gap-1 sm:gap-2">
                                        {site.snapshots && site.snapshots.length > 0 && (
                                            <button 
                                                onClick={() => {
                                                    setSelectedSite(site);
                                                    setSearchTerm('');
                                                }}
                                                title="View Products"
                                                className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors bg-gray-50 dark:bg-gray-900 sm:bg-transparent rounded-lg"
                                            >
                                                <Package className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => triggerScrape(site.id)}
                                            title="Scrape Now"
                                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-gray-50 dark:bg-gray-900 sm:bg-transparent rounded-lg"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingSite(site);
                                                setNewSite({
                                                    name: site.name,
                                                    url: site.url,
                                                    loginUrl: site.loginUrl || '',
                                                    requiresLogin: site.requiresLogin !== undefined ? site.requiresLogin : true,
                                                    platform: site.platform || 'generic',
                                                    targetStoreId: site.targetStoreId || '',
                                                    targetStoreType: site.targetStoreType || ''
                                                });
                                                setShowAddModal(true);
                                            }}
                                            title="Edit Settings"
                                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-gray-50 dark:bg-gray-900 sm:bg-transparent rounded-lg"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setShowDeleteConfirm(site.id)}
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
                                
                                <div className="space-y-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Status</span>
                                        <span className={`flex items-center gap-1 font-bold ${
                                            site.status === 'failed' ? 'text-red-500' : 
                                            site.status === 'scraping' ? 'text-indigo-600 dark:text-indigo-400' : 
                                            'text-green-500'
                                        }`}>
                                            {site.status === 'failed' ? (
                                                <AlertCircle className="w-4 h-4" />
                                            ) : site.status === 'scraping' ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            {(site.status || 'pending').charAt(0).toUpperCase() + (site.status || 'pending').slice(1)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Last Scrape</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-bold text-right">
                                            {site.lastScrapeAt ? new Date(site.lastScrapeAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Auth Required</span>
                                        <span className={`font-bold ${site.requiresLogin ? 'text-indigo-500' : 'text-gray-400'}`}>
                                            {site.requiresLogin ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Products Found</span>
                                        <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                            {site.snapshots && site.snapshots.length > 0 && site.snapshots[0].data 
                                                ? (Array.isArray(site.snapshots[0].data) ? site.snapshots[0].data.length : (site.snapshots[0].data.products ? site.snapshots[0].data.products.length : 0)) 
                                                : 0}
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
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingSite ? 'Edit Website Settings' : 'Add New Website'}
                        </h2>
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
                            <div className={!newSite.requiresLogin ? 'opacity-50 pointer-events-none' : ''}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login URL (Optional)</label>
                                <input 
                                    type="url"
                                    disabled={!newSite.requiresLogin}
                                    value={newSite.loginUrl}
                                    onChange={e => setNewSite({...newSite, loginUrl: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                    placeholder="https://example.com/login"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">If left blank, our AI will try to find the login page automatically.</p>
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={newSite.requiresLogin}
                                        onChange={e => setNewSite({...newSite, requiresLogin: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </label>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requires Authentication</span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sync to Store (Optional)</label>
                                <select 
                                    value={newSite.targetStoreId ? `${newSite.targetStoreType}:${newSite.targetStoreId}` : ''}
                                    onChange={e => {
                                        if (!e.target.value) {
                                            setNewSite({...newSite, targetStoreId: '', targetStoreType: ''});
                                        } else {
                                            const [type, id] = e.target.value.split(':');
                                            setNewSite({...newSite, targetStoreId: id, targetStoreType: type});
                                        }
                                    }}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-900 dark:text-white"
                                >
                                    <option value="">Create new "Website" store</option>
                                    <optgroup label="Shopify Stores">
                                        {user?.shopifyStores?.map(s => (
                                            <option key={s.id} value={`shopify:${s.id}`}>Shopify: {s.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Social Stores">
                                        {user?.socialStores?.map(s => (
                                            <option key={s.id} value={`social:${s.id}`}>{s.type.charAt(0).toUpperCase() + s.type.slice(1)}: {s.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">Choose where scraped products should be saved.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 mt-8">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingSite(null);
                                    }}
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
                                    {submitting ? 'Saving...' : (editingSite ? 'Update Website' : 'Add Website')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={!!showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(null)}
                onConfirm={() => deleteSite(showDeleteConfirm)}
                title="Delete Website"
                message="Are you sure you want to delete this website from your monitoring list? This action cannot be undone."
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};

export default ScraperPage;
