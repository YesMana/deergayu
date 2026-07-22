import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag } from 'lucide-react';
import { auth } from '../firebase';
import './MyOrders.css';
import { API_URL } from '../config/api';


const statusClass = (status) => {
  const map = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    processing: 'status-processing',
    shipped: 'status-shipped',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled',
  };
  return map[status?.toLowerCase()] || 'status-pending';
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/my-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.orders || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Unable to load orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="orders-page animate-fade-in">
        <div className="orders-header">
          <div className="container">
            <h1 className="orders-title">My Orders</h1>
          </div>
        </div>
        <div className="container">
          <div className="orders-loading">
            <div className="orders-spinner"></div>
            <p>Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page animate-fade-in">
      <div className="orders-header">
        <div className="container">
          <h1 className="orders-title">My Orders</h1>
          <p className="orders-subtitle">
            {orders.length > 0
              ? `You have ${orders.length} order${orders.length !== 1 ? 's' : ''}`
              : 'Track all your orders here'}
          </p>
        </div>
      </div>

      <div className="container">
        {error && <div className="cart-error">{error}</div>}

        {orders.length === 0 && !error ? (
          <div className="orders-empty glass-panel">
            <div className="orders-empty-icon">📦</div>
            <h2>No Orders Yet</h2>
            <p>When you place an order, it will appear here.</p>
            <Link to="/shop" className="btn btn-primary">
              <ShoppingBag size={18} /> Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order, index) => {
              const total = order.totalPrice || order.total ||
                (order.items || []).reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

              return (
                <div
                  key={order.id || order._id || index}
                  className="order-card glass-panel"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="order-card-header">
                    <div className="order-id-section">
                      <h3>
                        <Package size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Order #{(order.id || order._id || '').toString().slice(-8).toUpperCase() || `${index + 1}`}
                      </h3>
                      <div className="order-date">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : 'Date not available'}
                      </div>
                      {order.vendorName && (
                        <div className="order-vendor">Sold by {order.vendorName}</div>
                      )}
                    </div>
                    <span className={`status-badge ${statusClass(order.status)}`}>
                      {order.status || 'Pending'}
                    </span>
                  </div>

                  <div className="order-items-list">
                    {(order.items || []).map((item, i) => (
                      <div key={i} className="order-item-row">
                        <span>
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-qty"> × {item.quantity || 1}</span>
                        </span>
                        <span className="order-item-price">
                          Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="order-card-footer">
                    <div className="order-total">
                      Total: <span>Rs. {total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
