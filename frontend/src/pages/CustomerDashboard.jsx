import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, User, ShoppingBag, Clock, CheckCircle, AlertCircle, XCircle, Star, Leaf, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import './CustomerDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const statusConfig = {
  pending:     { label: 'Pending',     color: '#ffa726', bg: 'rgba(255, 167, 38, 0.12)', Icon: Clock },
  confirmed:   { label: 'Confirmed',   color: '#29b6f6', bg: 'rgba(41, 182, 246, 0.12)', Icon: CheckCircle },
  processing:  { label: 'Processing',  color: '#ab47bc', bg: 'rgba(171, 71, 188, 0.12)', Icon: Clock },
  shipped:     { label: 'Shipped',     color: '#26c6da', bg: 'rgba(38, 198, 218, 0.12)', Icon: Package },
  delivered:   { label: 'Delivered',   color: '#4caf50', bg: 'rgba(76, 175, 80, 0.12)', Icon: CheckCircle },
  cancelled:   { label: 'Cancelled',   color: '#ef5350', bg: 'rgba(239, 83, 80, 0.12)', Icon: XCircle },
  accepted:    { label: 'Confirmed',   color: '#4caf50', bg: 'rgba(76, 175, 80, 0.12)', Icon: CheckCircle },
  rejected:    { label: 'Declined',    color: '#ef5350', bg: 'rgba(239, 83, 80, 0.12)', Icon: XCircle },
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Real-time orders
  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/my-orders`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [user]);

  // Real-time appointments
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'appointments'),
      where('customerId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const apts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      apts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAppointments(apts);
      setLoadingAppts(false);
    }, () => setLoadingAppts(false));
    return () => unsub();
  }, [user]);

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/my-appointments/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) success('Appointment cancelled.');
      else error('Failed to cancel appointment.');
    } catch {
      error('Error cancelling appointment.');
    }
  };

  const upcomingAppts = appointments.filter(a => ['pending', 'accepted'].includes(a.status));
  const recentOrders = orders.slice(0, 3);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'orders', label: `Orders${orders.length > 0 ? ` (${orders.length})` : ''}`, icon: Package },
    { id: 'appointments', label: `Appointments${upcomingAppts.length > 0 ? ` (${upcomingAppts.length})` : ''}`, icon: Calendar },
  ];

  const profileInitial = (user?.displayName || user?.email || 'U')[0].toUpperCase();
  const profilePic = user?.profileDetails?.profileImageUrl;

  return (
    <div className="customer-dashboard animate-fade-in">
      {/* Profile Header */}
      <div className="dashboard-header">
        <div className="container">
          <div className="dashboard-profile">
            <div className="dashboard-avatar">
              {profilePic
                ? <img src={profilePic} alt={profileInitial} />
                : <span>{profileInitial}</span>
              }
            </div>
            <div className="dashboard-profile-info">
              <h1>Welcome back, {user?.displayName || user?.email?.split('@')[0]}!</h1>
              <p>{user?.email}</p>
              <span className="member-badge"><Star size={12} fill="var(--secondary-color)" stroke="none" /> Premium Member</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="dashboard-quick-stats">
            <div className="quick-stat glass-panel">
              <Package size={20} color="var(--primary-color)" />
              <div>
                <span className="qs-value">{orders.length}</span>
                <span className="qs-label">Total Orders</span>
              </div>
            </div>
            <div className="quick-stat glass-panel">
              <Calendar size={20} color="var(--secondary-color)" />
              <div>
                <span className="qs-value">{appointments.length}</span>
                <span className="qs-label">Appointments</span>
              </div>
            </div>
            <div className="quick-stat glass-panel">
              <CheckCircle size={20} color="var(--success-color)" />
              <div>
                <span className="qs-value">{orders.filter(o => o.status === 'delivered').length}</span>
                <span className="qs-label">Delivered</span>
              </div>
            </div>
            <div className="quick-stat glass-panel">
              <Clock size={20} color="#ffa726" />
              <div>
                <span className="qs-value">{upcomingAppts.length}</span>
                <span className="qs-label">Upcoming Appts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container dashboard-body">
        {/* Tabs */}
        <div className="dashboard-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`dashboard-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="tab-content animate-fade-in">
            <div className="overview-grid">
              {/* Recent Orders */}
              <div className="overview-section glass-panel">
                <div className="overview-section-header">
                  <h2><Package size={18} /> Recent Orders</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('orders')}>
                    View All <ChevronRight size={14} />
                  </button>
                </div>
                {loadingOrders ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div className="spinner spinner-sm" style={{ margin: '0 auto' }} />
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <Package size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p>No orders yet</p>
                    <Link to="/shop" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                      <ShoppingBag size={14} /> Start Shopping
                    </Link>
                  </div>
                ) : recentOrders.map(order => {
                  const s = statusConfig[order.status] || statusConfig.pending;
                  const Icon = s.Icon;
                  return (
                    <div key={order.id} className="mini-order-card">
                      <div>
                        <div className="mini-order-id">Order #{(order.id || '').slice(-8).toUpperCase()}</div>
                        <div className="mini-order-items">{(order.items || []).length} item(s) • Rs. {(order.totalPrice || 0).toLocaleString()}</div>
                        <div className="mini-order-date">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                      <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                        <Icon size={12} /> {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Upcoming Appointments */}
              <div className="overview-section glass-panel">
                <div className="overview-section-header">
                  <h2><Calendar size={18} /> Upcoming Appointments</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('appointments')}>
                    View All <ChevronRight size={14} />
                  </button>
                </div>
                {loadingAppts ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div className="spinner spinner-sm" style={{ margin: '0 auto' }} />
                  </div>
                ) : upcomingAppts.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <Calendar size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p>No upcoming appointments</p>
                    <Link to="/channeling" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                      <Calendar size={14} /> Book a Doctor
                    </Link>
                  </div>
                ) : upcomingAppts.slice(0, 3).map(apt => {
                  const s = statusConfig[apt.status] || statusConfig.pending;
                  const Icon = s.Icon;
                  return (
                    <div key={apt.id} className="mini-appt-card">
                      <div>
                        <div className="mini-order-id">{apt.providerName || 'Doctor'}</div>
                        <div className="mini-order-items">{apt.date} at {apt.time}</div>
                        {apt.notes && <div className="mini-order-date">📝 {apt.notes}</div>}
                      </div>
                      <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                        <Icon size={12} /> {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div className="quick-links-grid">
              <Link to="/shop" className="quick-link-card glass-panel glass-panel-hover">
                <Leaf size={28} color="var(--primary-color)" />
                <span>Browse Ayurvedic Shop</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>
              <Link to="/channeling" className="quick-link-card glass-panel glass-panel-hover">
                <Calendar size={28} color="var(--secondary-color)" />
                <span>Book a Doctor</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>
              <Link to="/ayurvedic-guide" className="quick-link-card glass-panel glass-panel-hover">
                <Leaf size={28} color="var(--primary-color)" />
                <span>Ayurvedic Guide</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="tab-content animate-fade-in">
            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : orders.length === 0 ? (
              <div className="glass-panel empty-state">
                <Package size={48} style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
                <h3>No Orders Yet</h3>
                <p>When you place an order, it will appear here.</p>
                <Link to="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <ShoppingBag size={18} /> Start Shopping
                </Link>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order, idx) => {
                  const s = statusConfig[order.status] || statusConfig.pending;
                  const Icon = s.Icon;
                  const total = order.totalPrice || (order.items || []).reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

                  // Build timeline steps
                  const timeline = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
                  const currentStep = timeline.indexOf(order.status);

                  return (
                    <div key={order.id || idx} className="order-card-full glass-panel">
                      <div className="order-card-header">
                        <div>
                          <h3>Order #{(order.id || '').slice(-8).toUpperCase()}</h3>
                          <p className="order-meta">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                            {order.vendorName && ` • Sold by ${order.vendorName}`}
                          </p>
                        </div>
                        <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                          <Icon size={13} /> {s.label}
                        </span>
                      </div>

                      {/* Order Timeline */}
                      {!['cancelled', 'rejected'].includes(order.status) && (
                        <div className="order-timeline">
                          {timeline.map((step, i) => (
                            <div key={step} className={`timeline-step ${i <= currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}>
                              <div className="timeline-dot" />
                              <span>{step.charAt(0).toUpperCase() + step.slice(1)}</span>
                              {i < timeline.length - 1 && <div className={`timeline-line ${i < currentStep ? 'done' : ''}`} />}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="order-items-list">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="order-item-row">
                            {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="order-item-img" />}
                            <span className="order-item-name">{item.name}</span>
                            <span className="order-item-qty">× {item.quantity || 1}</span>
                            <span className="order-item-price">Rs. {((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="order-card-footer">
                        <span className="order-total">Total: <strong>Rs. {total.toLocaleString()}</strong></span>
                        <span className="order-payment">Payment: {(order.paymentMethod || 'N/A').replace('_', ' ')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div className="tab-content animate-fade-in">
            {loadingAppts ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : appointments.length === 0 ? (
              <div className="glass-panel empty-state">
                <Calendar size={48} style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
                <h3>No Appointments Yet</h3>
                <p>Book a session with an Ayurvedic doctor.</p>
                <Link to="/channeling" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <Calendar size={18} /> Book Appointment
                </Link>
              </div>
            ) : (
              <div className="appt-sections">
                {upcomingAppts.length > 0 && (
                  <div>
                    <h2 className="appt-section-title"><Clock size={18} /> Upcoming ({upcomingAppts.length})</h2>
                    <div className="appt-list">
                      {upcomingAppts.map(apt => {
                        const s = statusConfig[apt.status] || statusConfig.pending;
                        const Icon = s.Icon;
                        return (
                          <div key={apt.id} className="appt-card glass-panel">
                            <div className="appt-card-body">
                              <div>
                                <h3>{apt.providerName || 'Doctor'}</h3>
                                <p className="appt-time"><Calendar size={13} /> {apt.date} &nbsp;<Clock size={13} /> {apt.time}</p>
                                {apt.notes && <p className="appt-notes">📝 {apt.notes}</p>}
                              </div>
                              <div className="appt-actions">
                                <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                                  <Icon size={12} /> {s.label}
                                </span>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleCancelAppointment(apt.id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {appointments.filter(a => !['pending', 'accepted'].includes(a.status)).length > 0 && (
                  <div>
                    <h2 className="appt-section-title" style={{ opacity: 0.7 }}>Past Appointments</h2>
                    <div className="appt-list">
                      {appointments.filter(a => !['pending', 'accepted'].includes(a.status)).map(apt => {
                        const s = statusConfig[apt.status] || statusConfig.cancelled;
                        const Icon = s.Icon;
                        return (
                          <div key={apt.id} className="appt-card glass-panel" style={{ opacity: 0.75 }}>
                            <div className="appt-card-body">
                              <div>
                                <h3>{apt.providerName || 'Doctor'}</h3>
                                <p className="appt-time"><Calendar size={13} /> {apt.date} &nbsp;<Clock size={13} /> {apt.time}</p>
                              </div>
                              <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                                <Icon size={12} /> {s.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
