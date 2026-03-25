
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, MessageCircle, ArrowLeft, Package, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const APP_URL = window.location.origin;

const StorefrontPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`${API_URL}/social-stores/public/product/${slug}`);
                if (!res.ok) throw new Error('Product not found');
                const data = await res.json();
                setProduct(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [slug]);

    const handleWhatsAppRedirect = () => {
        if (!product || !product.store) return;
        const phone = product.store.contact.replace(/[^0-9]/g, '');
        const message = encodeURIComponent(
            `Hi! I'm interested in "${product.name}" (${product.currency} ${product.price.toLocaleString()}) listed on StockBud.\n\n${APP_URL}/p/${product.slug}`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    if (loading) {
        return (
            <div className="sf-page sf-loading">
                <div className="sf-spinner"></div>
                <p>Loading product...</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="sf-page sf-error">
                <Package size={64} strokeWidth={1.5} />
                <h2>Product Not Found</h2>
                <p>This product may have been removed or the link is invalid.</p>
            </div>
        );
    }

    return (
        <div className="sf-page">
            <div className="sf-container">
                <header className="sf-header">
                    <div className="sf-brand">
                        <ShoppingBag size={24} />
                        <span>StockBud</span>
                    </div>
                    {product.store && (
                        <div className="sf-store-badge">
                            <div className="sf-store-icon">
                                {product.store.type === 'whatsapp' ? (
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                    </svg>
                                )}
                            </div>
                            <span>{product.store.storeName}</span>
                        </div>
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
                                <span className="sf-meta-label">Stock</span>
                                <span className={`sf-meta-value ${product.stock <= 0 ? 'sf-out' : product.stock < 10 ? 'sf-low' : 'sf-ok'}`}>
                                    {product.stock <= 0 ? 'Out of Stock' : `${product.stock} available`}
                                </span>
                            </div>
                            {product.store && (
                                <div className="sf-meta-item">
                                    <span className="sf-meta-label">Sold by</span>
                                    <span className="sf-meta-value">{product.store.storeName}</span>
                                </div>
                            )}
                        </div>

                        {product.store?.type === 'whatsapp' && product.stock > 0 && (
                            <button onClick={handleWhatsAppRedirect} className="sf-whatsapp-btn">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Message on WhatsApp
                            </button>
                        )}

                        {product.store?.type === 'instagram' && product.stock > 0 && (
                            <a
                                href={`https://instagram.com/${product.store.contact.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sf-instagram-btn"
                            >
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                </svg>
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
        .sf-page.sf-loading, .sf-page.sf-error {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        .sf-page.sf-error { color: #94a3b8; }
        .sf-page.sf-error h2 { color: #fff; font-size: 24px; margin: 0; }
        .sf-page.sf-error p { margin: 0; }
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
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.4);
        }
        .sf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
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
        }
        .sf-store-icon {
          width: 22px; height: 22px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.1);
          color: #25d366;
        }

        .sf-main { padding: 0; }

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
        </div>
    );
};

export default StorefrontPage;
