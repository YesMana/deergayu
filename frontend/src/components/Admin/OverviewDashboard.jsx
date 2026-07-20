import React, { useState, useEffect, useCallback } from 'react';
import { Users, Package, ShoppingBag, TrendingUp, Calendar, CheckCircle, RefreshCw } from 'lucide-react';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { fmtCurrency, fmtDate, StatusPill } from './AdminUtils';
import { API_URL } from '../../config/api';

const emptyOverview = {
  totalExperts: 0,
  pendingExperts: 0,
  totalProducts: 0,
  pendingProducts: 0,
  approvedProducts: 0,
  totalOrders: 0,
  pendingOrders: 0,
  totalAppointments: 0,
  pendingAppointments: 0,
  thisWeekAppts: 0,
  totalRevenue: 0,
  commissionPercent: 10,
  commissionRevenue: 0,
  recentOrders: [],
  recentAppointments: [],
};

export default function OverviewDashboard({ setActiveTab }) {
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setErrorMsg('Not signed in');
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setErrorMsg('');
    try {
      // Wake / verify API first (Render free tier cold start)
      try {
        await fetch(`${API_URL}/api/health`, { method: 'GET' });
      } catch {
        /* ignore — overview call will surface the real error */
      }

      const token = await current.getIdToken(true);
      const res = await fetch(`${API_URL}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Overview failed (${res.status})`);
      }
      setOverview({ ...emptyOverview, ...data });
      return;
    } catch (err) {
      console.error('Overview load failed:', err);
      // Last-resort: public counts so the page is not a dead end
      try {
        const [provRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/api/providers`),
          fetch(`${API_URL}/api/products`),
        ]);
        const providers = provRes.ok ? await provRes.json() : [];
        const products = prodRes.ok ? await prodRes.json() : [];
        if ((providers?.length || 0) > 0 || (products?.length || 0) > 0) {
          setOverview({
            ...emptyOverview,
            totalExperts: Array.isArray(providers) ? providers.length : 0,
            totalProducts: Array.isArray(products) ? products.length : 0,
            approvedProducts: Array.isArray(products)
              ? products.filter((p) => p.status === 'approved').length
              : 0,
          });
          setErrorMsg(
            `${err.message || 'Admin overview failed'}. Showing public counts only — open Manage Experts / Orders for full data.`
          );
          return;
        }
      } catch {
        /* fall through */
      }
      setErrorMsg(err.message || 'Failed to load overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setErrorMsg('Not signed in');
      return;
    }
    fetchOverview();
  }, [authLoading, user, fetchOverview]);

  if (authLoading || loading) {
    return (
      <div className="loading-state" style={{ padding: '4rem 0' }}>
        <div className="spinner" /> Loading dashboard…
      </div>
    );
  }

  if (errorMsg && overview.totalOrders === 0 && overview.totalExperts === 0 && overview.totalProducts === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ffa726' }}>Dashboard data could not load</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>
          {errorMsg}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          API: <code>{API_URL}</code> — if Render just woke up, wait ~30 seconds and retry.
        </p>
        <button className="btn btn-primary" onClick={fetchOverview} disabled={refreshing}>
          {refreshing ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  const {
    totalExperts,
    pendingExperts,
    totalProducts,
    pendingProducts,
    approvedProducts,
    totalOrders,
    pendingOrders,
    totalAppointments,
    thisWeekAppts,
    totalRevenue,
    commissionRevenue,
    recentOrders = [],
    recentAppointments = [],
  } = overview;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Platform Overview</h1>
          <p className="page-subtitle">Real-time analytics and key metrics</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchOverview}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,167,38,0.12)',
            border: '1px solid rgba(255,167,38,0.35)',
            color: '#ffb74d',
            fontSize: '0.85rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="kpi-grid">
        {[
          {
            label: 'Total Experts',
            value: totalExperts,
            Icon: Users,
            color: '#29b6f6',
            iconBg: 'rgba(41,182,246,0.12)',
            accent: 'linear-gradient(90deg,#29b6f6,#0288d1)',
            trend: `${pendingExperts} pending`,
            trendType: pendingExperts > 0 ? 'warn' : '',
            onClick: () => setActiveTab('providers'),
          },
          {
            label: 'Total Products',
            value: totalProducts,
            Icon: Package,
            color: '#ab47bc',
            iconBg: 'rgba(171,71,188,0.12)',
            accent: 'linear-gradient(90deg,#ab47bc,#7b1fa2)',
            trend: `${pendingProducts} pending`,
            trendType: pendingProducts > 0 ? 'warn' : '',
            onClick: () => setActiveTab('products'),
          },
          {
            label: 'Total Orders',
            value: totalOrders,
            Icon: ShoppingBag,
            color: '#26c6da',
            iconBg: 'rgba(38,198,218,0.12)',
            accent: 'linear-gradient(90deg,#26c6da,#00838f)',
            trend: `${pendingOrders} pending`,
            trendType: pendingOrders > 0 ? 'warn' : '',
            onClick: () => setActiveTab('orders'),
          },
          {
            label: 'Platform Revenue',
            value: fmtCurrency(totalRevenue),
            Icon: TrendingUp,
            color: '#4caf50',
            iconBg: 'rgba(76,175,80,0.12)',
            accent: 'linear-gradient(90deg,#4caf50,#2e7d32)',
            trend: `${fmtCurrency(commissionRevenue)} commission`,
            trendType: '',
            onClick: () => setActiveTab('orders'),
          },
          {
            label: 'Total Appointments',
            value: totalAppointments,
            Icon: Calendar,
            color: '#ffa726',
            iconBg: 'rgba(255,167,38,0.12)',
            accent: 'linear-gradient(90deg,#ffa726,#e65100)',
            trend: `${thisWeekAppts} this week`,
            trendType: '',
            onClick: () => setActiveTab('appointments'),
          },
          {
            label: 'Approved Products',
            value: approvedProducts,
            Icon: CheckCircle,
            color: '#d4af37',
            iconBg: 'rgba(212,175,55,0.12)',
            accent: 'linear-gradient(90deg,#d4af37,#a67c00)',
            trend: `of ${totalProducts} total`,
            trendType: '',
            onClick: () => setActiveTab('products'),
          },
        ].map(({ label, value, Icon, color, iconBg, accent, trend, trendType, onClick }) => (
          <div
            key={label}
            className="kpi-card"
            style={{ '--kpi-accent': accent, '--kpi-icon-bg': iconBg, cursor: 'pointer' }}
            onClick={onClick}
          >
            <div className="kpi-card-header">
              <div className="kpi-icon-box">
                <Icon size={20} color={color} />
              </div>
              <span className={`kpi-trend ${trendType}`}>{trend}</span>
            </div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="dash-section">
          <div className="dash-section-header">
            <h3><ShoppingBag size={15} /> Recent Orders</h3>
            <span className="view-all" onClick={() => setActiveTab('orders')}>View all →</span>
          </div>
          <div className="dash-section-body">
            {recentOrders.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="icon">🛒</div>
                <p>No orders yet</p>
              </div>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} className="activity-item">
                  <div className="activity-avatar">
                    <ShoppingBag size={14} />
                  </div>
                  <div className="activity-info">
                    <div className="title">Order #{o.id?.slice(-6).toUpperCase()}</div>
                    <div className="subtitle">{o.customerName} · {fmtDate(o.createdAt)}</div>
                  </div>
                  <div className="activity-meta">
                    <div className="amount" style={{ marginBottom: '0.2rem' }}>{fmtCurrency(o.totalPrice)}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-header">
            <h3><Calendar size={15} /> Recent Appointments</h3>
            <span className="view-all" onClick={() => setActiveTab('appointments')}>View all →</span>
          </div>
          <div className="dash-section-body">
            {recentAppointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="icon">📅</div>
                <p>No appointments yet</p>
              </div>
            ) : (
              recentAppointments.map((a) => (
                <div key={a.id} className="activity-item">
                  <div className="activity-avatar" style={{ background: 'linear-gradient(135deg, #ffa726, #e65100)' }}>
                    <Calendar size={14} color="#fff" />
                  </div>
                  <div className="activity-info">
                    <div className="title">{a.customerName}</div>
                    <div className="subtitle">{a.date} at {a.time}</div>
                  </div>
                  <div className="activity-meta">
                    <div className="subtitle" style={{ marginBottom: '0.2rem' }}>Dr. {a.providerName}</div>
                    <StatusPill status={a.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {(pendingExperts > 0 || pendingProducts > 0) && (
        <div className="dash-section">
          <div className="dash-section-header">
            <h3>Action Required</h3>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {pendingExperts > 0 && (
              <button
                className="btn btn-outline"
                onClick={() => setActiveTab('providers')}
                style={{ borderColor: '#29b6f6', color: '#29b6f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Users size={15} /> {pendingExperts} Expert{pendingExperts > 1 ? 's' : ''} Awaiting Approval
              </button>
            )}
            {pendingProducts > 0 && (
              <button
                className="btn btn-outline"
                onClick={() => setActiveTab('products')}
                style={{ borderColor: '#ffa726', color: '#ffa726', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Package size={15} /> {pendingProducts} Product{pendingProducts > 1 ? 's' : ''} Awaiting Approval
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
