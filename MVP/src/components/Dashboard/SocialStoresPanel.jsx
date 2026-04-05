import React, { useState, useEffect } from 'react';
import {
    Instagram,
    Trash2,
    Loader2,
    Globe,
    CheckCircle2,
    AlertCircle,
    MessageCircle,
    Package,
    ShoppingCart,
    ExternalLink,
    Search,
    Filter,
    Cloud
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { storesAPI } from '../../services/api';

const SocialStoresPanel = ({ isDarkMode, user: userFromProps }) => {
    const { refreshUser } = useAuth();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newStore, setNewStore] = useState({ name: '', contact: '', type: 'instagram' });
    const [addLoading, setAddLoading] = useState(false);

    // Inventory management state
    const [activeStoreId, setActiveStoreId] = useState(null);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [storeStats, setStoreStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const fetchStores = async () => {
        try {
            const response = await storesAPI.socialStores.getAll();
            const data = response.data;
            setStores(data);
            if (data.length > 0 && !activeStoreId) {
                setActiveStoreId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch social stores", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSocialProducts = async (storeId) => {
        if (!storeId) return;
        setProductsLoading(true);
        try {
            const response = await storesAPI.socialStores.getProducts(storeId);
            const data = response.data;
            setProducts(data.products || []);
        } catch (error) {
            console.error("Failed to fetch products for social store", error);
        } finally {
            setProductsLoading(false);
        }
    };

    const fetchStats = async (id) => {
        setStatsLoading(true);
        try {
            const response = await storesAPI.socialStores.getStats(id);
            setStoreStats(response.data);
        } catch (error) {
            console.error("Failed to fetch store stats", error);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        if (activeStoreId) {
            fetchSocialProducts(activeStoreId);
            fetchStats(activeStoreId);
        }
    }, [activeStoreId]);

    const handleAddStore = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            await storesAPI.socialStores.create(newStore);
            await fetchStores();
            await refreshUser();
            setIsAdding(false);
            setNewStore({ name: '', contact: '', type: 'instagram' });
        } catch (error) {
            alert("Failed to add store");
        } finally {
            setAddLoading(false);
        }
    };

    const handleDeleteStore = async (id) => {
        if (!window.confirm("Are you sure you want to remove this social sync?")) return;
        try {
            await storesAPI.deleteShop(id);
            await refreshUser();
            const remaining = stores.filter(s => s.id !== id);
            setStores(remaining);
            if (activeStoreId === id) {
                setActiveStoreId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (error) {
            alert("Failed to delete store");
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;

    const activeStore = stores.find(s => s.id === activeStoreId);
    const filteredProducts = products ? products.filter(p => p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <ShoppingCart className="text-blue-500" />
                        Social Inventory Sync
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage products and inventory across Instagram and WhatsApp channels.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
                    >
                        Connect Social Channel
                    </button>
                )}
            </div>

            {isAdding && (
                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} transition-all`}>
                    <form onSubmit={handleAddStore} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Channel Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newStore.name}
                                    onChange={e => setNewStore({ ...newStore, name: e.target.value })}
                                    placeholder="e.g. Instagram Shop"
                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Platform</label>
                                <select
                                    value={newStore.type}
                                    onChange={e => setNewStore({ ...newStore, type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none dark:text-white"
                                >
                                    <option value="instagram">Instagram</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Account Handle</label>
                                <input
                                    type="text"
                                    required
                                    value={newStore.contact}
                                    onChange={e => setNewStore({ ...newStore, contact: e.target.value })}
                                    placeholder={newStore.type === 'instagram' ? '@username' : 'Phone number'}
                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                            <button type="submit" disabled={addLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm flex items-center gap-2">
                                {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Add Integration
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {stores.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Channel Selector */}
                    <div className="space-y-2">
                        {stores.map(store => (
                            <div key={store.id} className="relative group">
                                <button
                                    onClick={() => setActiveStoreId(store.id)}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all text-left ${activeStoreId === store.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 pr-8">
                                        <div className={`p-2 rounded-lg ${store.type === 'instagram' ? 'bg-pink-500' : 'bg-green-500'} text-white`}>
                                            {store.type === 'instagram' ? <Instagram size={16} /> : <MessageCircle size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold dark:text-white truncate">{store.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${userFromProps?.activeShopId === store.id ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`} />
                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                                                    {userFromProps?.activeShopId === store.id ? 'Active Context' : store.type}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {userFromProps?.activeShopId !== store.id && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await storesAPI.setActiveShop(store.id);
                                                        await refreshUser();
                                                        window.location.reload();
                                                    } catch (err) { alert("Error setting active"); }
                                                }}
                                                className="p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                                                title="Set as Active Shop"
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStore(store.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Content Area (Stats + Inventory) */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        {/* Channel Performance Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Visits / Traffic</div>
                                <div className="text-2xl font-black dark:text-white flex items-baseline gap-1">
                                    {storeStats?.totalVisits || 0}
                                    <span className="text-[10px] text-gray-400 font-normal">lifetime</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Inquiries</div>
                                <div className="text-2xl font-black dark:text-white flex items-baseline gap-1">
                                    {storeStats?.totalInquiries || 0}
                                    <span className="text-[10px] text-gray-400 font-normal">conv: {((storeStats?.totalInquiries / (storeStats?.totalVisits || 1)) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                                <div className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Total Revenue</div>
                                <div className="text-2xl font-black dark:text-white flex items-baseline gap-1 text-green-600">
                                    ${storeStats?.totalRevenue?.toLocaleString() || '0.00'}
                                    <span className="text-[10px] text-gray-400 font-normal">{storeStats?.totalOrders || 0} orders</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }}></div>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Inventory Value</div>
                                <div className="text-2xl font-black dark:text-white flex items-baseline gap-1 text-orange-500">
                                    ${storeStats?.potentialStockValue?.toLocaleString() || '0.00'}
                                    <span className="text-[10px] text-gray-400 font-normal">potential</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: '80%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Product Table */}
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h4 className="text-lg font-bold dark:text-white flex items-center gap-2">
                                        <Package className="text-blue-500" />
                                        Synced Products
                                    </h4>
                                    <p className="text-xs text-gray-500">Inventory across channels for {activeStore?.name}</p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-full ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="bg-transparent border-none focus:outline-none text-xs dark:text-white w-full"
                                        />
                                    </div>
                                    <a
                                        href={activeStore?.type === 'instagram' ? `https://instagram.com/${activeStore?.contact?.replace('@', '')}` : `https://wa.me/${activeStore?.contact}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-blue-500"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>

                            {productsLoading ? (
                                <div className="flex flex-col items-center justify-center p-12 gap-4">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                    <p className="text-sm text-gray-500">Loading catalog...</p>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-12 italic text-gray-400 text-sm">No products found.</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-100'} flex items-center gap-4`}>
                                            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                                {product.images?.[0] && <img src={product.images[0].src} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold dark:text-white truncate">{product.title}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-xs text-blue-600 font-bold">${product.variants?.[0]?.price}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${product.variants?.[0]?.inventory_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {product.variants?.[0]?.inventory_quantity || 0} in stock
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {stores.length === 0 && !isAdding && (
                <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                    <Cloud className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                    <h4 className="text-lg font-bold dark:text-white">Multi-Channel Management</h4>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">Connect your social accounts to keep your Shopify inventory and products synced across every channel.</p>
                </div>
            )}
        </div>
    );
};

export default SocialStoresPanel;
