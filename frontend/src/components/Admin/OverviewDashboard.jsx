import React, { useState, useEffect, useCallback } from 'react';
import { Users, Package, ShoppingBag, TrendingUp, Calendar, CheckCircle, RefreshCw } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useProvidersQuery } from '../../hooks/queries/useProviders';
import { useProductsQuery } from '../../hooks/queries/useProducts';
import { useOrdersQuery } from '../../hooks/queries/useOrders';
import { useAppointmentsQuery } from '../../hooks/queries/useAppointments';
import { fmtCurrency, fmtDate, StatusPill } from './AdminUtils';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function OverviewDashboard({ setActiveTab }) {
  const { error } = useToast();
  
  const { data: providers = [], isLoading: p1, refetch: r1 } = useProvidersQuery();
  const { data: products = [], isLoading: p2, refetch: r2 } = useProductsQuery();
  const { data: orders = [], isLoading: p3, refetch: r3 } = useOrdersQuery();
  const { data: appointments = [], isLoading: p4, refetch: r4 } = useAppointmentsQuery();
  const [settings, setSettings] = useState({ commissionPercent: 10 });
  
  const loading = p1 || p2 || p3 || p4;

  const fetchData = async () => {
    r1(); r2(); r3(); r4();
    try {
      const token = await auth.currentUser?.getIdToken();
      const resSettings = await fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (resSettings.ok) setSettings(await resSettings.json());
    } catch (e) { console.error("Settings:", e); }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived Stats
  const pendingProducts  = products.filter(p => p.status === 'pending').length;
  const pendingExperts   = providers.filter(p => p.status === 'pending').length;
  const pendingOrders    = orders.filter(o => o.status === 'pending').length;
  const totalRevenue     = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  const commissionRevenue = Math.round(totalRevenue * (settings.commissionPercent || 10) / 100);
  const thisWeekAppts = appointments.filter(a => {
    const d = new Date(a.createdAt || a.date);
    const now = new Date();
    return (now - d) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const recentOrders = [...orders].slice(0, 5);
  const recentAppts  = [...appointments].slice(0, 5);

  if (loading) {
    return <div className="loading-state" style={{ padding: '4rem 0' }}><div className="spinner" /> Loading dashboard…</div>;
  }

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Platform Overview</h1>
          <p className="page-subtitle">Real-time analytics and key metrics</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="kpi-grid">
        {[
          {
            label: 'Total Experts',
            value: providers.length,
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
            value: products.length,
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
            value: orders.length,
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
            value: appointments.length,
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
            value: products.filter(p => p.status === 'approved').length,
            Icon: CheckCircle,
            color: '#d4af37',
            iconBg: 'rgba(212,175,55,0.12)',
            accent: 'linear-gradient(90deg,#d4af37,#a67c00)',
            trend: `of ${products.length} total`,
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
        {/* Recent Orders */}
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
              recentOrders.map(o => (
                <div key={o.id} className="activity-item">
                  <div className="activity-avatar">
                    <ShoppingBag size={14} />
                  </div>
                  <div className="activity-info">
                    <div className="title">Order #{o.id?.slice(-6).toUpperCase()}</div>
                    <div className="meta">{o.customerName} · {fmtDate(o.createdAt)}</div>
                  </div>
                  <div className="activity-right">
                    <div className="amt">{fmtCurrency(o.totalPrice)}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h3><Calendar size={15} /> Recent Appointments</h3>
            <span className="view-all" onClick={() => setActiveTab('appointments')}>View all →</span>
          </div>
          <div className="dash-section-body">
            {recentAppts.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="icon">📅</div>
                <p>No appointments yet</p>
              </div>
            ) : (
              recentAppts.map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-avatar" style={{ background: 'linear-gradient(135deg, #ffa726, #e65100)' }}>
                    <Calendar size={14} color="#fff" />
                  </div>
                  <div className="activity-info">
                    <div className="title">{a.customerName}</div>
                    <div className="meta">{a.date} at {a.time}</div>
                  </div>
                  <div className="activity-right" style={{ textAlign: 'right' }}>
                    <div className="meta" style={{ marginBottom: '0.2rem' }}>Dr. {a.providerName}</div>
                    <StatusPill status={a.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action Alerts */}
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
