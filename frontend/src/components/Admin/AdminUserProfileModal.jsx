import React, { useState, useEffect } from 'react';
import { X, DollarSign, Star, Package, ShoppingBag, Calendar, Mail } from 'lucide-react';
import { auth } from '../../firebase';
import { fmtCurrency, fmtDate, StatusPill, userInitials } from './AdminUtils';
import { API_URL } from '../../config/api';


export default function AdminUserProfileModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (!userId) return null;
  const u = data?.user;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Full Profile — Admin View</h2>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.4rem' }}><X size={18} /></button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading full profile…</div>
        ) : !u ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef5350' }}>Failed to load profile</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>
                {u.profileDetails?.profileImageUrl ? <img src={u.profileDetails.profileImageUrl} alt="" /> : userInitials(u)}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{u.name}</h3>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>{u.email}</p>
                <StatusPill status={u.status || 'approved'} /> <span style={{ marginLeft: 8, textTransform: 'capitalize' }}>{u.role}</span>
              </div>
            </div>

            {data.stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="kpi-card"><DollarSign size={16} /><div><small>Total Sales</small><strong>{fmtCurrency(data.stats.totalSales)}</strong></div></div>
                <div className="kpi-card"><DollarSign size={16} /><div><small>Vendor Earnings</small><strong>{fmtCurrency(data.stats.vendorEarnings)}</strong></div></div>
                <div className="kpi-card"><DollarSign size={16} /><div><small>Platform Fees</small><strong>{fmtCurrency(data.stats.platformFees)}</strong></div></div>
                <div className="kpi-card"><Package size={16} /><div><small>Products</small><strong>{data.stats.productCount}</strong></div></div>
                <div className="kpi-card"><ShoppingBag size={16} /><div><small>Orders</small><strong>{data.stats.orderCount}</strong></div></div>
                <div className="kpi-card"><Calendar size={16} /><div><small>Appointments</small><strong>{data.stats.appointmentCount}</strong></div></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['overview', 'products', 'orders', 'appointments', 'reviews'].map((t) => (
                <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', textTransform: 'capitalize' }} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>

            {tab === 'overview' && (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {u.profileDetails && Object.entries(u.profileDetails).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '1rem' }}>
                    <strong style={{ minWidth: 140, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}:</strong>
                    <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
                <a href={`mailto:${u.email}`} className="btn btn-outline" style={{ width: 'fit-content', marginTop: '0.5rem' }}><Mail size={14} /> Email User</a>
              </div>
            )}

            {tab === 'products' && (
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Category</th><th>Base</th><th>Site Price</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.products || []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td><td>{p.category}</td>
                      <td>{fmtCurrency(p.basePrice)}</td><td>{fmtCurrency(p.price)}</td>
                      <td><StatusPill status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'orders' && (
              <table className="admin-table">
                <thead><tr><th>Ref</th><th>Customer</th><th>Total</th><th>Vendor Gets</th><th>Platform Fee</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.vendorOrders || []).map((o) => (
                    <tr key={o.id}>
                      <td>{o.id?.slice(-8).toUpperCase()}</td>
                      <td>{o.customerName}</td>
                      <td>{fmtCurrency(o.totalPrice)}</td>
                      <td>{fmtCurrency(o.vendorEarnings)}</td>
                      <td>{fmtCurrency(o.platformFee)}</td>
                      <td><StatusPill status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'appointments' && (
              <table className="admin-table">
                <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.appointmentsAsProvider || []).map((a) => (
                    <tr key={a.id}>
                      <td>{a.customerName}</td><td>{a.date}</td><td>{a.time}</td>
                      <td><StatusPill status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(data.reviews || []).length === 0 ? <p>No reviews yet</p> : data.reviews.map((r) => (
                  <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Star size={14} fill="currentColor" /> {r.rating}/5 — <strong>{r.userName}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0' }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
