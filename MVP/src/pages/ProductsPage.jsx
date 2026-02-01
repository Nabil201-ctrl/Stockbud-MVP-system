// components/pages/Products.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, DollarSign, ShoppingCart, Star, Eye, Tag, Filter, Search, MoreVertical, Store, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { storage } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ProductsPage = () => {
  const { isDarkMode } = useTheme();
  const { authenticatedFetch } = useAuth(); // Import authenticatedFetch
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  // State for data
  const [products, setProducts] = useState([]);
  const [productStats, setProductStats] = useState({
    total: 0,
    active: 0,
    outOfStock: 0,
    lowStock: 0,
    totalRevenue: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [shopifyNotConnected, setShopifyNotConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // 1. Load from cache first
        const cachedProducts = await storage.get('products_cache');
        if (cachedProducts && cachedProducts.length > 0) {
          // Sanitize cached data to ensure new fields exist
          const sanitizedCache = cachedProducts.map(p => ({
            ...p,
            revenue: p.revenue || 0,
            rating: p.rating || 'N/A'
          }));
          setProducts(sanitizedCache);
          setLoading(false);
        }

        // 2. Fetch from backend using authenticated cookie
        const response = await authenticatedFetch('http://localhost:3000/shopify/products');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            // Authentication issue - token expired or invalid
            setError('Session expired. Please log in again.');
            return;
          }

          if (response.status === 400) {
            // Shopify not connected
            setShopifyNotConnected(true);
            setProducts([]);
            await storage.remove('products_cache');
            return;
          }

          throw new Error(errorData.message || 'Failed to fetch from backend');
        }

        const data = await response.json();

        // Successfully connected, reset any error states
        setShopifyNotConnected(false);
        setError(null);

        // Transform data
        const transformedProducts = data.map(p => ({
          id: p.id,
          name: p.title,
          category: p.product_type || 'Uncategorized',
          price: p.variants?.[0]?.price || '0.00',
          stock: p.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0,
          status: p.status === 'active' ? 'active' : 'archived',
          image: p.image?.src || p.images?.[0]?.src || '📦',
          revenue: 0, // Placeholder as Shopify product API doesn't return revenue directly
          rating: 'N/A', // Placeholder
        })).sort((a, b) => b.stock - a.stock);

        // 3. Update state and cache
        setProducts(transformedProducts);
        await storage.set('products_cache', transformedProducts);

        // Calculate stats based on real data
        const total = transformedProducts.length;
        const active = transformedProducts.filter(p => p.stock >= 10).length;
        const outOfStock = transformedProducts.filter(p => p.stock === 0).length;
        const lowStock = transformedProducts.filter(p => p.stock > 0 && p.stock < 10).length;
        const totalRevenue = transformedProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
        const avgRating = 0; // Placeholder

        setProductStats({
          total,
          active,
          outOfStock,
          lowStock,
          totalRevenue,
          avgRating
        });


      } catch (err) {
        console.error('Failed to fetch products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [authenticatedFetch]);

  // Dynamic Categories calculation
  const categories = useMemo(() => {
    const cats = { 'all': 0 };
    products.forEach(p => {
      cats['all'] = (cats['all'] || 0) + 1;
      const catName = p.category ? p.category.toLowerCase() : 'uncategorized';
      cats[catName] = (cats[catName] || 0) + 1;
    });

    return Object.entries(cats).map(([name, count]) => ({
      name: name === 'all' ? t('products.allProducts') : name.charAt(0).toUpperCase() + name.slice(1),
      id: name,
      count
    })).sort((a, b) => {
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;
      return b.count - a.count;
    });
  }, [products, t]);

  // Max Stock for bar scaling
  const maxStock = useMemo(() => {
    if (!products.length) return 100;
    return Math.max(100, ...products.map(p => p.stock));
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' ||
      (product.category && product.category.toLowerCase() === category);
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show Shopify not connected state
  if (shopifyNotConnected) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-md text-center p-8 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Store size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Connect Your Store</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            To view and manage your products, please connect your Shopify store first.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Store size={20} />
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`p-6 min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`max-w-md text-center p-8 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Something Went Wrong</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('products.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('products.subtitle')}
            </p>
          </div>
          <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
            <Package size={20} />
            {t('products.addNew')}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: <Package size={24} />, label: t('products.totalProducts'), value: productStats.total, change: '+12%', color: 'bg-blue-500' },
            { icon: <DollarSign size={24} />, label: t('products.revenue'), value: `$${productStats.totalRevenue.toLocaleString()}`, change: '+8.5%', color: 'bg-green-500' },
            { icon: <ShoppingCart size={24} />, label: t('products.activeProducts'), value: productStats.active, change: '+3.2%', color: 'bg-purple-500' },
            { icon: <Star size={24} />, label: t('products.avgRating'), value: productStats.avgRating, change: '+0.2', color: 'bg-orange-500' }
          ].map((stat, idx) => (
            <div key={idx} className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <div className={stat.color.replace('bg-', 'text-')}>
                    {stat.icon}
                  </div>
                </div>
                <span className="text-green-600 dark:text-green-400 font-medium">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product List */}
          <div className={`lg:col-span-2 rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">{t('products.catalog')}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg w-full sm:w-auto ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Search size={18} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder={t('products.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`bg-transparent outline-none text-sm w-full sm:w-48 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  />
                </div>
                <button className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg w-full sm:w-auto ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  <Filter size={18} />
                  <span>{t('products.filter')}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3 px-4 font-medium">{t('products.product')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('products.category')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('products.price')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('products.stock')}</th>

                    <th className="text-left py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {product.image.startsWith('http') ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">{product.image}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className={`text-xs px-2 py-1 rounded-full inline-block ${product.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              product.status === 'low' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              {product.status === 'active' ? t('products.inStock') : product.status === 'low' ? t('products.lowStock') : t('products.outOfStock')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}>
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium">${product.price}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-24 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                            }`}>
                            <div
                              className={`h-2 rounded-full ${product.stock > 50 ? 'bg-green-500' :
                                product.stock > 10 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${Math.min((product.stock / maxStock) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span>{product.stock}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column - Analytics */}
          <div className="space-y-6">
            {/* Categories */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('products.categories')}</h3>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${category === cat.id
                      ? isDarkMode ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-500'
                      : isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                      } border`}
                  >
                    <span className="capitalize">{cat.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                      }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Status */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('products.stockStatus')}</h3>
              <div className="space-y-4">
                {[
                  { status: t('products.inStock'), count: productStats.active, color: 'bg-green-500' },
                  { status: t('products.lowStock'), count: productStats.lowStock, color: 'bg-yellow-500' },
                  { status: t('products.outOfStock'), count: productStats.outOfStock, color: 'bg-red-500' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span>{item.status}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full`}
                          style={{ width: `${(item.count / productStats.total) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-medium w-10 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performing */}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('products.topPerforming')}</h3>
              <div className="space-y-4">
                {products.slice(0, 3).map((product, idx) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.image.startsWith('http') ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{product.image}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ${(product.revenue || 0).toLocaleString()} revenue
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-yellow-500" />
                      <span>{product.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;