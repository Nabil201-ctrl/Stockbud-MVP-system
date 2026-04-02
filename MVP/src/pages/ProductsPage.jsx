
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, DollarSign, ShoppingCart, Star, Eye, Tag, Filter, Search, MoreVertical, Store, AlertCircle, Bell, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { storage } from '../utils/db';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ITEMS_PER_PAGE = 6;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const IMAGE_API_URL = import.meta.env.VITE_IMAGE_API_URL || 'http://localhost:3002';

const ProductsPage = () => {
  const { isDarkMode } = useTheme();
  const { authenticatedFetch, user } = useAuth();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');


  const [products, setProducts] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [productStats, setProductStats] = useState({
    total: 0,
    active: 0,
    outOfStock: 0,
    lowStock: 0,
    totalRevenue: 0,
    avgRating: 0,
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [shopifyNotConnected, setShopifyNotConnected] = useState(false);
  const [error, setError] = useState(null);


  const [thresholds, setThresholds] = useState({});
  const [showThresholdModal, setShowThresholdModal] = useState(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [triggerAddProduct, setTriggerAddProduct] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('images', imageFile);
      const res = await fetch(`${IMAGE_API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadingImage(false);
      return data.urls?.[0];
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadingImage(false);
      return null;
    }
  };

  const activeCurrency = useMemo(() => {
    if (products.length > 0 && products[0].currency) {
      return products[0].currency;
    }
    return user?.currency || 'USD';
  }, [products, user?.currency]);

  useEffect(() => {
    const loadThresholds = async () => {
      const saved = await storage.get(`product_thresholds_${user?.activeShopId || 'default'}`);
      if (saved) {
        setThresholds(saved);
      }
    };
    loadThresholds();
  }, [user?.activeShopId]);

  useEffect(() => {
    const init = async () => {
      await fetchProducts();
      await fetchDashboardStats();
    };
    init();
  }, [authenticatedFetch, user?.activeShopId]);

  const fetchDashboardStats = async () => {
    if (!user?.activeShopId) return;
    try {
      const response = await authenticatedFetch(`${API_URL}/dashboard/stats`);
      if (response.ok) {
        const data = await response.json();
        setProductStats(prev => ({
          ...prev,
          totalRevenue: data.revenue?.total || 0,
          topProducts: data.topProducts || [],
          avgRating: 0 // Resetting mock avgRating
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  const handleProductAdded = async () => {
    await fetchProducts();
    await fetchDashboardStats();
  };

  // Update notifications when products or thresholds change
  useEffect(() => {
    if (products.length > 0 && Object.keys(thresholds).length > 0) {
      const newNotifications = [];
      products.forEach(p => {
        const t = thresholds[p.id];
        if (t !== undefined && p.stock <= t) {
          newNotifications.push({ id: p.id, name: p.name, stock: p.stock, threshold: t });
        }
      });
      setNotifications(newNotifications);
      if (newNotifications.length > 0) setShowNotifications(true);
    } else {
      setNotifications([]);
    }
  }, [products, thresholds]);

  const handleSaveThreshold = async () => {
    if (!showThresholdModal) return;
    const value = parseInt(thresholdInput, 10);
    const newThresholds = { ...thresholds };

    if (isNaN(value) || value < 0) {
      delete newThresholds[showThresholdModal.id];
    } else {
      newThresholds[showThresholdModal.id] = value;
    }

    setThresholds(newThresholds);
    await storage.set(`product_thresholds_${user?.activeShopId || 'default'}`, newThresholds);

    setShowThresholdModal(null);
    setThresholdInput('');
  };

  const closeModals = () => {
    setTriggerAddProduct(false);
    setProductToEdit(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const fetchProducts = async (cursor = null, direction = 'next') => {
    if (!user?.activeShopId) {
      setLoading(false);
      setShopifyNotConnected(true);
      setProducts([]);
      return;
    }

    const isSocialStore = user.socialStores?.some(s => s.id === user.activeShopId);
    if (isSocialStore) {
      setShopifyNotConnected(false);
    }

    try {
      let url;
      if (!cursor) {
        // PWA Offline Storage: Immediately load from IndexedDB
        const cacheKey = `products_${user.activeShopId}`;
        const cachedProducts = await storage.get(cacheKey);
        if (cachedProducts) {
          setProducts(cachedProducts.products);
          setProductStats(prev => ({ ...prev, ...(cachedProducts.stats || {}) }));
          setPageInfo(cachedProducts.pageInfo);
          setTotalCount(cachedProducts.totalCount);
          setLoading(false);
        } else {
          setLoading(true);
        }
      } else {
        setPaginationLoading(true);
      }

      // Construct Shopify URL with pagination
      url = `${API_URL}/shopify/products?first=${ITEMS_PER_PAGE}`;
      if (cursor) {
        if (direction === 'next') {
          url = `${API_URL}/shopify/products?first=${ITEMS_PER_PAGE}&after=${encodeURIComponent(cursor)}`;
        } else {
          url = `${API_URL}/shopify/products?last=${ITEMS_PER_PAGE}&before=${encodeURIComponent(cursor)}`;
        }
      }

      const response = await authenticatedFetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }

        if (response.status === 400) {
          setShopifyNotConnected(true);
          setProducts([]);
          return;
        }

        throw new Error(errorData.message || 'Failed to fetch from backend');
      }

      const data = await response.json();

      // Successfully connected
      setShopifyNotConnected(false);
      setError(null);

      // Handle response structure { products: [], pageInfo: {}, totalCount: number }
      const productsData = Array.isArray(data) ? data : (data.products || []);
      const pageInfoData = data.pageInfo || { hasNextPage: false, hasPreviousPage: false };
      const serverTotalCount = data.totalCount || 0;

      setPageInfo(pageInfoData);
      setTotalCount(serverTotalCount);

      // Update page number
      if (!cursor) {
        setCurrentPage(1);
      } else if (direction === 'next') {
        setCurrentPage(prev => prev + 1);
      } else {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }

      // Transform data
      const transformedProducts = productsData.map(p => ({
        id: p.id,
        name: p.title,
        category: p.product_type || 'Uncategorized',
        price: p.variants?.[0]?.price || '0.00',
        stock: p.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0) || 0,
        status: p.status === 'active' ? 'active' : 'archived',
        image: p.images?.[0]?.src || '',
        revenue: 0,
        rating: 'N/A',
      }));

      setProducts(transformedProducts);

      // Calculate stats from current page data
      const active = transformedProducts.filter(p => p.stock >= 10).length;
      const outOfStock = transformedProducts.filter(p => p.stock === 0).length;
      const lowStock = transformedProducts.filter(p => p.stock > 0 && p.stock < 10).length;

      setProductStats(prev => ({
        ...prev,
        total: serverTotalCount || transformedProducts.length,
        active,
        outOfStock,
        lowStock,
      }));

      // PWA Offline Storage: Cache new fresh data
      if (!cursor) {
        const cacheKey = `products_${user?.activeShopId || 'default'}`;
        await storage.set(cacheKey, {
          products: transformedProducts,
          stats: {
            ...productStats,
            total: serverTotalCount || transformedProducts.length,
            active,
            outOfStock,
            lowStock,
          },
          pageInfo: pageInfoData,
          totalCount: serverTotalCount
        });
      }

    } catch (err) {
      console.error('Failed to fetch products:', err);
      if (!products.length && !cursor) {
        setError(err.message || 'Failed to load products. You might be offline.');
      }
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold mb-3">No Active Store</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            To view and manage your products, please connect or select a store first.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Store size={20} />
            Connect Your Store
          </Link>
        </div>
      </div>
    );
  }


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
        { }
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{t('products.title')}</h1>
              {user?.activeShopId && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${user.socialStores?.some(s => s.id === user.activeShopId)
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${user.socialStores?.some(s => s.id === user.activeShopId) ? 'bg-purple-500' : 'bg-green-500'} animate-pulse`} />
                  {user.shopifyStores?.find(s => s.id === user.activeShopId)?.name ||
                    user.socialStores?.find(s => s.id === user.activeShopId)?.name || 'Store'}
                </div>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {t('products.subtitle')}
            </p>
          </div>
          {user?.activeShopId && user.socialStores?.some(s => s.id === user.activeShopId) && (
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                setTriggerAddProduct(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Package size={18} />
              Add Social Product
            </button>
          )}
        </div>

        { }
        <div id="products-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: <Package size={24} />, label: t('products.totalProducts'), value: productStats.total || 0, change: '+12%', color: 'bg-blue-500' },
            { icon: <DollarSign size={24} />, label: t('products.revenue'), value: `${activeCurrency} ${(productStats.totalRevenue || 0).toLocaleString()}`, change: '+8.5%', color: 'bg-green-500' },
            { icon: <ShoppingCart size={24} />, label: t('products.activeProducts'), value: productStats.active || 0, change: '+3.2%', color: 'bg-purple-500' },
            { icon: <Star size={24} />, label: t('products.avgRating'), value: productStats.avgRating || 0, change: '+0.2', color: 'bg-orange-500' }
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
          { }
          <div className={`lg:col-span-2 rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">{t('products.catalog')}</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div id="products-search" className={`flex items-center gap-2 px-4 py-2 rounded-lg w-full sm:w-auto ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
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

            <div id="products-table" className="overflow-x-auto relative">
              { }
              {paginationLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading products...</span>
                  </div>
                </div>
              )}

              {filteredProducts.length === 0 && !paginationLoading ? (
                <div className="py-12 text-center">
                  <Package size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No products found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                    {searchTerm || category !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Your store has no products yet'}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-3 px-4 font-medium">{t('products.product')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('products.category')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('products.price')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('products.stock')}</th>
                      <th className="text-left py-3 px-4 font-medium">Threshold</th>
                      <th className="text-left py-3 px-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}>
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
                        <td className="py-4 px-4 font-medium">
                          {product.currency ? `${product.currency} ` : '$'}
                          {product.price.toLocaleString()}
                        </td>
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
                          <div className={`text-sm ${thresholds[product.id] !== undefined && product.stock <= thresholds[product.id] ? 'text-red-500 font-bold' : ''}`}>
                            {thresholds[product.id] !== undefined ? thresholds[product.id] : 'Not Set'}
                          </div>
                        </td>
                        <td className="py-4 px-4 flex gap-2">
                          {user?.socialStores?.some(s => s.id === user.activeShopId) && (
                            <>
                              <button
                                onClick={() => {
                                  setImageFile(null);
                                  setImagePreview(product.image);
                                  setProductToEdit(product);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-500"
                                title="Edit Product"
                              >
                                <Package size={18} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this product?')) {
                                    try {
                                      const res = await authenticatedFetch(`${API_URL}/social-stores/${user.activeShopId}/products/${product.id}`, { method: 'DELETE' });
                                      if (res.ok) await fetchProducts();
                                    } catch (err) { alert('Failed to delete product') }
                                  }
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500"
                                title="Delete Product"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setShowThresholdModal(product);
                              setThresholdInput(thresholds[product.id] !== undefined ? thresholds[product.id].toString() : '');
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-500"
                            title="Set Threshold"
                          >
                            <Bell size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <button
                onClick={() => fetchProducts(pageInfo.startCursor, 'prev')}
                disabled={!pageInfo.hasPreviousPage || paginationLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!pageInfo.hasPreviousPage || paginationLoading
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                  : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                ← Previous
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                <span className="font-medium">Page {currentPage}</span>
                {totalCount > 0 && (
                  <span> · {totalCount} total products</span>
                )}
              </div>
              <button
                onClick={() => fetchProducts(pageInfo.endCursor, 'next')}
                disabled={!pageInfo.hasNextPage || paginationLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!pageInfo.hasNextPage || paginationLoading
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                Next →
              </button>
            </div>
          </div>

          { }
          <div className="space-y-6">
            { }
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

            { }
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('products.stockStatus')}</h3>
              <div className="space-y-4">
                {[
                  { status: t('products.inStock'), count: productStats.active || 0, color: 'bg-green-500' },
                  { status: t('products.lowStock'), count: productStats.lowStock || 0, color: 'bg-yellow-500' },
                  { status: t('products.outOfStock'), count: productStats.outOfStock || 0, color: 'bg-red-500' }
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
                          style={{ width: `${productStats.total > 0 ? (item.count / productStats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="font-medium w-10 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            { }
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">{t('products.topPerforming')}</h3>
              <div className="space-y-4">
                {(productStats.topProducts || []).slice(0, 5).map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <Package size={20} className="text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate text-sm">{product.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {activeCurrency} {(product.revenue || 0).toLocaleString()} revenue
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TrendingUp size={14} className="text-green-500" />
                      <span className="text-xs font-medium">{product.count}</span>
                    </div>
                  </div>
                ))}
                {(!productStats.topProducts || productStats.topProducts.length === 0) && (
                  <div className="text-center py-4 text-sm text-gray-500">No data found</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showThresholdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm rounded-xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Bell size={20} className="text-blue-500" />
                  Set Stock Threshold
                </h3>
                <button
                  onClick={() => setShowThresholdModal(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Alert me when stock for <strong>{showThresholdModal.name}</strong> falls to or below:
                </p>
                <input
                  type="number"
                  min="0"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  placeholder="e.g. 10"
                  className={`w-full p-3 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-shadow ${isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                />
                <p className="text-xs text-gray-500 mt-2">Leave blank to clear threshold.</p>
              </div>
              <div className={`p-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  onClick={() => setShowThresholdModal(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveThreshold}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save Threshold
                </button>
              </div>
            </div>
          </div>
        )}

        {showNotifications && notifications.length > 0 && (
          <div className="fixed bottom-6 right-6 z-40 max-w-sm w-full space-y-3">
            <div className={`p-4 rounded-xl shadow-xl flex items-start gap-4 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-red-500 mb-1">Low Stock Alerts</h4>
                <div className="max-h-32 overflow-y-auto pr-2 space-y-2">
                  {notifications.map((n, i) => (
                    <p key={i} className={`text-sm ${n.stock === 0 ? 'text-red-500 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                      <span className="font-medium text-gray-900 dark:text-white truncate block">{n.name} - {n.stock === 0 ? 'Out of Stock' : 'Low Stock'}</span>
                      <span className="text-xs">Stock: {n.stock} (Threshold: {n.threshold})</span>
                    </p>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {triggerAddProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Package className="text-blue-500" />
                Add Social Product
              </h3>
              <button onClick={closeModals} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                const uploadedUrl = await uploadImage();
                if (uploadedUrl) {
                  data.image = uploadedUrl;
                }

                try {
                  const res = await authenticatedFetch(`${API_URL}/social-stores/${user.activeShopId}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });
                  if (res.ok) {
                    await fetchProducts();
                    closeModals();
                  }
                } catch (err) {
                  alert("Failed to add product");
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold mb-1">Product Title</label>
                <input name="title" required placeholder="e.g. Vintage Sunglasses" className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Price</label>
                  <input name="price" type="number" step="0.01" required placeholder="0.00" className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Stock Level</label>
                  <input name="stock" type="number" required placeholder="10" className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Category</label>
                <input name="category" placeholder="e.g. Eyewear" className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-bold mb-2">Product Image</label>
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-gray-400" />
                    )}
                  </div>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <Upload size={18} />
                    <span className="text-sm font-medium">Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
              <div className={`p-4 border-t mt-6 flex justify-end gap-3 ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <button type="button" onClick={closeModals} className="px-6 py-2.5 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={uploadingImage} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
                  {uploadingImage ? 'Uploading...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Package className="text-blue-500" />
                Edit Product
              </h3>
              <button onClick={closeModals} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                const uploadedUrl = await uploadImage();
                if (uploadedUrl) {
                  data.image = uploadedUrl;
                }

                try {
                  const res = await authenticatedFetch(`${API_URL}/social-stores/${user.activeShopId}/products/${productToEdit.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });
                  if (res.ok) {
                    await fetchProducts();
                    closeModals();
                  }
                } catch (err) {
                  alert("Failed to update product");
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold mb-1">Product Title</label>
                <input name="title" defaultValue={productToEdit.name} required className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Price</label>
                  <input name="price" type="number" step="0.01" defaultValue={productToEdit.price} required className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Stock Level</label>
                  <input name="stock" type="number" defaultValue={productToEdit.stock} required className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Category</label>
                <input name="category" defaultValue={productToEdit.category} className={`w-full p-3 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`} />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-bold mb-2">Product Image</label>
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={32} className="text-gray-400" />
                    )}
                  </div>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <Upload size={18} />
                    <span className="text-sm font-medium">Change Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
              <div className={`p-4 border-t mt-6 flex justify-end gap-3 ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <button type="button" onClick={closeModals} className="px-6 py-2.5 rounded-xl font-bold">Cancel</button>
                <button type="submit" disabled={uploadingImage} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
                  {uploadingImage ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;