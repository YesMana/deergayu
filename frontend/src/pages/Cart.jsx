import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, CheckCircle, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../firebase';
import './Cart.css';
import { API_URL } from '../config/api';


const DEFAULT_BANK = {
  bank: "People's Bank",
  branch: "Colombo 03",
  accountName: "Deergayu (Pvt) Ltd",
  accountNo: "123-4567-8901-00",
};

const BASE_PAYMENT_OPTIONS = [
  { value: 'cash_on_delivery', labelKey: 'cart_payment_cash_label', icon: '💵', descKey: 'cart_payment_cash_desc' },
  { value: 'qr_pay',           labelKey: 'cart_payment_qr_label',   icon: '📱', descKey: 'cart_payment_qr_desc' },
  { value: 'bank_transfer',    labelKey: 'cart_payment_bank_label', icon: '🏦', descKey: 'cart_payment_bank_desc' },
];

const PAYHERE_OPTION = {
  value: 'payhere',
  labelKey: 'cart_payment_payhere_label',
  icon: '💳',
  descKey: 'cart_payment_payhere_desc',
};

const Cart = () => {
  const { cartItems, cartCount, loading, removeFromCart, updateQuantity, checkout } = useCart();
  const { success, error } = useToast();
  const { t } = useLanguage();

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
  const [qrImageFailed, setQrImageFailed] = useState(false);

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
  const formatText = (key, values = {}) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
      t(key)
    );

  const paymentOptions = payhereEnabled
    ? [...BASE_PAYMENT_OPTIONS, PAYHERE_OPTION]
    : BASE_PAYMENT_OPTIONS;

  const tryPayHere = async (data, total) => {
    const orderId = data?.orderIds?.[0];
    if (!orderId) {
      setPayhereMsg(t('cart_payhere_missing_order'));
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
        setPayhereMsg(hashData.error || t('cart_payhere_config'));
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
      setPayhereMsg(t('cart_payhere_start_failed'));
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrMsg('');
    setPayhereMsg('');
    setQrImageFailed(false);
    if (!deliveryAddress.trim()) { setErrMsg(t('cart_enter_delivery_address')); return; }
    if (!phone.trim())           { setErrMsg(t('cart_enter_phone'));             return; }
    if (shippingZones.length && !shippingZoneId) {
      setErrMsg(t('cart_select_shipping_zone'));
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
      success(t('cart_order_success_toast'));
      if (data?.payhereReady) {
        await tryPayHere(data, total);
      }
    } catch (err) {
      const msg = err.message || t('cart_checkout_failed');
      setErrMsg(msg);
      error(msg);
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div className="cart-page animate-fade-in">
      <div className="cart-header"><div className="container"><h1 className="cart-title">{t('cart_title')}</h1></div></div>
      <div className="container"><div className="cart-loading"><div className="cart-spinner"></div><p>{t('cart_loading')}</p></div></div>
    </div>
  );

  // ── Order Success ────────────────────────────────────────────
  if (orderResult) {
    const ref = orderResult.orderIds?.[0]?.slice(-8).toUpperCase() || 'DEERGAYU';
    const isOnline = orderResult.method === 'qr_pay' || orderResult.method === 'bank_transfer';
    const orderPlacedParts = t('cart_order_placed_ref').split('{ref}');

    return (
      <div className="cart-page animate-fade-in">
        <div className="cart-header"><div className="container"><h1 className="cart-title">{t('cart_order_placed_title')}</h1></div></div>
        <div className="container">
          <div style={{ maxWidth: 580, margin: '2rem auto' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ margin: '0 0 0.5rem' }}>{t('cart_thank_you')}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                {orderPlacedParts[0]}
                <strong style={{ color: 'var(--primary-color)' }}>#{ref}</strong>
                {orderPlacedParts[1] || ''}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t('cart_confirmation_email')}
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
                    {orderResult.method === 'qr_pay' ? `📱 ${t('cart_scan_to_pay')}` : `🏦 ${t('cart_bank_transfer_details')}`}
                  </h3>

                  {orderResult.method === 'qr_pay' && (
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      {qrImageFailed ? (
                        <div style={{ width: 160, height: 160, background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(212,175,55,0.4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'rgba(212,175,55,0.6)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                          {t('cart_qr_missing')}
                        </div>
                      ) : (
                        <img
                          src="/qr-pay.png"
                          alt={t('cart_qr_alt')}
                          onError={() => setQrImageFailed(true)}
                          style={{ width: 160, height: 160, borderRadius: 12, border: '2px solid rgba(212,175,55,0.4)', background: '#fff' }}
                        />
                      )}
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8 }}>{t('cart_qr_scan_hint')}</p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.88rem' }}>
                    {[
                      { key: 'bank', label: t('cart_bank'), val: bankDetails.bank },
                      { key: 'branch', label: t('cart_branch'), val: bankDetails.branch },
                      { key: 'accountName', label: t('cart_account_name'), val: bankDetails.accountName },
                      { key: 'accountNo', label: t('cart_account_no'), val: bankDetails.accountNo },
                      { key: 'amount', label: t('cart_amount'), val: `Rs. ${orderResult.total.toLocaleString()}` },
                      { key: 'reference', label: t('cart_reference_no'), val: `#${ref} (${t('cart_required_suffix')})` },
                    ].map(({ key, label, val }) => (
                      <div key={key} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', minWidth: 110 }}>{label}:</span>
                        <strong style={{ color: key === 'reference' ? 'var(--primary-color)' : 'var(--text-primary)' }}>{val}</strong>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '1rem 0 0' }}>
                    ⚠️ {t('cart_transfer_hold_notice')}{' '}
                    {t('cart_receipt_notice')} <strong>WhatsApp +94 76 220 9299</strong>.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/my-orders" className="btn btn-primary"><CheckCircle size={18} /> {t('cart_view_my_orders')}</Link>
                <Link to="/shop" className="btn btn-outline"><ShoppingBag size={18} /> {t('cart_continue_shopping')}</Link>
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
        <h1 className="cart-title">{t('cart_title')}</h1>
        <p className="cart-subtitle">{t('cart_empty_subtitle')}</p>
      </div></div>
      <div className="container">
        <div className="empty-cart glass-panel">
          <div className="empty-cart-icon">🛒</div>
          <h2>{t('cart_empty_title')}</h2>
          <p>{t('cart_empty_body')}</p>
          <Link to="/shop" className="btn btn-primary"><ShoppingBag size={18} /> {t('cart_browse_products')} <ArrowRight size={18} /></Link>
        </div>
      </div>
    </div>
  );

  // ── Full Cart ────────────────────────────────────────────────
  return (
    <div className="cart-page animate-fade-in">
      <div className="cart-header">
        <div className="container">
          <h1 className="cart-title">{t('cart_title')}</h1>
          <p className="cart-subtitle">
            {cartCount === 1
              ? t('cart_items_count_one')
              : formatText('cart_items_count_many', { count: cartCount })}
          </p>
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
                  {item.vendorName && <span className="cart-item-vendor">{t('cart_sold_by')} {item.vendorName}</span>}
                  {item.category   && <span className="cart-item-category">{item.category}</span>}
                  <div className="cart-item-price-row">
                    <span className="cart-item-price">Rs. {Number(item.price).toLocaleString()}</span>
                    <span className="cart-item-subtotal">{t('cart_subtotal')}: Rs. {(item.price * (item.quantity || 1)).toLocaleString()}</span>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <button className="remove-btn" onClick={() => removeFromCart(item.productId)} title={t('cart_remove')}>
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
            <h2>{t('cart_order_summary')}</h2>
            <div className="order-summary-line"><span>{formatText('cart_items_summary', { count: cartCount })}</span><span>Rs. {itemsTotal.toLocaleString()}</span></div>
            <div className="order-summary-line">
              <span>{t('cart_delivery')}{selectedZone ? ` (${selectedZone.name})` : ''}</span>
              <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                {shippingFee > 0 ? `Rs. ${shippingFee.toLocaleString()}` : t('cart_free')}
              </span>
            </div>
            <div className="order-total-line"><span>{t('cart_total')}</span><span>Rs. {grandTotal.toLocaleString()}</span></div>

            {errMsg && <div className="cart-error" style={{ marginTop: '0.75rem' }}>{errMsg}</div>}

            <form className="checkout-form" onSubmit={handleCheckout}>

              {shippingZones.length > 0 && (
                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>{t('cart_shipping_zone')} *</label>
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
                  {t('cart_payment_method')}
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
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t(opt.labelKey)}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{t(opt.descKey)}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {paymentMethod === 'qr_pay' && (
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    📱 {t('cart_qr_after_order')}
                  </div>
                )}
                {paymentMethod === 'bank_transfer' && (
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{t('cart_bank_after_order')}</div>
                    <div style={{ color: 'rgba(212,175,55,0.85)' }}>🏦 {bankDetails.bank} · <strong>{bankDetails.accountName}</strong></div>
                  </div>
                )}
                {paymentMethod === 'payhere' && (
                  <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    💳 {t('cart_payhere_after_order')}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>{t('cart_delivery_address')} *</label>
                <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder={t('cart_delivery_address_ph')} rows={3} required />
              </div>

              <div className="form-group">
                <label>{t('cart_phone')} *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('cart_phone_ph')} required />
              </div>

              <div className="form-group">
                <label>{t('cart_notes')} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({t('common_optional')})</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('cart_notes_ph')} rows={2} />
              </div>

              <button type="submit" className="btn btn-primary checkout-btn" disabled={checkingOut}
                style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>
                {checkingOut
                  ? `⏳ ${t('cart_placing_order')}`
                  : formatText('cart_place_order_amount', { amount: grandTotal.toLocaleString() })}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
