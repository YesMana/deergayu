import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Cart.css';

const Cart = () => {
  const { cartItems, cartCount, loading, removeFromCart, updateQuantity, checkout } = useCart();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [notes, setNotes] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const grandTotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');

    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a phone number.');
      return;
    }

    try {
      setCheckingOut(true);
      await checkout(paymentMethod, deliveryAddress, phone, notes);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="cart-page animate-fade-in">
        <div className="cart-header">
          <div className="container">
            <h1 className="cart-title">Your Cart</h1>
          </div>
        </div>
        <div className="container">
          <div className="cart-loading">
            <div className="cart-spinner"></div>
            <p>Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="cart-page animate-fade-in">
        <div className="cart-header">
          <div className="container">
            <h1 className="cart-title">Order Placed!</h1>
          </div>
        </div>
        <div className="container">
          <div className="checkout-success glass-panel">
            <div className="success-icon">🎉</div>
            <h2>Thank You for Your Order!</h2>
            <p>Your order has been placed successfully. You'll receive a confirmation soon.</p>
            <div className="success-actions">
              <Link to="/my-orders" className="btn btn-primary">
                <CheckCircle size={18} /> View My Orders
              </Link>
              <Link to="/shop" className="btn btn-outline">
                <ShoppingBag size={18} /> Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <div className="cart-page animate-fade-in">
        <div className="cart-header">
          <div className="container">
            <h1 className="cart-title">Your Cart</h1>
            <p className="cart-subtitle">Your cart is waiting to be filled</p>
          </div>
        </div>
        <div className="container">
          <div className="empty-cart glass-panel">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your Cart is Empty</h2>
            <p>Explore our shop and discover authentic Ayurvedic products.</p>
            <Link to="/shop" className="btn btn-primary">
              <ShoppingBag size={18} /> Browse Products <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              <div
                key={item.productId || index}
                className="cart-item glass-panel"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=500&q=80'}
                  alt={item.name}
                  className="cart-item-image"
                />
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  {item.vendorName && <span className="cart-item-vendor">by {item.vendorName}</span>}
                  {item.category && <span className="cart-item-category">{item.category}</span>}
                  <div className="cart-item-price-row">
                    <span className="cart-item-price">Rs. {item.price}</span>
                    <span className="cart-item-subtotal">
                      Subtotal: Rs. {(item.price * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.productId)}
                    title="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="quantity-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.productId, (item.quantity || 1) - 1)}
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity || 1}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.productId, (item.quantity || 1) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Panel */}
          <div className="checkout-panel glass-panel">
            <h2>Order Summary</h2>

            <div className="order-summary-line">
              <span>Items ({cartCount})</span>
              <span>Rs. {grandTotal.toLocaleString()}</span>
            </div>
            <div className="order-summary-line">
              <span>Delivery</span>
              <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Free</span>
            </div>
            <div className="order-total-line">
              <span>Total</span>
              <span>Rs. {grandTotal.toLocaleString()}</span>
            </div>

            {error && <div className="cart-error">{error}</div>}

            <form className="checkout-form" onSubmit={handleCheckout}>
              <div className="form-group">
                <label>Delivery Address *</label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your full delivery address"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 077 123 4567"
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={2}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary checkout-btn"
                disabled={checkingOut}
              >
                {checkingOut ? 'Placing Order...' : `Place Order — Rs. ${grandTotal.toLocaleString()}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
