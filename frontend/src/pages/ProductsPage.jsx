
import React, { useState } from 'react';
import { Package, TrendingUp, DollarSign, ShoppingCart, Star, Eye, Tag, Filter, Search, MoreVertical } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ProductsPage = () => {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  const productStats = {
    total: 156,
    active: 128,
    outOfStock: 12,
    lowStock: 16,
    totalRevenue: 125642.89,
    avgRating: 4.2
  };

  const products = [
    { id: 1, name: 'Premium Headphones', category: 'Electronics', price: 299.99, stock: 45, revenue: 24500, rating: 4.5, status: 'active', image: '' },
    { id: 2, name: 'Wireless Mouse', category: 'Electronics', price: 49.99, stock: 120, revenue: 18400, rating: 4.3, status: 'active', image: '' },
    { id: 3, name: 'Office Chair', category: 'Furniture', price: 349.99, stock: 8, revenue: 31200, rating: 4.7, status: 'low', image: '' },
    { id: 4, name: 'Desk Lamp', category: 'Home', price: 39.99, stock: 0, revenue: 8900, rating: 4.0, status: 'out', image: '' },
    { id: 5, name: 'Notebook Set', category: 'Stationery', price: 24.99, stock: 200, revenue: 12400, rating: 4.2, status: 'active', image: '' },
    { id: 6, name: 'Coffee Mug', category: 'Home', price: 19.99, stock: 150, revenue: 9800, rating: 4.1, status: 'active', image: '' }
  ];

  const categories = [
    { name: 'All Products', count: 156 },
    { name: 'Electronics', count: 42 },
    { name: 'Home & Garden', count: 38 },
    { name: 'Furniture', count: 24 },
    { name: 'Clothing', count: 32 },
    { name: 'Stationery', count: 20 }
  ];

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Product Management</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage your product catalog and inventory
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2">
            <Package size={20} />
            Add New Product
          </button>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: <Package size={24} />, label: 'Total Products', value: productStats.total, change: '+12%', color: 'bg-blue-500' },
            { icon: <DollarSign size={24} />, label: 'Total Revenue', value: `$${productStats.totalRevenue.toLocaleString()}`, change: '+8.5%', color: 'bg-green-500' },
            { icon: <ShoppingCart size={24} />, label: 'Active Products', value: productStats.active, change: '+3.2%', color: 'bg-purple-500' },
            { icon: <Star size={24} />, label: 'Avg Rating', value: productStats.avgRating, change: '+0.2', color: 'bg-orange-500' }
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
          {}
          <div className={`lg:col-span-2 rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Product Catalog</h2>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`bg-transparent outline-none text-sm w-48 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  />
                </div>
                <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  <Filter size={18} />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-left py-3 px-4 font-medium">Price</th>
                    <th className="text-left py-3 px-4 font-medium">Stock</th>
                    <th className="text-left py-3 px-4 font-medium">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium">Rating</th>
                    <th className="text-left py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className={`border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{product.image}</div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                              product.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              product.status === 'low' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {product.status === 'active' ? 'In Stock' : product.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium">${product.price}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-24 h-2 rounded-full ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            <div
                              className={`h-2 rounded-full ${
                                product.stock > 50 ? 'bg-green-500' :
                                product.stock > 10 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(product.stock, 100)}%` }}
                            ></div>
                          </div>
                          <span>{product.stock}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <DollarSign size={14} />
                          <span>${product.revenue.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Star size={14} className="text-yellow-500" />
                          <span>{product.rating}</span>
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

          {}
          <div className="space-y-6">
            {}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">Categories</h3>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setCategory(cat.name.toLowerCase())}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      category === cat.name.toLowerCase()
                        ? isDarkMode ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-500'
                        : isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                    } border`}
                  >
                    <span>{cat.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">Stock Status</h3>
              <div className="space-y-4">
                {[
                  { status: 'In Stock', count: productStats.active, color: 'bg-green-500' },
                  { status: 'Low Stock', count: productStats.lowStock, color: 'bg-yellow-500' },
                  { status: 'Out of Stock', count: productStats.outOfStock, color: 'bg-red-500' }
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

            {}
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">Top Performing</h3>
              <div className="space-y-4">
                {products.slice(0, 3).map((product, idx) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{product.image}</div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ${product.revenue.toLocaleString()} revenue
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