import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Instagram,
    ShoppingBag,
    ExternalLink,
    Loader2,
    AlertCircle,
    ArrowRight,
    Heart,
    MessageCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StorefrontPage = () => {
    const { id } = useParams();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStoreData = async () => {
            try {
                // 1. Fetch store details
                const storeRes = await fetch(`${API_URL}/social-stores/${id}`);
                if (!storeRes.ok) throw new Error("Store not found");
                const storeData = await storeRes.json();
                setStore(storeData);

                // 2. Record visit (fire and forget)
                fetch(`${API_URL}/social-stores/${id}/record-visit`, { method: 'POST' }).catch(console.error);

                // 3. Fetch products
                const productsRes = await fetch(`${API_URL}/social-stores/${id}/products`);
                if (productsRes.ok) {
                    const productsData = await productsRes.json();
                    setProducts(productsData.products || []);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStoreData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-500 flex items-center justify-center text-white animate-pulse shadow-xl">
                    <ShoppingBag size={32} />
                </div>
                <p className="text-gray-500 font-medium animate-pulse">Loading Catalog...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-4">
                    <AlertCircle size={64} className="mx-auto text-red-500" />
                    <h1 className="text-2xl font-bold">Oops! Store Not Found</h1>
                    <p className="text-gray-500">The catalog you're looking for might have been moved or removed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header / Social Banner */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md ${store?.type === 'instagram'
                                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500'
                                : 'bg-green-500'
                            }`}>
                            {store?.type === 'instagram' ? <Instagram size={24} /> : <MessageCircle size={24} />}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-gray-900">{store?.name}</h1>
                            <p className={`text-xs font-semibold ${store?.type === 'instagram' ? 'text-pink-500' : 'text-green-500'}`}>
                                {store?.contact}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Powered By</p>
                            <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">STOCKBUD</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Hero Section */}
                <div className={`rounded-3xl p-8 mb-12 text-white overflow-hidden relative shadow-2xl ${store?.type === 'instagram'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/20'
                        : 'bg-gradient-to-r from-green-500 to-teal-600 shadow-green-500/20'
                    }`}>
                    <div className="relative z-10 max-w-lg">
                        <h2 className="text-3xl font-extrabold mb-3">Shop Our Exclusive Collection</h2>
                        <p className="text-white/80 mb-6 font-medium">Browse our latest products synced directly from our main catalog. Inquire for personalized support!</p>
                        <button className="bg-white text-gray-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-100 transition-all shadow-lg active:scale-95">
                            Shop Now <ArrowRight size={18} />
                        </button>
                    </div>
                    {store?.type === 'instagram' ? (
                        <Instagram className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 text-white/10" />
                    ) : (
                        <MessageCircle className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 text-white/10" />
                    )}
                </div>

                {/* Product Grid */}
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        Featured Products <ShoppingBag className="text-gray-400" size={20} />
                    </h3>
                    <div className="text-sm text-gray-400 font-medium">
                        Showing {products.length} Items
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            <div className="aspect-[4/5] overflow-hidden relative">
                                <img
                                    src={product.images?.[0]?.src || 'https://via.placeholder.com/400x500?text=Product'}
                                    alt={product.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute top-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all text-white">
                                    <button className="bg-white/20 backdrop-blur-md p-3 rounded-full hover:bg-white/40">
                                        <Heart size={20} />
                                    </button>
                                </div>
                                {product.variants?.[0]?.inventory_quantity <= 0 && (
                                    <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold">
                                        OUT OF STOCK
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg text-gray-900 line-clamp-1">{product.title}</h4>
                                    <span className={`font-black whitespace-nowrap ${store?.type === 'instagram' ? 'text-pink-600' : 'text-green-600'}`}>
                                        ${product.variants?.[0]?.price}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-4">
                                    {product.product_type || 'Uncategorized'}
                                </p>
                                <a
                                    href={
                                        store?.type === 'instagram'
                                            ? `https://www.instagram.com/${store?.contact?.replace('@', '')}`
                                            : `https://wa.me/${store?.contact?.replace(/[^0-9]/g, '')}?text=I'm interested in ${encodeURIComponent(product.title)}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        fetch(`${API_URL}/social-stores/${id}/record-inquiry`, { method: 'POST' }).catch(console.error);
                                    }}
                                    className={`w-full text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${store?.type === 'instagram'
                                            ? 'bg-gray-900 hover:bg-pink-600'
                                            : 'bg-gray-900 hover:bg-green-600'
                                        }`}
                                >
                                    {store?.type === 'instagram' ? 'Inquire via Instagram' : 'Inquire via WhatsApp'}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {products.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium">This store's catalog is currently empty.</p>
                    </div>
                )}
            </main>

            <footer className="max-w-6xl mx-auto px-6 mt-12 text-center text-gray-400">
                <div className="w-12 h-1 bg-gray-200 mx-auto rounded-full mb-6"></div>
                <p className="text-sm font-medium">&copy; {new Date().getFullYear()} {store?.name}. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default StorefrontPage;
