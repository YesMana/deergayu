import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, User, ShoppingBag, Clock, CheckCircle, XCircle, Star, Leaf, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './CustomerDashboard.css';
import { API_URL } from '../config/api';


const statusConfig = {
  pending:     { labelKey: 'pat_status_pending',     color: '#ffa726', bg: 'rgba(255, 167, 38, 0.12)', Icon: Clock },
  confirmed:   { labelKey: 'pat_status_confirmed',   color: '#29b6f6', bg: 'rgba(41, 182, 246, 0.12)', Icon: CheckCircle },
  processing:  { labelKey: 'pat_status_processing',  color: '#ab47bc', bg: 'rgba(171, 71, 188, 0.12)', Icon: Clock },
  shipped:     { labelKey: 'pat_status_shipped',     color: '#26c6da', bg: 'rgba(38, 198, 218, 0.12)', Icon: Package },
  delivered:   { labelKey: 'pat_status_delivered',   color: '#4caf50', bg: 'rgba(76, 175, 80, 0.12)', Icon: CheckCircle },
  cancelled:   { labelKey: 'pat_status_cancelled',   color: '#ef5350', bg: 'rgba(239, 83, 80, 0.12)', Icon: XCircle },
  accepted:    { labelKey: 'pat_status_confirmed',   color: '#4caf50', bg: 'rgba(76, 175, 80, 0.12)', Icon: CheckCircle },
  rejected:    { labelKey: 'pat_status_declined',    color: '#ef5350', bg: 'rgba(239, 83, 80, 0.12)', Icon: XCircle },
};

const localeForLang = (lang) => ({ si: 'si-LK', ta: 'ta-LK', en: 'en-US' }[lang] || 'en-US');

const formatConsultationType = (type, t) => {
  const key = {
    in_person: 'consult_in_person',
    video: 'consult_video',
    audio: 'consult_audio',
  }[type];
  return key ? t(key) : String(type || '').replace('_', ' ');
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { t, lang } = useLanguage();
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
    if (!window.confirm(t('pat_confirm_cancel'))) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/my-appointments/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) success(t('pat_cancel_success'));
      else error(t('pat_cancel_fail'));
    } catch {
      error(t('pat_cancel_error'));
    }
  };

  const upcomingAppts = appointments.filter(a => ['pending', 'accepted', 'confirmed'].includes(a.status));
  const cancelledAppts = appointments.filter(a => ['cancelled', 'rejected'].includes(a.status));
  const pastAppts = appointments.filter(
    (a) => !['pending', 'accepted', 'confirmed'].includes(a.status) && !['cancelled', 'rejected'].includes(a.status)
  );
  const recentOrders = orders.slice(0, 3);

  const tabs = [
    { id: 'overview', label: t('pat_overview'), icon: User },
    { id: 'orders', label: `${t('pat_orders')}${orders.length > 0 ? ` (${orders.length})` : ''}`, icon: Package },
    { id: 'appointments', label: `${t('pat_appointments')}${upcomingAppts.length > 0 ? ` (${upcomingAppts.length})` : ''}`, icon: Calendar },
    { id: 'profile', label: t('pat_profile'), icon: User },
  ];

  const profileInitial = (user?.displayName || user?.email || 'U')[0].toUpperCase();
  const profilePic = user?.profileDetails?.profileImageUrl;
  const displayName = user?.displayName || user?.email?.split('@')[0];

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
              <h1>{t('pat_welcome_back')}, {displayName}!</h1>
              <p>{user?.email}</p>
              <span className="member-badge"><Star size={12} fill="var(--secondary-color)" stroke="none" /> {t('pat_patient_account')}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="dashboard-quick-stats">
            <div className="quick-stat glass-panel">
              <Package size={20} color="var(--primary-color)" />
              <div>
                <span className="qs-value">{orders.length}</span>
                <span className="qs-label">{t('pat_total_orders')}</span>
              </div>
            </div>
            <div className="quick-stat glass-panel">
              <Calendar size={20} color="var(--secondary-color)" />
              <div>
                <span className="qs-value">{appointments.length}</span>
                <span className="qs-label">{t('pat_appointments')}</span>
              </div>
            </div>
            <div className="quick-stat glass-panel">
              <CheckCircle size={20} color="var(--success-color)" />
              <div>
                <span className="qs-value">{orders.filter(o => o.status === 'delivered').length}</span>
                <span className="qs-label">{t('pat_status_delivered')}</span>
              </div>
            </div>
            <div className="quick-stat glass-panel">
              <Clock size={20} color="#ffa726" />
              <div>
                <span className="qs-value">{upcomingAppts.length}</span>
                <span className="qs-label">{t('pat_upcoming_appts')}</span>
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
                  <h2><Package size={18} /> {t('pat_recent_orders')}</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('orders')}>
                    {t('common_view_all')} <ChevronRight size={14} />
                  </button>
                </div>
                {loadingOrders ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div className="spinner spinner-sm" style={{ margin: '0 auto' }} />
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <Package size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p>{t('pat_no_orders')}</p>
                    <Link to="/shop" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                      <ShoppingBag size={14} /> {t('pat_start_shopping')}
                    </Link>
                  </div>
                ) : recentOrders.map(order => {
                  const s = statusConfig[order.status] || statusConfig.pending;
                  const Icon = s.Icon;
                  return (
                    <div key={order.id} className="mini-order-card">
                      <div>
                        <div className="mini-order-id">{t('pat_order_number')} #{(order.id || '').slice(-8).toUpperCase()}</div>
                        <div className="mini-order-items">
                          {(order.items || []).length} {t((order.items || []).length === 1 ? 'pat_item' : 'pat_items')} • Rs. {(order.totalPrice || 0).toLocaleString()}
                        </div>
                        <div className="mini-order-date">{order.createdAt ? new Date(order.createdAt).toLocaleDateString(localeForLang(lang)) : ''}</div>
                      </div>
                      <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                        <Icon size={12} /> {t(s.labelKey)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Upcoming Appointments */}
              <div className="overview-section glass-panel">
                <div className="overview-section-header">
                  <h2><Calendar size={18} /> {t('pat_upcoming_appointments')}</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('appointments')}>
                    {t('common_view_all')} <ChevronRight size={14} />
                  </button>
                </div>
                {loadingAppts ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div className="spinner spinner-sm" style={{ margin: '0 auto' }} />
                  </div>
                ) : upcomingAppts.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    <Calendar size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                    <p>{t('pat_no_upcoming_appointments')}</p>
                    <Link to="/doctors" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                      <Calendar size={14} /> {t('home_find_doctor')}
                    </Link>
                  </div>
                ) : upcomingAppts.slice(0, 3).map(apt => {
                  const s = statusConfig[apt.status] || statusConfig.pending;
                  const Icon = s.Icon;
                  return (
                    <div key={apt.id} className="mini-appt-card">
                      <div>
                        <div className="mini-order-id">{apt.providerName || t('pat_doctor_fallback')}</div>
                        <div className="mini-order-items">{apt.date} {t('pat_at_time')} {apt.time}</div>
                        {apt.notes && <div className="mini-order-date">📝 {apt.notes}</div>}
                      </div>
                      <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                        <Icon size={12} /> {t(s.labelKey)}
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
                <span>{t('pat_browse_shop')}</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>
              <Link to="/doctors" className="quick-link-card glass-panel glass-panel-hover">
                <Calendar size={28} color="var(--secondary-color)" />
                <span>{t('home_find_doctor')}</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </Link>
              <Link to="/ayurvedic-guide" className="quick-link-card glass-panel glass-panel-hover">
                <Leaf size={28} color="var(--primary-color)" />
                <span>{t('nav_guide')}</span>
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
                <h3>{t('pat_no_orders_title')}</h3>
                <p>{t('pat_no_orders_body')}</p>
                <Link to="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <ShoppingBag size={18} /> {t('pat_start_shopping')}
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
                          <h3>{t('pat_order_number')} #{(order.id || '').slice(-8).toUpperCase()}</h3>
                          <p className="order-meta">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString(localeForLang(lang), { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                            {order.vendorName && ` • ${t('pat_sold_by')} ${order.vendorName}`}
                          </p>
                        </div>
                        <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                          <Icon size={13} /> {t(s.labelKey)}
                        </span>
                      </div>

                      {/* Order Timeline */}
                      {!['cancelled', 'rejected'].includes(order.status) && (
                        <div className="order-timeline">
                          {timeline.map((step, i) => (
                            <div key={step} className={`timeline-step ${i <= currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}>
                              <div className="timeline-dot" />
                              <span>{t(statusConfig[step]?.labelKey || `pat_status_${step}`)}</span>
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
                        <span className="order-total">{t('pat_total')}: <strong>Rs. {total.toLocaleString()}</strong></span>
                        <span className="order-payment">{t('pat_payment')}: {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : t('common_not_found')}</span>
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
                <h3>{t('pat_no_appointments_title')}</h3>
                <p>{t('pat_no_appointments_body')}</p>
                <Link to="/doctors" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <Calendar size={18} /> {t('home_find_doctor')}
                </Link>
              </div>
            ) : (
              <div className="appt-sections">
                {upcomingAppts.length > 0 && (
                  <div>
                    <h2 className="appt-section-title"><Clock size={18} /> {t('pat_upcoming')} ({upcomingAppts.length})</h2>
                    <div className="appt-list">
                      {upcomingAppts.map(apt => {
                        const s = statusConfig[apt.status] || statusConfig.pending;
                        const Icon = s.Icon;
                        return (
                          <div key={apt.id} className="appt-card glass-panel">
                            <div className="appt-card-body">
                              <div>
                                <h3>{apt.providerName || t('pat_doctor_fallback')}</h3>
                                <p className="appt-time"><Calendar size={13} /> {apt.date} &nbsp;<Clock size={13} /> {apt.time}</p>
                                {apt.consultationType && (
                                  <p className="appt-notes">{t('pat_appointment_type')}: {formatConsultationType(apt.consultationType, t)}</p>
                                )}
                                {apt.notes && <p className="appt-notes">{apt.notes}</p>}
                                {apt.paymentReference && (
                                  <p className="appt-notes">{t('pat_payment_ref')}: {apt.paymentReference}</p>
                                )}
                              </div>
                              <div className="appt-actions">
                                <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                                  <Icon size={12} /> {t(s.labelKey)}
                                </span>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleCancelAppointment(apt.id)}
                                >
                                  {t('pat_cancel')}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pastAppts.length > 0 && (
                  <div>
                    <h2 className="appt-section-title" style={{ opacity: 0.7 }}>{t('pat_past')} ({pastAppts.length})</h2>
                    <div className="appt-list">
                      {pastAppts.map(apt => {
                        const s = statusConfig[apt.status] || statusConfig.pending;
                        const Icon = s.Icon;
                        return (
                          <div key={apt.id} className="appt-card glass-panel" style={{ opacity: 0.85 }}>
                            <div className="appt-card-body">
                              <div>
                                <h3>{apt.providerName || t('pat_doctor_fallback')}</h3>
                                <p className="appt-time"><Calendar size={13} /> {apt.date} &nbsp;<Clock size={13} /> {apt.time}</p>
                                {apt.consultationType && (
                                  <p className="appt-notes">{t('pat_appointment_type')}: {formatConsultationType(apt.consultationType, t)}</p>
                                )}
                              </div>
                              <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                                <Icon size={12} /> {t(s.labelKey)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cancelledAppts.length > 0 && (
                  <div>
                    <h2 className="appt-section-title" style={{ opacity: 0.7 }}>{t('pat_cancelled')} ({cancelledAppts.length})</h2>
                    <div className="appt-list">
                      {cancelledAppts.map(apt => {
                        const s = statusConfig[apt.status] || statusConfig.cancelled;
                        const Icon = s.Icon;
                        return (
                          <div key={apt.id} className="appt-card glass-panel" style={{ opacity: 0.7 }}>
                            <div className="appt-card-body">
                              <div>
                                <h3>{apt.providerName || t('pat_doctor_fallback')}</h3>
                                <p className="appt-time"><Calendar size={13} /> {apt.date} &nbsp;<Clock size={13} /> {apt.time}</p>
                              </div>
                              <span className="status-pill" style={{ background: s.bg, color: s.color }}>
                                <Icon size={12} /> {t(s.labelKey)}
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

        {activeTab === 'profile' && (
          <div className="tab-content animate-fade-in">
            <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: 520 }}>
              <h2 style={{ marginTop: 0 }}>{t('pat_your_profile')}</h2>
              <p><strong>{t('pat_name')}:</strong> {user?.displayName || '—'}</p>
              <p><strong>{t('pat_email')}:</strong> {user?.email || '—'}</p>
              <p><strong>{t('pat_role')}:</strong> {t('pat_patient')}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {t('pat_profile_note')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '1rem' }}>
                <Link to="/doctors" className="btn btn-primary btn-sm">{t('home_find_doctor')}</Link>
                <Link to="/contact" className="btn btn-outline btn-sm">{t('home_contact_support')}</Link>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => window.location.href = '/login'}>
                  {t('pat_account_logout_menu')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
