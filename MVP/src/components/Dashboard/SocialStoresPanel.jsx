
import React, { useState, useEffect } from 'react';
import { Plus, Store, Trash2, MessageCircle, Instagram, Link as LinkIcon, Copy, Check, Package, Edit3, X, ChevronDown, ChevronUp, ExternalLink, Share2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const APP_URL = window.location.origin;

const SocialStoresPanel = ({ activeStoreId, onProductAdded, triggerAddProduct, onAddProductModalClose }) => {
    const { isDarkMode } = useTheme();
    const { authenticatedFetch } = useAuth();

    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddStore, setShowAddStore] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(null);
    const [expandedStore, setExpandedStore] = useState(null);
    const [copiedSlug, setCopiedSlug] = useState(null);
    const [copiedStoreId, setCopiedStoreId] = useState(null);

    const [storeForm, setStoreForm] = useState({
        type: 'whatsapp',
        storeName: '',
        contact: '',
        description: '',
    });

    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'NGN',
        image: '',
        stock: '',
    });

    const [saving, setSaving] = useState(false);

    const fetchStores = async () => {
        try {
            const res = await authenticatedFetch(`${API_URL}/social-stores`);
            if (res.ok) {
                const data = await res.json();
                setStores(data);
            }
        } catch (err) {
            console.error('Failed to fetch social stores:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, [authenticatedFetch, activeStoreId]);

    useEffect(() => {
        if (activeStoreId && stores.length > 0) {
            setExpandedStore(activeStoreId);
            if (triggerAddProduct) {
                setShowAddProduct(activeStoreId);
                if (onAddProductModalClose) onAddProductModalClose();
            }
        }
    }, [activeStoreId, stores, triggerAddProduct]);

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/social-stores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storeForm),
            });
            if (res.ok) {
                await fetchStores();
                setShowAddStore(false);
                setStoreForm({ type: 'whatsapp', storeName: '', contact: '', description: '' });
            }
        } catch (err) {
            console.error('Failed to create store:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (!confirm('Delete this store and all its products?')) return;
        try {
            await authenticatedFetch(`${API_URL}/social-stores/${storeId}`, { method: 'DELETE' });
            await fetchStores();
        } catch (err) {
            console.error('Failed to delete store:', err);
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if (!showAddProduct) return;
        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/social-stores/${showAddProduct}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...productForm,
                    price: parseFloat(productForm.price),
                    stock: parseInt(productForm.stock, 10) || 0,
                }),
            });
            if (res.ok) {
                await fetchStores();
                if (onProductAdded) onProductAdded();
                setShowAddProduct(null);
                setProductForm({ name: '', description: '', price: '', currency: 'NGN', image: '', stock: '' });
            }
        } catch (err) {
            console.error('Failed to create product:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!confirm('Delete this product?')) return;
        try {
            await authenticatedFetch(`${API_URL}/social-stores/products/${productId}`, { method: 'DELETE' });
            await fetchStores();
        } catch (err) {
            console.error('Failed to delete product:', err);
        }
    };

    const copyLink = (slug) => {
        const link = `${APP_URL}/p/${slug}`;
        navigator.clipboard.writeText(link);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    const copyStoreLink = (storeId) => {
        const link = `${APP_URL}/s/${storeId}`;
        navigator.clipboard.writeText(link);
        setCopiedStoreId(storeId);
        setTimeout(() => setCopiedStoreId(null), 2000);
    };

    const shareLink = (product, store) => {
        const link = `${APP_URL}/p/${product.slug}`;
        const text = `Check out "${product.name}" - ${product.currency} ${product.price.toLocaleString()} on StockBud!`;
        if (store.type === 'whatsapp') {
            const phone = store.contact.replace(/[^0-9]/g, '');
            window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + link)}`, '_blank');
        } else {
            if (navigator.share) {
                navigator.share({ title: product.name, text, url: link });
            } else {
                copyLink(product.slug);
            }
        }
    };

    if (loading) {
        return (
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-500">Loading stores...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Store size={22} className="text-purple-500" />
                            Social Stores
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Sell via WhatsApp or Instagram
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddStore(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20"
                    >
                        <Plus size={18} />
                        Add Store
                    </button>
                </div>

                {stores.length === 0 ? (
                    <div className="text-center py-12">
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <Store size={36} className="text-gray-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No Social Stores Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-6">
                            Add your WhatsApp or Instagram store to start creating products and sharing links with customers.
                        </p>
                        <button
                            onClick={() => setShowAddStore(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20"
                        >
                            <Plus size={18} />
                            Create Your First Store
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {stores
                            .filter(s => !activeStoreId || s.id === activeStoreId)
                            .map(store => (
                                <div key={store.id} className={`rounded-xl border overflow-hidden transition-all ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                                    <div
                                        className={`flex items-center justify-between p-4 cursor-pointer ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors ${activeStoreId === store.id ? (isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50/50') : ''}`}
                                        onClick={() => setExpandedStore(expandedStore === store.id ? null : store.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${store.type === 'whatsapp' ? 'bg-green-500/10 text-green-500' : 'bg-pink-500/10 text-pink-500'}`}>
                                                {store.type === 'whatsapp' ? <MessageCircle size={20} /> : <Instagram size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{store.storeName}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {store.type === 'whatsapp' ? `+${store.contact}` : `@${store.contact}`} · {store.products?.length || 0} products
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyStoreLink(store.id); }}
                                                className={`p-2 rounded-lg transition-all ${copiedStoreId === store.id ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-500/10'}`}
                                                title="Copy store link"
                                            >
                                                {copiedStoreId === store.id ? <Check size={18} /> : <Copy size={18} />}
                                            </button>
                                            <a
                                                href={`/s/${store.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                                                title="View Storefront"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAddProduct(store.id); }}
                                                className="p-2 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                                                title="Add Product"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteStore(store.id); }}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Delete Store"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            {expandedStore === store.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                        </div>
                                    </div>

                                    {expandedStore === store.id && (
                                        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                            {(!store.products || store.products.length === 0) ? (
                                                <div className="p-6 text-center">
                                                    <Package size={32} className="mx-auto mb-2 text-gray-400" />
                                                    <p className="text-gray-500 text-sm">No products yet</p>
                                                    <button
                                                        onClick={() => setShowAddProduct(store.id)}
                                                        className="mt-3 text-sm text-purple-500 hover:text-purple-400 font-medium"
                                                    >
                                                        + Add your first product
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-4 space-y-3">
                                                    {store.products.map(product => (
                                                        <div key={product.id} className={`flex items-center gap-3 p-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} shadow-sm`}>
                                                            <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                                                {product.image ? (
                                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Package size={20} className="text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-medium text-sm truncate">{product.name}</h5>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {product.currency} {product.price.toLocaleString()} · Stock: {product.stock}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <button
                                                                    onClick={() => copyLink(product.slug)}
                                                                    className={`p-2 rounded-lg transition-all ${copiedSlug === product.slug ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-500/10'}`}
                                                                    title="Copy shareable link"
                                                                >
                                                                    {copiedSlug === product.slug ? <Check size={16} /> : <Copy size={16} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => shareLink(product, store)}
                                                                    className="p-2 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all"
                                                                    title="Share product"
                                                                >
                                                                    <Share2 size={16} />
                                                                </button>
                                                                <a
                                                                    href={`/p/${product.slug}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                                                                    title="View public page"
                                                                >
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                                <button
                                                                    onClick={() => handleDeleteProduct(product.id)}
                                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                                    title="Delete product"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {showAddStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Store size={20} className="text-purple-500" />
                                Add Social Store
                            </h3>
                            <button onClick={() => setShowAddStore(false)} className="text-gray-400 hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateStore} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-2">Store Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStoreForm(f => ({ ...f, type: 'whatsapp' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-medium text-sm ${storeForm.type === 'whatsapp'
                                            ? 'border-green-500 bg-green-500/10 text-green-500'
                                            : isDarkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <MessageCircle size={18} />
                                        WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStoreForm(f => ({ ...f, type: 'instagram' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-medium text-sm ${storeForm.type === 'instagram'
                                            ? 'border-pink-500 bg-pink-500/10 text-pink-500'
                                            : isDarkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Instagram size={18} />
                                        Instagram
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Store Name</label>
                                <input
                                    type="text"
                                    value={storeForm.storeName}
                                    onChange={(e) => setStoreForm(f => ({ ...f, storeName: e.target.value }))}
                                    placeholder="e.g. My Fashion Store"
                                    required
                                    className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {storeForm.type === 'whatsapp' ? 'WhatsApp Number (with country code)' : 'Instagram Handle'}
                                </label>
                                <input
                                    type="text"
                                    value={storeForm.contact}
                                    onChange={(e) => setStoreForm(f => ({ ...f, contact: e.target.value }))}
                                    placeholder={storeForm.type === 'whatsapp' ? '2348012345678' : 'mystore'}
                                    required
                                    className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-purple-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                                <textarea
                                    value={storeForm.description}
                                    onChange={(e) => setStoreForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="What do you sell?"
                                    rows={2}
                                    className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-purple-500 resize-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddStore(false)}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Creating...' : 'Create Store'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Package size={20} className="text-blue-500" />
                                Add Product
                            </h3>
                            <button onClick={() => setShowAddProduct(null)} className="text-gray-400 hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Product Name</label>
                                <input
                                    type="text"
                                    value={productForm.name}
                                    onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Nike Air Max"
                                    required
                                    className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                                <textarea
                                    value={productForm.description}
                                    onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Product details..."
                                    rows={2}
                                    className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 resize-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Price</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={productForm.price}
                                        onChange={(e) => setProductForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="5000"
                                        required
                                        className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Currency</label>
                                    <select
                                        value={productForm.currency}
                                        onChange={(e) => setProductForm(f => ({ ...f, currency: e.target.value }))}
                                        className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                    >
                                        <option value="NGN">NGN</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="GHS">GHS</option>
                                        <option value="KES">KES</option>
                                        <option value="XOF">XOF</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Stock</label>
                                    <input
                                        type="number"
                                        value={productForm.stock}
                                        onChange={(e) => setProductForm(f => ({ ...f, stock: e.target.value }))}
                                        placeholder="50"
                                        className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Image URL</label>
                                    <input
                                        type="url"
                                        value={productForm.image}
                                        onChange={(e) => setProductForm(f => ({ ...f, image: e.target.value }))}
                                        placeholder="https://..."
                                        className={`w-full p-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddProduct(null)}
                                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Creating...' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocialStoresPanel;
