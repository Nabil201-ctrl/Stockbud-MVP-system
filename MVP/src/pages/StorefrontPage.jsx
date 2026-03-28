import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle, ArrowLeft, Package, ExternalLink, Store, ShoppingCart, Star, Instagram, Check, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StorefrontPage = () => {
  const { slug, storeId } = useParams();
  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    quantity: 1
  });

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
          setCurrentImage(data.images?.[0] || data.image);

          if (data.storeId) {
            const storeRes = await fetch(`${API_URL}/social-stores/public/store/${data.storeId}`);
            if (storeRes.ok) {
              const storeData = await storeRes.json();
              setStore(storeData);
            }
          }
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

  const handleWhatsAppContact = () => {
    if (!store || !product) return;
    const phone = store.contact || '';
    const cleanedPhone = phone.replace(/\D/g, '');
    const message = `Hi ${store.storeName}, I'm interested in "${product.name}" (${window.location.href})`;
    window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/orders/public/${product.id}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutData),
      });
      if (!res.ok) throw new Error('Failed to place order');
      setOrderSuccess(true);
      setTimeout(() => {
        setShowCheckout(false);
        setOrderSuccess(false);
        setCheckoutData({ customerName: '', customerPhone: '', customerAddress: '', quantity: 1 });
      }, 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sf-page sf-loading">
        <div className="sf-spinner"></div>
        <p>Loading...</p>
        {renderStyles()}
      </div>
    );
  }

  if (error || (!product && !store)) {
    return (
      <div className="sf-page sf-error-page">
        <header className="sf-header">
          <div className="sf-brand">
            <ShoppingBag size={24} />
            <span>StockBud</span>
          </div>
        </header>
        <div className="sf-error-card">
          <Search size={64} />
          <h2>Not Found</h2>
          <p>{error || "The link might be broken."}</p>
          <Link to="/" className="sf-btn-home">Go Home</Link>
        </div>
        {renderStyles()}
      </div>
    );
  }

  const renderHeader = (transparent = false) => (
    <header className={`sf-header ${transparent ? 'transparent' : ''}`}>
      <div className="sf-header-left">
        {slug ? (
          <Link to={store ? `/s/${store.id}` : "#"} className="sf-back-btn">
            <ArrowLeft size={20} />
            <span>{store?.storeName || 'Back'}</span>
          </Link>
        ) : (
          <div className="sf-brand">
            <ShoppingBag size={24} />
            <span>StockBud</span>
          </div>
        )}
      </div>
      {!slug && store && (
        <div className="sf-store-info-compact">
          <div className="sf-avatar">
            {store.type === 'whatsapp' ? <MessageCircle size={20} /> : <Store size={20} />}
          </div>
          <span>{store.storeName}</span>
        </div>
      )}
    </header>
  );

  // --- Product Details View ---
  if (slug && product) {
    const otherProducts = store?.products?.filter(p => p.id !== product.id) || [];

    return (
      <div className="sf-page detail-view">
        {renderHeader(true)}
        <div className="sf-container">
          <main className="detail-split">
            {/* Left: Product Info */}
            <div className="sf-product-detail-info">
              <div className="sf-product-gallery">
                <div className="sf-main-image-contain">
                  <img src={currentImage || product.images?.[0] || product.image} alt={product.name} />
                  {product.stock <= 0 && <span className="sf-out-badge">Out of Stock</span>}
                </div>
                {product.images && product.images.length > 1 && (
                  <div className="sf-image-thumb-row">
                    {product.images.map((img, i) => (
                      <div
                        key={i}
                        className={`sf-thumb ${(currentImage || product.images[0]) === img ? 'active' : ''}`}
                        onClick={() => setCurrentImage(img)}
                      >
                        <img src={img} alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sf-product-description-wrap">
                <h1 className="sf-detail-name">{product.name}</h1>
                <div className="sf-detail-price">
                  {product.currency} {product.price.toLocaleString()}
                </div>

                {product.description && (
                  <p className="sf-detail-desc">{product.description}</p>
                )}

                <div className="sf-action-btns">
                  {product.stock > 0 && (
                    <button onClick={() => setShowCheckout(true)} className="sf-buy-btn rounded">
                      <ShoppingCart size={18} /> Buy Now
                    </button>
                  )}
                  {store?.type === 'whatsapp' && (
                    <button onClick={handleWhatsAppContact} className="sf-wa-btn rounded">
                      <MessageCircle size={18} /> Message on WhatsApp
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Catalogue */}
            <div className="sf-side-catalogue">
              <h3 className="sf-catalogue-title">More from {store?.storeName}</h3>
              <div className="sf-catalogue-scroll">
                {otherProducts.length > 0 ? (
                  otherProducts.map(p => (
                    <Link to={`/p/${p.slug}`} key={p.id} className="sf-mini-card">
                      <div className="sf-mini-img">
                        <img src={p.images?.[0] || p.image} alt="" />
                      </div>
                      <div className="sf-mini-info">
                        <h4>{p.name}</h4>
                        <p>{p.currency} {p.price.toLocaleString()}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="sf-no-more">
                    <Package size={32} />
                    <p>No other products</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {showCheckout && (
          <div className="sf-modal-overlay" onClick={(e) => e.target.className === 'sf-modal-overlay' && setShowCheckout(false)}>
            <div className="sf-modal">
              <div className="sf-modal-header">
                <h3>Checkout</h3>
                <button onClick={() => setShowCheckout(false)} className="sf-close-btn">&times;</button>
              </div>
              {orderSuccess ? (
                <div className="sf-order-success">
                  <Check size={48} />
                  <h4>Order Placed!</h4>
                  <p>Your order has been received.</p>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="sf-checkout-form">
                  <div className="sf-form-group">
                    <label>Full Name</label>
                    <input type="text" required value={checkoutData.customerName} onChange={e => setCheckoutData({ ...checkoutData, customerName: e.target.value })} placeholder="Your Name" />
                  </div>
                  <div className="sf-form-group">
                    <label>Phone Number</label>
                    <input type="tel" required value={checkoutData.customerPhone} onChange={e => setCheckoutData({ ...checkoutData, customerPhone: e.target.value })} placeholder="Phone" />
                  </div>
                  <div className="sf-form-group">
                    <label>Address</label>
                    <textarea required value={checkoutData.customerAddress} onChange={e => setCheckoutData({ ...checkoutData, customerAddress: e.target.value })} placeholder="Delivery Address" />
                  </div>
                  <div className="sf-total-summary">
                    <span>Total:</span>
                    <span>{product.currency} {product.price.toLocaleString()}</span>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="sf-submit-order-btn">
                    {isSubmitting ? 'Ordering...' : 'Confirm Order'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
        <footer className="sf-footer">
          <p>Powered by <strong>StockBud</strong></p>
        </footer>
        {renderStyles()}
      </div>
    );
  }

  // --- Store View ---
  if (storeId && store) {
    return (
      <div className="sf-page store-view">
        {renderHeader()}
        <div className="sf-container">
          <div className="sf-store-banner">
            <div className="sf-store-profile">
              <div className="sf-profile-avatar">
                {store.type === 'whatsapp' ? <MessageCircle size={40} /> : <Store size={40} />}
              </div>
              <div className="sf-profile-info">
                <h1>{store.storeName}</h1>
                <p>{store.products?.length || 0} Products</p>
              </div>
            </div>
          </div>

          <main className="sf-product-grid">
            {store.products?.length > 0 ? (
              store.products.map(p => (
                <div key={p.id} className="sf-product-card" onClick={() => window.location.href = `/p/${p.slug}`}>
                  <div className="sf-card-image-wrap">
                    <img src={p.images?.[0] || p.image} alt={p.name} className="sf-card-image" />
                    {p.stock <= 0 && <span className="sf-card-stock-badge">Sold Out</span>}
                  </div>
                  <div className="sf-card-content">
                    <span className="sf-card-name">{p.name}</span>
                    <span className="sf-card-price">{p.currency} {p.price.toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="sf-no-products">
                <Package size={48} />
                <p>No products yet.</p>
              </div>
            )}
          </main>
        </div>
        <footer className="sf-footer">
          <p>Powered by <strong>StockBud</strong></p>
        </footer>
        {renderStyles()}
      </div>
    );
  }

  return null;
};

const renderStyles = () => (
  <style>{`
        :root {
          --brand-bg: #0f172a;
          --brand-surface: #1e293b;
          --brand-primary: #4f46e5;
          --brand-primary-hover: #6366f1;
          --brand-accent: #10b981;
          --brand-border: rgba(255,255,255,0.08);
          --brand-text: #f8fafc;
          --brand-text-muted: #94a3b8;
          
          /* Pinterest Layout Aliases with StockBud Colors */
          --pin-bg: var(--brand-bg);
          --pin-card: var(--brand-surface);
          --pin-text: var(--brand-text);
          --pin-text-muted: var(--brand-text-muted);
          --pin-primary: var(--brand-primary);
          --pin-surface: var(--brand-surface);
          --pin-border: var(--brand-border);
        }

        * { box-sizing: border-box; }

        .sf-page {
          min-height: 100vh;
          background: var(--pin-bg);
          color: var(--pin-text);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
        }

        .sf-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 16px;
        }

        .sf-header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(20px);
          padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--pin-border);
        }
        .sf-header.transparent { background: transparent; border-bottom: none; position: relative; }

        .sf-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 22px; color: #fff; }
        .sf-brand span { color: var(--brand-primary); }
        
        .sf-back-btn { display: flex; align-items: center; gap: 8px; color: var(--pin-text-muted); text-decoration: none; font-weight: 600; padding: 8px 12px; border-radius: 20px; transition: color 0.2s, background 0.2s; }
        .sf-back-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }

        .sf-store-profile { display: flex; align-items: center; gap: 20px; padding: 48px 0; border-bottom: 1px solid var(--pin-border); margin-bottom: 32px; }
        .sf-profile-avatar { 
            width: 80px; height: 80px; border-radius: 24px; 
            background: linear-gradient(135deg, var(--brand-primary), #6366f1); 
            display: flex; align-items: center; justify-content: center; 
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);
            color: white;
        }
        .sf-profile-info h1 { margin: 0; font-size: 28px; font-weight: 800; color: #fff; }
        .sf-profile-info p { margin: 6px 0 0; color: var(--pin-text-muted); font-weight: 600; font-size: 15px; }

        /* Masonry Grid */
        .sf-product-grid {
          column-count: 2; column-gap: 20px; padding: 16px 0;
        }
        @media (min-width: 640px) { .sf-product-grid { column-count: 3; } }
        @media (min-width: 1024px) { .sf-product-grid { column-count: 4; } }
        @media (min-width: 1280px) { .sf-product-grid { column-count: 5; } }

        .sf-product-card {
          break-inside: avoid; margin-bottom: 24px;
          background: var(--pin-card); border-radius: 24px; overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s; 
          cursor: pointer;
          border: 1px solid var(--brand-border);
        }
        .sf-product-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); border-color: rgba(99, 102, 241, 0.3); }

        .sf-card-image-wrap { position: relative; width: 100%; overflow: hidden; }
        .sf-card-image { width: 100%; display: block; height: auto; transition: transform 0.5s; }
        .sf-product-card:hover .sf-card-image { transform: scale(1.05); }
        
        .sf-card-stock-badge { position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.9); color: white; padding: 4px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .sf-card-content { padding: 16px; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2)); }
        .sf-card-name { font-size: 15px; font-weight: 600; display: block; margin-bottom: 6px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sf-card-price { font-size: 16px; font-weight: 800; color: var(--brand-accent); }

        /* Detail Split */
        .detail-split {
          display: grid; grid-template-columns: 1fr; gap: 40px; padding: 24px 0; max-width: 1100px; margin: 0 auto;
        }
        @media (min-width: 768px) {
          .detail-split { 
            grid-template-columns: 1fr 340px; 
            background: var(--brand-surface); 
            border-radius: 40px; 
            border: 1px solid var(--brand-border);
            box-shadow: 0 40px 100px rgba(0,0,0,0.5); 
            padding: 40px; 
            margin-top: 40px;
          }
        }

        .sf-product-gallery { width: 100%; }
        .sf-main-image-contain { border-radius: 32px; overflow: hidden; background: #000; position: relative; border: 1px solid var(--brand-border); }
        .sf-main-image-contain img { width: 100%; height: auto; display: block; object-fit: contain; max-height: 600px; margin: 0 auto; }
        .sf-image-thumb-row { display: flex; gap: 12px; margin-top: 16px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
        .sf-image-thumb-row::-webkit-scrollbar { display: none; }
        .sf-thumb { width: 72px; height: 72px; border-radius: 16px; overflow: hidden; cursor: pointer; border: 2px solid transparent; flex-shrink: 0; background: #000; }
        .sf-thumb.active { border-color: var(--brand-primary); transform: scale(1.05); }
        .sf-thumb img { width: 100%; height: 100%; object-fit: cover; }

        .sf-detail-name { font-size: 36px; font-weight: 800; margin: 0 0 16px; color: #fff; letter-spacing: -0.02em; }
        .sf-detail-price { font-size: 30px; font-weight: 800; margin-bottom: 24px; color: var(--brand-accent); }
        .sf-detail-desc { font-size: 17px; line-height: 1.7; color: var(--pin-text-muted); margin-bottom: 40px; }

        .sf-action-btns { display: flex; flex-direction: column; gap: 14px; }
        .sf-buy-btn { background: linear-gradient(135deg, var(--brand-primary), #6366f1); color: white; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }
        .sf-wa-btn { background: linear-gradient(135deg, #25d366, #128c7e); color: white; box-shadow: 0 10px 20px rgba(37, 211, 102, 0.2); }
        .sf-buy-btn, .sf-wa-btn { padding: 18px; border: none; border-radius: 20px; font-size: 17px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.3s; }
        .sf-buy-btn:hover, .sf-wa-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 15px 30px rgba(0,0,0,0.3); }

        /* Catalogue */
        .sf-side-catalogue { border-left: 1px solid var(--brand-border); padding-left: 30px; }
        @media (max-width: 767px) { .sf-side-catalogue { border-left: none; padding-left: 0; margin-top: 40px; } }

        .sf-catalogue-title { font-size: 19px; font-weight: 700; margin-bottom: 24px; color: #fff; }
        .sf-catalogue-scroll { display: flex; flex-direction: column; gap: 20px; max-height: 850px; overflow-y: auto; scrollbar-width: thin; padding-right: 10px; }
        .sf-mini-card { display: flex; gap: 16px; text-decoration: none; color: inherit; padding: 12px; border-radius: 20px; background: rgba(255,255,255,0.02); transition: all 0.3s; border: 1px solid transparent; }
        .sf-mini-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.05); transform: translateX(5px); }
        .sf-mini-img { width: 84px; height: 84px; border-radius: 16px; overflow: hidden; flex-shrink: 0; background: #000; }
        .sf-mini-img img { width: 100%; height: 100%; object-fit: cover; }
        .sf-mini-info h4 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #fff; }
        .sf-mini-info p { margin: 0; font-size: 14px; font-weight: 700; color: var(--brand-accent); }

        .sf-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(12px); }
        .sf-modal { background: var(--brand-surface); width: 95%; max-width: 480px; border-radius: 32px; overflow: hidden; border: 1px solid var(--brand-border); box-shadow: 0 50px 100px rgba(0,0,0,0.8); }
        .sf-modal-header { padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--brand-border); }
        .sf-modal-header h3 { color: #fff; font-size: 22px; font-weight: 800; }
        .sf-close-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: var(--pin-text-muted); }
        .sf-close-btn:hover { color: #fff; }
        
        .sf-checkout-form { padding: 32px; display: flex; flex-direction: column; gap: 20px; }
        .sf-form-group label { color: var(--pin-text-muted); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .sf-form-group input, .sf-form-group textarea { 
            width: 100%; padding: 16px; background: rgba(0,0,0,0.2); 
            border: 2px solid var(--brand-border); border-radius: 18px; 
            font-size: 16px; color: #fff; transition: border-color 0.2s;
        }
        .sf-form-group input:focus { border-color: var(--brand-primary); outline: none; }
        
        .sf-total-summary { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: rgba(79, 70, 229, 0.1); border-radius: 20px; color: #fff; font-weight: 700; }
        .sf-submit-order-btn { padding: 18px; border: none; border-radius: 20px; background: var(--brand-accent); color: #064e3b; font-weight: 800; font-size: 17px; cursor: pointer; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
        .sf-submit-order-btn:hover { filter: brightness(1.1); transform: translateY(-3px); }

        .sf-footer { text-align: center; padding: 60px 0; color: var(--pin-text-muted); font-size: 14px; border-top: 1px solid var(--pin-border); max-width: 1400px; margin: 0 auto; }
        .sf-footer strong { color: var(--brand-primary); }
        
        .sf-spinner { width: 44px; height: 44px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 150px auto 24px; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sf-error-page { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: radial-gradient(circle at top, #1e1b4b 0%, #0f172a 100%); }
        .sf-error-card { text-align: center; background: var(--brand-surface); padding: 48px; border-radius: 40px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); border: 1px solid var(--brand-border); max-width: 480px; }
        .sf-error-card h2 { color: #fff; font-size: 28px; margin: 24px 0 12px; }
        .sf-error-card p { color: var(--pin-text-muted); margin-bottom: 32px; font-size: 16px; }
        .sf-btn-home { display: inline-block; background: var(--brand-primary); color: #fff; padding: 16px 32px; border-radius: 20px; text-decoration: none; font-weight: 700; transition: all 0.3s; }
        .sf-btn-home:hover { transform: translateY(-3px); filter: brightness(1.1); }
    `}</style>
);

export default StorefrontPage;
