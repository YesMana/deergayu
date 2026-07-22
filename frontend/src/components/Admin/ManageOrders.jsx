import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, RefreshCw, Search } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useOrdersQuery } from '../../hooks/queries/useOrders';
import { fmtCurrency, fmtDate, StatusPill } from './AdminUtils';
import { API_URL } from '../../config/api';


export default function ManageOrders({ commissionPercent = 10 }) {
  const { success, error } = useToast();
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: orders = [], isLoading: loadingOrders, refetch } = useOrdersQuery();
  
  const getToken = () => auth.currentUser?.getIdToken();

  const handleOrderStatus = async (id, status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        success('Order status updated!');
        refetch(); // Automatically update cache
        if (selectedOrder && selectedOrder.id === id) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      } else {
        error('Failed to update status');
      }
    } catch (e) {
      error(e.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    const s = orderSearch.toLowerCase();
    return !s || o.customerName?.toLowerCase().includes(s) || o.id?.toLowerCase().includes(s) || o.vendorName?.toLowerCase().includes(s);
  });

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  const commissionRevenue = Math.round(totalRevenue * (commissionPercent) / 100);

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>All Orders</h1>
          <p className="page-subtitle">
            {orders.length} orders · Total GMV: {fmtCurrency(totalRevenue)} · Commission: {fmtCurrency(commissionRevenue)}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={loadingOrders ? 'spin' : ''} /> Refresh
        </button>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span className="table-title"><ShoppingBag size={16} /> {filteredOrders.length} orders</span>
          <div className="table-controls">
            <div className="search-box">
              <Search size={14} />
              <input placeholder="Search customer, vendor, ID…" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loadingOrders ? (
          <div className="loading-state"><div className="spinner spinner-sm" /> Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state"><div className="icon">🛒</div><h4>No orders found</h4></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr>
                <th>Order ID</th><th>Customer</th><th>Vendor</th><th>Total</th><th>Date</th><th>Status</th><th>Update Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      #{o.id?.slice(-8).toUpperCase()}
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.72rem' }}>
                          {(o.customerName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="name">{o.customerName || '—'}</div>
                          <div className="email">{o.customerEmail || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{o.vendorName || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#4caf50' }}>{fmtCurrency(o.totalPrice)}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{fmtDate(o.createdAt)}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td>
                      <select
                        className="status-select"
                        value={o.status || 'pending'}
                        onChange={e => handleOrderStatus(o.id, e.target.value)}
                      >
                        {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-xs edit-btn"
                          onClick={() => setSelectedOrder(o)}
                          style={{ background: 'var(--primary-color)', color: 'white' }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: 'var(--primary-color)' }}>🛒</div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                    Order ID: <span style={{ fontFamily: 'monospace' }}>#{selectedOrder.id?.slice(-8).toUpperCase()}</span>
                  </h2>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Order Status</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <StatusPill status={selectedOrder.status} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Placed on: {fmtDate(selectedOrder.createdAt)}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Customer Details</h4>
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ marginTop: '0.2rem' }}>{selectedOrder.customerName || '—'}</div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                      <div>✉️ {selectedOrder.customerEmail || '—'}</div>
                      <div>📞 {selectedOrder.customerPhone || '—'}</div>
                    </div>
                    {(selectedOrder.shippingAddress || selectedOrder.address) && (
                      <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        📍 {selectedOrder.shippingAddress || selectedOrder.address || '—'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1rem 1.25rem', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>Order Items</h4>
                <div style={{ padding: '0 1.25rem' }}>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qty: {item.quantity}</div>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {fmtCurrency(item.price * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>No item details available.</div>
                  )}
                </div>
                <div style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Total Amount:</span>
                  <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#4caf50' }}>{fmtCurrency(selectedOrder.totalPrice)}</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Update Status:</span>
                <select
                  className="status-select"
                  value={selectedOrder.status || 'pending'}
                  onChange={e => handleOrderStatus(selectedOrder.id, e.target.value)}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)' }}
                >
                  {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedOrder(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
