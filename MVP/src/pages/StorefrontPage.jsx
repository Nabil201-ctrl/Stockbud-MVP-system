
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle, ArrowLeft, Package, ExternalLink, Store, ShoppingCart } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const APP_URL = window.location.origin;

const StorefrontPage = () => {
  const { slug, storeId } = useParams();
  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (slug) {
          const res = await fetch(`${API_URL}/social-stores/public/product/${slug}`);
          if (!res.ok) throw new Error('Product not found');
          const data = await res.json();
          setProduct(data);
        } else if (storeId) {
          const res = await fetch(`${API_URL}/social-stores/public/store/${storeId}`);
          if (!res.ok) throw new Error('Store not found');
          const data = await res.json();
          setStore(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, storeId]);

  const handleWhatsAppRedirect = (targetProduct = product) => {
    const activeStore = slug ? targetProduct.store : store;
    if (!targetProduct || !activeStore) return;

    const phone = activeStore.contact.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hi! I'm interested in "${targetProduct.name}" (${targetProduct.currency} ${targetProduct.price.toLocaleString()}) listed on StockBud.\n\n${APP_URL}/p/${targetProduct.slug}`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="sf-page sf-loading">
        <div className="sf-spinner"></div>
        <p>Loading {storeId ? 'store' : 'product'}...</p>
      </div>
    );
  }

  if (error || (!product && !store)) {
    return (
      <div className="sf-page sf-error">
        <Package size={64} strokeWidth={1.5} />
        <h2>{storeId ? 'Store' : 'Product'} Not Found</h2>
        <p>This path may have been removed or the link is invalid.</p>
        <Link to="/" className="sf-back-home">Go Back Home</Link>
      </div>
    );
  }

  // Single Product View
  if (slug && product) {
    return (
      <div className="sf-page">
        <div className="sf-container">
          <header className="sf-header">
            <Link to={product.store ? `/s/${product.store.id}` : "#"} className="sf-back-btn">
              <ArrowLeft size={20} />
            </Link>
            <div className="sf-brand">
              <ShoppingBag size={24} />
              <span>StockBud</span>
            </div>
            {product.store && (
              <Link to={`/s/${product.store.id}`} className="sf-store-badge">
                <div className="sf-store-icon">
                  {product.store.type === 'whatsapp' ? <MessageCircle size={14} /> : <Store size={14} />}
                </div>
                <span>{product.store.storeName}</span>
              </Link>
            )}
          </header>

          <main className="sf-main">
            <div className="sf-product-image-wrap">
              {product.image ? (
                <img src={product.image} alt={product.name} className="sf-product-image" />
              ) : (
                <div className="sf-product-placeholder">
                  <Package size={80} strokeWidth={1} />
                </div>
              )}
              {product.stock <= 0 && (
                <div className="sf-out-of-stock-badge">Out of Stock</div>
              )}
            </div>

            <div className="sf-product-info">
              <h1 className="sf-product-name">{product.name}</h1>
              <div className="sf-product-price">
                {product.currency} {product.price.toLocaleString()}
              </div>
              {product.description && (
                <p className="sf-product-desc">{product.description}</p>
              )}

              <div className="sf-product-meta">
                <div className="sf-meta-item">
                  <span className="sf-meta-label">Availability</span>
                  <span className={`sf-meta-value ${product.stock <= 0 ? 'sf-out' : product.stock < 10 ? 'sf-low' : 'sf-ok'}`}>
                    {product.stock <= 0 ? 'Out of Stock' : `${product.stock} available`}
                  </span>
                </div>
                {product.store && (
                  <div className="sf-meta-item">
                    <span className="sf-meta-label">Seller</span>
                    <Link to={`/s/${product.store.id}`} className="sf-meta-value sf-link">{product.store.storeName}</Link>
                  </div>
                )}
              </div>

              {product.store?.type === 'whatsapp' && product.stock > 0 && (
                <button onClick={() => handleWhatsAppRedirect()} className="sf-whatsapp-btn">
                  <MessageCircle size={22} />
                  Message Seller on WhatsApp
                </button>
              )}

              {product.store?.type === 'instagram' && product.stock > 0 && (
                <a
                  href={`https://instagram.com/${product.store.contact.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sf-instagram-btn"
                >
                  <Store size={22} />
                  View on Instagram
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </main>

          <footer className="sf-footer">
            <p>Powered by <strong>StockBud</strong></p>
          </footer>
        </div>
        {renderStyles()}
      </div>
    );
  }

  // Store View
  if (storeId && store) {
    return (
      <div className="sf-page store-view">
        <div className="sf-container wide">
          <header className="sf-header">
            <div className="sf-brand">
              <ShoppingBag size={24} />
              <span>StockBud</span>
            </div>
            <div className="sf-store-info-header">
              <div className={`sf-store-icon-large ${store.type === 'whatsapp' ? 'bg-green-500' : 'bg-pink-500'}`}>
                {store.type === 'whatsapp' ? <MessageCircle size={24} /> : <Store size={24} />}
              </div>
              <div className="sf-store-text">
                <h1>{store.storeName}</h1>
                <p>{store.products?.length || 0} Products available</p>
              </div>
            </div>
          </header>

          <main className="sf-main p-6">
            {store.description && (
              <p className="sf-store-description">{store.description}</p>
            )}

            <div className="sf-product-grid">
              {store.products && store.products.length > 0 ? (
                store.products.map(p => (
                  <div key={p.id} className="sf-product-card">
                    <Link to={`/p/${p.slug}`} className="sf-card-image-link">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="sf-card-image" />
                      ) : (
                        <div className="sf-card-placeholder">
                          <Package size={40} />
                        </div>
                      )}
                      {p.stock <= 0 && <span className="sf-card-stock-badge">Out of Stock</span>}
                    </Link>
                    <div className="sf-card-content">
                      <Link to={`/p/${p.slug}`} className="sf-card-name">{p.name}</Link>
                      <div className="sf-card-price">{p.currency} {p.price.toLocaleString()}</div>
                      <div className="sf-card-actions">
                        {store.type === 'whatsapp' && p.stock > 0 && (
                          <button onClick={() => handleWhatsAppRedirect(p)} className="sf-card-msg-btn">
                            <MessageCircle size={16} />
                            Message
                          </button>
                        )}
                        <Link to={`/p/${p.slug}`} className="sf-card-view-btn">
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sf-no-products">
                  <Package size={48} />
                  <p>This store has no products yet.</p>
                </div>
              )}
            </div>
          </main>

          <footer className="sf-footer">
            <p>Discover more on <strong>StockBud</strong></p>
          </footer>
        </div>
        {renderStyles()}
      </div>
    );
  }

  return null;
};

const renderStyles = () => (
  <style>{`
        .sf-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d0d2b 100%);
          color: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .sf-page.store-view {
          align-items: flex-start;
          padding-top: 40px;
        }
        .sf-page.sf-loading, .sf-page.sf-error {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        .sf-page.sf-error { color: #94a3b8; }
        .sf-page.sf-error h2 { color: #fff; font-size: 24px; margin: 0; }
        .sf-page.sf-error p { margin: 0; }
        .sf-back-home {
            margin-top: 20px;
            color: #818cf8;
            text-decoration: none;
            font-weight: 600;
        }
        .sf-spinner {
          width: 48px; height: 48px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: sf-spin 0.8s linear infinite;
        }
        @keyframes sf-spin { to { transform: rotate(360deg); } }

        .sf-container {
          width: 100%;
          max-width: 520px;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.4);
        }
        .sf-container.wide {
            max-width: 1000px;
        }
        .sf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
          gap: 10px;
        }
        .sf-back-btn {
            color: rgba(255,255,255,0.6);
            transition: color 0.2s;
        }
        .sf-back-btn:hover { color: #fff; }
        .sf-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 16px;
          color: #818cf8;
        }
        .sf-store-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.08);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          color: #cbd5e1;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sf-store-badge:hover { background: rgba(255,255,255,0.12); }
        .sf-store-icon {
          width: 22px; height: 22px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.1);
          color: #25d366;
        }

        .sf-store-info-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .sf-store-icon-large {
            width: 44px; height: 44px;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .sf-store-text h1 { margin: 0; font-size: 18px; font-weight: 700; color: #fff; }
        .sf-store-text p { margin: 0; font-size: 12px; color: #94a3b8; }

        .sf-store-description {
            margin: 0 0 24px;
            color: #94a3b8;
            font-size: 15px;
            text-align: center;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .sf-main { padding: 0; }
        .sf-main.p-6 { padding: 24px; }

        /* Grid Layout */
        .sf-product-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
        }
        @media (max-width: 480px) {
            .sf-product-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .sf-container.wide { border-radius: 16px; }
        }

        /* Product Card */
        .sf-product-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .sf-product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border-color: rgba(99, 102, 241, 0.3);
        }
        .sf-card-image-link {
            position: relative;
            aspect-ratio: 1;
            display: block;
            background: rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .sf-card-image {
            width: 100%; height: 100%; object-fit: cover;
            transition: transform 0.3s;
        }
        .sf-product-card:hover .sf-card-image { transform: scale(1.05); }
        .sf-card-placeholder {
            width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
            color: rgba(255,255,255,0.1);
        }
        .sf-card-stock-badge {
            position: absolute; top: 8px; right: 8px;
            background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
            padding: 4px 8px; border-radius: 8px;
        }
        .sf-card-content { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
        .sf-card-name {
            font-size: 14px; font-weight: 600; color: #fff; text-decoration: none;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sf-card-price { font-size: 16px; font-weight: 700; color: #34d399; }
        .sf-card-actions {
            margin-top: 8px; display: flex; gap: 6px;
        }
        .sf-card-msg-btn {
            flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
            padding: 8px; border-radius: 10px; border: none; font-size: 12px; font-weight: 700;
            background: #25d366; color: #fff; cursor: pointer; transition: opacity 0.2s;
        }
        .sf-card-msg-btn:hover { opacity: 0.9; }
        .sf-card-view-btn {
            padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 600;
            background: rgba(255,255,255,0.08); color: #fff; text-decoration: none;
            transition: background 0.2s;
        }
        .sf-card-view-btn:hover { background: rgba(255,255,255,0.15); }

        .sf-no-products {
            grid-column: 1 / -1;
            padding: 60px 20px; text-align: center; color: #475569;
            display: flex; flex-direction: column; align-items: center; gap: 12px;
        }

        /* Detail View Specifics */
        .sf-product-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .sf-product-image {
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .sf-product-image:hover { transform: scale(1.03); }
        .sf-product-placeholder {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: #475569;
        }
        .sf-out-of-stock-badge {
          position: absolute;
          top: 16px; right: 16px;
          background: #ef4444;
          color: #fff;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .sf-product-info { padding: 24px; }
        .sf-product-name {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .sf-product-price {
          font-size: 28px;
          font-weight: 800;
          color: #34d399;
          margin-bottom: 16px;
        }
        .sf-product-desc {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .sf-product-meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .sf-meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sf-meta-label {
          color: #64748b;
          font-size: 14px;
        }
        .sf-meta-value {
          font-weight: 600;
          font-size: 14px;
          color: #e2e8f0;
        }
        .sf-meta-value.sf-ok { color: #34d399; }
        .sf-meta-value.sf-low { color: #fbbf24; }
        .sf-meta-value.sf-out { color: #ef4444; }
        .sf-meta-value.sf-link { color: #818cf8; text-decoration: none; }
        .sf-meta-value.sf-link:hover { text-decoration: underline; }

        .sf-whatsapp-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #fff;
          transition: all 0.2s;
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.3);
          font-family: inherit;
        }
        .sf-whatsapp-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(37, 211, 102, 0.4);
        }
        .sf-whatsapp-btn:active { transform: translateY(0); }

        .sf-instagram-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
          color: #fff;
          transition: all 0.2s;
          box-shadow: 0 8px 24px rgba(131, 58, 180, 0.3);
        }
        .sf-instagram-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(131, 58, 180, 0.4);
        }

        .sf-footer {
          text-align: center;
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          color: #475569;
          font-size: 13px;
        }
        .sf-footer strong { color: #818cf8; }
      `}</style>
);

export default StorefrontPage;
