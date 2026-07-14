import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, CheckCircle, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';
import './Cart.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const DEFAULT_BANK = {
  bank: "People's Bank",
  branch: "Colombo 03",
  accountName: "Deergayu (Pvt) Ltd",
  accountNo: "123-4567-8901-00",
};

const BASE_PAYMENT_OPTIONS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives at your door' },
  { value: 'qr_pay',           label: 'QR Pay',           icon: '📱', desc: 'Scan & pay instantly via any banking app' },
  { value: 'bank_transfer',    label: 'Bank Transfer',    icon: '🏦', desc: 'Transfer to our bank account directly' },
];

const Cart = () => {
  const { cartItems, cartCount, loading, removeFromCart, updateQuantity, checkout } = useCart();
  const { success, error } = useToast();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone]                     = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('cash_on_delivery');
  const [notes, setNotes]                     = useState('');
  const [checkingOut, setCheckingOut]         = useState(false);
  const [errMsg, setErrMsg]                   = useState('');
  const [orderResult, setOrderResult]         = useState(null);

  const [shippingZones, setShippingZones] = useState([]);
  const [shippingZoneId, setShippingZoneId] = useState('');
  const [bankDetails, setBankDetails] = useState(DEFAULT_BANK);
  const [payhereEnabled, setPayhereEnabled] = useState(false);
  const [payhereMsg, setPayhereMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/storefront-settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const zones = data.shippingZones || [];
        setShippingZones(zones);
        if (zones.length) setShippingZoneId(zones[0].id);
        if (data.bankDetails) setBankDetails({ ...DEFAULT_BANK, ...data.bankDetails });
        setPayhereEnabled(Boolean(data.payhereEnabled));
      })
      .catch(() => {});
  }, []);

  const itemsTotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const selectedZone = shippingZones.find((z) => z.id === shippingZoneId);
  const shippingFee = Number(selectedZone?.fee) || 0;
  const grandTotal = itemsTotal + shippingFee;

  const paymentOptions = payhereEnabled
    ? [...BASE_PAYMENT_OPTIONS, { value: 'payhere', label: 'Card (PayHere)', icon: '💳', desc: 'Pay securely with Visa / Mastercard' }]
    : BASE_PAYMENT_OPTIONS;

  const tryPayHere = async (data, total) => {
    const orderId = data?.orderIds?.[0];
    if (!orderId) {
      setPayhereMsg('Order placed. Card payment needs merchant configuration — please use bank transfer or contact support.');
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/payments/payhere/hash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, amount: total, currency: 'LKR' }),
      });
      const hashData = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayhereMsg(hashData.error || 'Card pay needs merchant config. Your order is saved — pay via bank transfer or contact support.');
        return;
      }

      const action = hashData.sandbox
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = action;
      const fields = {
        merchant_id: hashData.merchant_id,
        return_url: hashData.return_url,
        cancel_url: hashData.cancel_url,
        notify_url: hashData.notify_url,
        order_id: orderId,
        items: 'Deergayu Order',
        currency: 'LKR',
        amount: Number(total).toFixed(2),
        hash: hashData.hash,
      };
      Object.entries(fields).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = val ?? '';
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch {
      setPayhereMsg('Could not start PayHere checkout. Your order is saved — please contact support or use another payment method.');
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setPayhereMsg('');
    if (!deliveryAddress.trim()) { setErrMsg('Please enter a delivery address.'); return; }
    if (!phone.trim())           { setErrMsg('Please enter a phone number.');     return; }
    if (shippingZones.length && !shippingZoneId) {
      setErrMsg('Please select a shipping zone.');
      return;
    }
    try {
      setCheckingOut(true);
      const data = await checkout(paymentMethod, deliveryAddress, phone, notes, shippingZoneId || undefined);
      const total = data?.shippingFee != null ? itemsTotal + Number(data.shippingFee) : grandTotal;
      setOrderResult({
        orderIds: data?.orderIds || [],
        total,
        method: paymentMethod,
        shippingFee: data?.shippingFee ?? shippingFee,
      });
      success('Order placed successfully! ✓');
      if (data?.payhereReady) {
        await tryPayHere(data, total);
      }
    } catch (err) {
      const msg = err.message || 'Checkout failed. Please try again.';
      setErrMsg(msg);
      error(msg);
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div className="cart-page animate-fade-in">
      <div className="cart-header"><div className="container"><h1 className="cart-title">Your Cart</h1></div></div>
      <div className="container"><div className="cart-loading"><div className="cart-spinner"></div><p>Loading your cart...</p></div></div>
    </div>
  );

  // ── Order Success ────────────────────────────────────────────
  if (orderResult) {
    const ref = orderResult.orderIds?.[0]?.slice(-8).toUpperCase() || 'DEERGAYU';
    const isOnline = orderResult.method === 'qr_pay' || orderResult.method === 'bank_transfer';

    return (
      <div className="cart-page animate-fade-in">
        <div className="cart-header"><div className="container"><h1 className="cart-title">Order Placed! 🎉</h1></div></div>
        <div className="container">
          <div style={{ maxWidth: 580, margin: '2rem auto' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ margin: '0 0 0.5rem' }}>Thank You!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Your order <strong style={{ color: 'var(--primary-color)' }}>#{ref}</strong> has been placed.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                A confirmation email has been sent to you.
              </p>

              {payhereMsg && (
                <div style={{
                  background: 'rgba(255,167,38,0.1)',
                  border: '1px solid rgba(255,167,38,0.35)',
                  borderRadius: 12, padding: '1rem',
                  marginBottom: '1.5rem', textAlign: 'left',
                  color: 'var(--text-secondary)', fontSize: '0.9rem'
                }}>
                  {payhereMsg}
                </div>
              )}

              {isOnline && (
                <div style={{
                  background: 'rgba(212,175,55,0.08)',
                  border: '1px solid rgba(212,175,55,0.35)',
                  borderRadius: 14, padding: '1.5rem',
                  margin: '0 0 1.5rem', textAlign: 'left'
                }}>
                  <h3 style={{ color: 'var(--primary-color)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {orderResult.method === 'qr_pay' ? '📱 Scan to Pay' : '🏦 Bank Transfer Details'}
                  </h3>

                  {orderResult.method === 'qr_pay' && (
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <img
                        src="/qr-pay.png"
                        alt="QR Code"
                        onError={e => { e.target.parentNode.innerHTML = '<div style="width:160px;height:160px;background:rgba(255,255,255,0.05);border:2px dashed rgba(212,175,55,0.4);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto;color:rgba(212,175,55,0.6);font-size:0.8rem;text-align:center;padding:1rem">Place your QR code image at<br/>/public/qr-pay.png</div>'; }}
                        style={{ width: 160, height: 160, borderRadius: 12, border: '2px solid rgba(212,175,55,0.4)', background: '#fff' }}
                      />
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8 }}>Scan with BOC, Sampath, Commercial, HNB or any banking app</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.88rem' }}>
                    {[
                      ['Bank',         bankDetails.bank],
                      ['Branch',       bankDetails.branch],
                      ['Account Name', bankDetails.accountName],
                      ['Account No.',  bankDetails.accountNo],
                      ['Amount',       `Rs. ${orderResult.total.toLocaleString()}`],
                      ['Reference No.', `#${ref} (required)`],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', minWidth: 110 }}>{label}:</span>
                        <strong style={{ color: label === 'Reference No.' ? 'var(--primary-color)' : 'var(--text-primary)' }}>{val}</strong>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '1rem 0 0' }}>
                    ⚠️ Your order is reserved for 24 hours. Please include the reference number when transferring.
                    Send your receipt to <strong>WhatsApp +94 76 220 9299</strong> for faster confirmation.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/my-orders" className="btn btn-primary"><CheckCircle size={18} /> View My Orders</Link>
                <Link to="/shop" className="btn btn-outline"><ShoppingBag size={18} /> Continue Shopping</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty Cart ───────────────────────────────────────────────
  if (cartItems.length === 0) return (
    <div className="cart-page animate-fade-in">
      <div className="cart-header"><div className="container">
        <h1 className="cart-title">Your Cart</h1>
        <p className="cart-subtitle">Your cart is waiting to be filled</p>
      </div></div>
      <div className="container">
        <div className="empty-cart glass-panel">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p>Explore our shop and discover authentic Ayurvedic products.</p>
          <Link to="/shop" className="btn btn-primary"><ShoppingBag size={18} /> Browse Products <ArrowRight size={18} /></Link>
        </div>
      </div>
    </div>
  );

  // ── Full Cart ────────────────────────────────────────────────
  return (
    <div className="cart-page animate-fade-in">
      <div className="cart-header">
        <div className="container">
          <h1 className="cart-title">Your Cart</h1>
          <p className="cart-subtitle">{cartCount} item{cartCount !== 1 ? 's' : ''} in your cart</p>
        </div>
      </div>

      <div className="container">
        <div className="cart-layout">

          {/* Cart Items */}
          <div className="cart-items-section">
            {cartItems.map((item, index) => (
              <div key={item.productId || index} className="cart-item glass-panel" style={{ animationDelay: `${index * 0.08}s` }}>
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=500&q=80'}
                  alt={item.name} className="cart-item-image"
                />
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  {item.vendorName && <span className="cart-item-vendor">by {item.vendorName}</span>}
                  {item.category   && <span className="cart-item-category">{item.category}</span>}
                  <div className="cart-item-price-row">
                    <span className="cart-item-price">Rs. {Number(item.price).toLocaleString()}</span>
                    <span className="cart-item-subtotal">Subtotal: Rs. {(item.price * (item.quantity || 1)).toLocaleString()}</span>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <button className="remove-btn" onClick={() => removeFromCart(item.productId)} title="Remove">
                    <Trash2 size={18} />
                  </button>
                  <div className="quantity-controls">
                    <button className="qty-btn" onClick={() => updateQuantity(item.productId, (item.quantity||1) - 1)}><Minus size={14} /></button>
                    <span className="qty-value">{item.quantity || 1}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.productId, (item.quantity||1) + 1)}><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Panel */}
          <div className="checkout-panel glass-panel">
            <h2>Order Summary</h2>
            <div className="order-summary-line"><span>Items ({cartCount})</span><span>Rs. {itemsTotal.toLocaleString()}</span></div>
            <div className="order-summary-line">
              <span>Delivery{selectedZone ? ` (${selectedZone.name})` : ''}</span>
              <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                {shippingFee > 0 ? `Rs. ${shippingFee.toLocaleString()}` : 'Free'}
              </span>
            </div>
            <div className="order-total-line"><span>Total</span><span>Rs. {grandTotal.toLocaleString()}</span></div>

            {errMsg && <div className="cart-error" style={{ marginTop: '0.75rem' }}>{errMsg}</div>}

            <form className="checkout-form" onSubmit={handleCheckout}>

              {shippingZones.length > 0 && (
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>Shipping Zone *</label>
                  <select
                    value={shippingZoneId}
                    onChange={(e) => setShippingZoneId(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 1rem', borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)'
                    }}
                  >
                    {shippingZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — Rs. {Number(z.fee || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payment Method */}
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  Select Payment Method
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {paymentOptions.map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem', borderRadius: 10, cursor: 'pointer',
                      border: paymentMethod === opt.value
                        ? '1.5px solid rgba(212,175,55,0.8)'
                        : '1px solid rgba(255,255,255,0.1)',
                      background: paymentMethod === opt.value
                        ? 'rgba(212,175,55,0.1)'
                        : 'rgba(255,255,255,0.03)',
                      transition: 'all 0.18s'
                    }}>
                      <input type="radio" name="payment" value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                        style={{ accentColor: '#d4af37', width: 16, height: 16 }} />
                      <span style={{ fontSize: '1.3rem' }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {paymentMethod === 'qr_pay' && (
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    📱 QR code will be displayed after placing your order. Supports all Sri Lankan banking apps.
                  </div>
                )}
                {paymentMethod === 'bank_transfer' && (
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Bank details will be shown after placing the order.</div>
                    <div style={{ color: 'rgba(212,175,55,0.85)' }}>🏦 {bankDetails.bank} · <strong>{bankDetails.accountName}</strong></div>
                  </div>
                )}
                {paymentMethod === 'payhere' && (
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    💳 You will be redirected to PayHere to complete card payment after placing the order.
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Delivery Address *</label>
                <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="No., Street, City, District (e.g. 15/A, Galle Rd, Moratuwa, Colombo)" rows={3} required />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 077 123 4567" required />
              </div>

              <div className="form-group">
                <label>Notes <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions or delivery notes..." rows={2} />
              </div>

              <button type="submit" className="btn btn-primary checkout-btn" disabled={checkingOut}
                style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {checkingOut ? '⏳ Placing Order...' : `Place Order — Rs. ${grandTotal.toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
