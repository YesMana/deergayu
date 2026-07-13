import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, LayoutDashboard, Settings, Search, ShieldAlert,
  ChevronLeft, ChevronRight, Package, ShoppingBag, Calendar,
  TrendingUp, CheckCircle, Clock, XCircle, DollarSign, Activity,
  Eye, EyeOff, Trash2, RefreshCw, AlertTriangle, Video
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit, startAfter, getCountFromServer, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from '../context/ToastContext';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Helpers ────────────────────────────────────────────────
const fmtCurrency = (n) => `Rs. ${Number(n || 0).toLocaleString('en-LK')}`;
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateShort = (s) => s ? new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short' }) : '—';
const userInitials = (u) => (u?.name || u?.email || 'U').slice(0, 2).toUpperCase();

const STATUS_COLORS = {
  pending:    { bg: 'rgba(255,167,38,0.15)',  color: '#ffa726' },
  confirmed:  { bg: 'rgba(41,182,246,0.15)',  color: '#29b6f6' },
  processing: { bg: 'rgba(171,71,188,0.15)',  color: '#ab47bc' },
  shipped:    { bg: 'rgba(38,198,218,0.15)',   color: '#26c6da' },
  delivered:  { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
  cancelled:  { bg: 'rgba(239,83,80,0.15)',    color: '#ef5350' },
  approved:   { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
  hidden:     { bg: 'rgba(144,164,174,0.15)', color: '#90a4ae' },
  rejected:   { bg: 'rgba(239,83,80,0.15)',   color: '#ef5350' },
  accepted:   { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
  completed:  { bg: 'rgba(38,198,218,0.15)',   color: '#26c6da' },
  active:     { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
};

const StatusPill = ({ status }) => {
  const cfg = STATUS_COLORS[status] || { bg: 'rgba(255,255,255,0.1)', color: '#aaa' };
  return (
    <span className="status-pill" style={{ background: cfg.bg, color: cfg.color }}>
      {status || '—'}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────
const AdminDashboard = () => {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data states
  const [providers, setProviders] = useState([]);
  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings]   = useState({ commissionPercent: 10, autoApproveExperts: false, autoApproveProducts: false });
  const [platformUsers, setPlatformUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ title: '', description: '', youtubeId: '', category: 'Yoga & Meditation', duration: '' });

  // Selected Doctor Details Modal states
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [loadingDoctorAppts, setLoadingDoctorAppts] = useState(false);
  const [modalTab, setModalTab] = useState('profile'); // 'profile' or 'appointments'

  // Selected Platform User Details Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAppts, setUserAppts] = useState([]);
  const [loadingUserAppts, setLoadingUserAppts] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);
  const [userModalTab, setUserModalTab] = useState('profile'); // 'profile', 'appointments', 'orders'

  // Selected Order / Product Details Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Loading states
  const [loadingProviders, setLoadingProviders]       = useState(false);
  const [loadingProducts, setLoadingProducts]         = useState(false);
  const [loadingOrders, setLoadingOrders]             = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingUsers, setLoadingUsers]               = useState(false);
  const [savingSettings, setSavingSettings]           = useState(false);

  // Filters
  const [filterVendor, setFilterVendor]     = useState('All');
  const [filterProduct, setFilterProduct]   = useState('All');
  const [userSearch, setUserSearch]         = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [providerSearch, setProviderSearch] = useState('');
  const [productSearch, setProductSearch]   = useState('');
  const [orderSearch, setOrderSearch]       = useState('');
  const [apptSearch, setApptSearch]         = useState('');

  // Appointments filter states
  const [apptDoctorFilter, setApptDoctorFilter] = useState('all');
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [apptDateFilter, setApptDateFilter] = useState(getTodayDateString());


  // Pagination (All Users)
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage]     = useState(1);
  const [totalUsers, setTotalUsers]       = useState(0);
  const [pagesCursors, setPagesCursors]   = useState([null]);

  // Pagination (Manage Providers/Experts)
  const [currentPageProviders, setCurrentPageProviders] = useState(1);
  const [providersCursors, setProvidersCursors] = useState([null]);
  const [totalProviders, setTotalProviders] = useState(0);

  const searchDebounceRef = useRef(null);

  // ── Data Fetching ──────────────────────────────────────────
  const getToken = () => auth.currentUser?.getIdToken();

  const fetchProviders = useCallback(async (startCursor) => {
    setLoadingProviders(true);
    try {
      const usersCol = collection(db, 'users');
      const constraints = [
        where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor']),
        limit(PAGE_SIZE)
      ];
      if (startCursor) constraints.push(startAfter(startCursor));

      const q = query(usersCol, ...constraints);
      const snap = await getDocs(q);
      let experts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort experts chronologically (newest first) client-side to avoid Firestore composite index requirement
      experts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      if (providerSearch.trim()) {
        const term = providerSearch.toLowerCase();
        experts = experts.filter(u => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
      }

      const lastDoc = snap.docs[snap.docs.length - 1];
      setProvidersCursors(prev => { const u = [...prev]; u[currentPageProviders] = lastDoc || null; return u; });
      setProviders(experts);

      if (!startCursor) {
        try {
          const countQ = query(usersCol, where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor']));
          const countSnap = await getCountFromServer(countQ);
          setTotalProviders(countSnap.data().count);
        } catch { setTotalProviders(0); }
      }
    } catch (e) {
      console.error("Firestore fetch error:", e);
    } finally {
      setLoadingProviders(false);
    }
  }, [providerSearch, currentPageProviders]);

  const fetchDoctorAppointments = async (doctorId) => {
    setLoadingDoctorAppts(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('providerId', '==', doctorId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
      setDoctorAppts(list.slice(0, 50)); // Show last 50
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDoctorAppts(false);
    }
  };

  const fetchUserAppointments = async (uid) => {
    setLoadingUserAppts(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('customerId', '==', uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
      setUserAppts(list.slice(0, 50)); // Show last 50
    } catch (e) {
      console.error("Error fetching user appointments:", e);
    } finally {
      setLoadingUserAppts(false);
    }
  };

  const fetchUserOrders = async (uid) => {
    setLoadingUserOrders(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUserOrders(list.slice(0, 50)); // Show last 50
    } catch (e) {
      console.error("Error fetching user orders:", e);
    } finally {
      setLoadingUserOrders(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally { setLoadingProducts(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setOrders(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingOrders(false); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/appointments`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAppointments(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingAppointments(false); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSettings(await res.json());
    } catch (e) { console.error(e); }
  }, []);


  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/videos`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) setVideos(await res.json());
    } catch (e) { console.error(e); }
    setLoadingVideos(false);
  }, []);

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const method = editingVideo ? 'PUT' : 'POST';
      const url = editingVideo ? `${API_URL}/api/videos/${editingVideo.id}` : `${API_URL}/api/videos`;
      const res = await fetch(url, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(videoForm)
      });
      if (res.ok) {
        success(editingVideo ? 'Video updated successfully' : 'Video added successfully');
        setShowVideoModal(false);
        fetchVideos();
      } else {
        error('Failed to save video');
      }
    } catch (err) { error('Error saving video'); }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/videos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { success('Video deleted'); fetchVideos(); }
      else error('Failed to delete video');
    } catch (err) { error('Error deleting video'); }
  };


  const fetchUsers = useCallback(async (startCursor) => {
    setLoadingUsers(true);
    try {
      const usersCol = collection(db, 'users');
      const constraints = [];
      
      // If filtering by role, omit orderBy to avoid composite index requirements. Sort client-side instead.
      if (userRoleFilter !== 'all') {
        constraints.push(where('role', '==', userRoleFilter));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }
      
      constraints.push(limit(PAGE_SIZE));
      if (startCursor) constraints.push(startAfter(startCursor));

      const q = query(usersCol, ...constraints);
      const snap = await getDocs(q);
      let userList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (userRoleFilter !== 'all') {
        userList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      if (userSearch.trim()) {
        const term = userSearch.toLowerCase();
        userList = userList.filter(u => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
      }

      const lastDoc = snap.docs[snap.docs.length - 1];
      setPagesCursors(prev => { const u = [...prev]; u[currentPage] = lastDoc || null; return u; });
      setPlatformUsers(userList);

      if (!startCursor) {
        try {
          const countQ = userRoleFilter !== 'all'
            ? query(usersCol, where('role', '==', userRoleFilter))
            : query(usersCol);
          const countSnap = await getCountFromServer(countQ);
          setTotalUsers(countSnap.data().count);
        } catch { setTotalUsers(0); }
      }
    } catch (e) { console.error(e); } finally { setLoadingUsers(false); }
  }, [userRoleFilter, userSearch, currentPage]);

  // Tab switching
  useEffect(() => {
    if (activeTab === 'dashboard') { fetchProviders(null); fetchProducts(); fetchOrders(); fetchAppointments(); }
    if (activeTab === 'providers')   { setCurrentPageProviders(1); setProvidersCursors([null]); fetchProviders(null); }
    if (activeTab === 'products')    fetchProducts();
    if (activeTab === 'orders')      fetchOrders();
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'settings')    fetchSettings();
    if (activeTab === 'users')       { setCurrentPage(1); setPagesCursors([null]); }
    if (activeTab === 'videos')      fetchVideos();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    setCurrentPage(1); setPagesCursors([null]); fetchUsers(null);
  }, [userRoleFilter]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { setCurrentPage(1); setPagesCursors([null]); fetchUsers(null); }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [userSearch]);

  useEffect(() => {
    if (activeTab !== 'providers') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { setCurrentPageProviders(1); setProvidersCursors([null]); fetchProviders(null); }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [providerSearch]);

  // ── Actions ────────────────────────────────────────────────
  const handleApproveUser = async (uid) => {
    if (!window.confirm('Approve this expert?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) { success('Expert approved!'); fetchProviders(); fetchUsers(null); }
      else error('Failed to approve');
    } catch (e) { error(e.message); }
  };

  const handleUpdateRole = async (uid, newRole) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) { success('Role updated!'); fetchUsers(null); }
      else error('Failed to update role');
    } catch (e) { error(e.message); }
  };

  const handleDeleteUser = async (uid, name) => {
    if (!window.confirm(`Delete ${name || 'this user'}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setPlatformUsers(prev => prev.filter(u => u.id !== uid));
      success('User deleted.');
      try {
        const token = await getToken();
        await fetch(`${API_URL}/api/users/${uid}/delete`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    } catch (e) { error(`Error: ${e.message}`); }
  };

  const handleProductAction = async (id, action) => {
    const newStatus = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'rejected';
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) { success(`Product ${action}d!`); fetchProducts(); }
      else { setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p)); }
    } catch (e) { error('Error updating product'); }
  };

  const handleOrderStatus = async (id, status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) { success('Order status updated!'); setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); }
      else error('Failed to update order');
    } catch (e) { error(e.message); }
  };

  const handleUpdateAppointmentStatus = async (id, status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/appointments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        success('Appointment status updated!');
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      } else {
        error('Failed to update appointment status');
      }
    } catch (e) {
      error(e.message);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm('Delete this appointment? This cannot be undone.')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        success('Appointment deleted!');
        setAppointments(prev => prev.filter(a => a.id !== id));
      } else {
        error('Failed to delete appointment');
      }
    } catch (e) {
      error(e.message);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) success('Settings saved!');
      else error('Failed to save');
    } catch (e) { error(e.message); } finally { setSavingSettings(false); }
  };

  const handleNextPage = () => {
    const cursor = pagesCursors[currentPage];
    if (!cursor) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    fetchUsers(cursor);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prev = currentPage - 1;
    setCurrentPage(prev);
    fetchUsers(pagesCursors[prev - 1] || null);
  };

  const handleNextPageProviders = () => {
    const cursor = providersCursors[currentPageProviders];
    if (!cursor) return;
    const next = currentPageProviders + 1;
    setCurrentPageProviders(next);
    fetchProviders(cursor);
  };

  const handlePrevPageProviders = () => {
    if (currentPageProviders <= 1) return;
    const prev = currentPageProviders - 1;
    setCurrentPageProviders(prev);
    fetchProviders(providersCursors[prev - 1] || null);
  };

  // ── Derived Stats ──────────────────────────────────────────
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

  // ── Filter helpers ─────────────────────────────────────────
  const filteredProviders = providers.filter(p => {
    const s = providerSearch.toLowerCase();
    return !s || p.name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s);
  });

  const filteredProducts = products.filter(p => {
    const s = productSearch.toLowerCase();
    const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.vendorName?.toLowerCase().includes(s);
    const matchStatus = filterProduct === 'All' || p.status === filterProduct;
    return matchSearch && matchStatus;
  });

  const filteredOrders = orders.filter(o => {
    const s = orderSearch.toLowerCase();
    return !s || o.customerName?.toLowerCase().includes(s) || o.id?.toLowerCase().includes(s) || o.vendorName?.toLowerCase().includes(s);
  });

  const filteredAppts = appointments.filter(a => {
    const matchSearch = !apptSearch ||
      a.customerName?.toLowerCase().includes(apptSearch.toLowerCase()) ||
      a.providerName?.toLowerCase().includes(apptSearch.toLowerCase());

    const matchDoctor = apptDoctorFilter === 'all' || a.providerId === apptDoctorFilter;
    const matchDate   = !apptDateFilter || a.date === apptDateFilter;

    return matchSearch && matchDoctor && matchDate;
  });

  const recentOrders = [...orders].slice(0, 5);
  const recentAppts  = [...appointments].slice(0, 5);

  // ── Nav items ──────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard',    label: 'Overview',         Icon: LayoutDashboard },
    { id: 'providers',    label: 'Manage Experts',   Icon: Users,           badge: pendingExperts },
    { id: 'users',        label: 'All Users',         Icon: ShieldAlert },
    { id: 'products',     label: 'Product Approvals', Icon: Package,         badge: pendingProducts },
    { id: 'orders',       label: 'All Orders',        Icon: ShoppingBag,     badge: pendingOrders },
    { id: 'appointments', label: 'Appointments',      Icon: Calendar },
    { id: 'settings',     label: 'Settings',          Icon: Settings },
    { id: 'videos',       label: 'Videos',            Icon: Video },
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="admin-layout animate-fade-in">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">🌿</div>
          <div className="admin-brand-text">
            <h2>Deergayu</h2>
            <span>Admin Console</span>
          </div>
        </div>

        <ul className="admin-nav">
          <li className="admin-nav-section-title">Main</li>
          {navItems.slice(0, 1).map(({ id, label, Icon, badge }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </li>
          ))}
          <li className="admin-nav-section-title">Management</li>
          {navItems.slice(1, 6).map(({ id, label, Icon, badge }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </li>
          ))}
          <li className="admin-nav-section-title">System</li>
          {navItems.slice(6).map(({ id, label, Icon }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">

        {/* ══════════════════════ DASHBOARD OVERVIEW ══════════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            <div className="admin-page-header">
              <div>
                <h1>Platform Overview</h1>
                <p className="page-subtitle">Real-time analytics and key metrics</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { fetchProviders(); fetchProducts(); fetchOrders(); fetchAppointments(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* KPI Grid */}
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

            {/* Recent Activity */}
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
                  ) : recentOrders.map(o => (
                    <div key={o.id} className="activity-item">
                      <div className="activity-avatar">
                        {(o.customerName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="activity-info">
                        <div className="title">{o.customerName || 'Customer'}</div>
                        <div className="subtitle">{o.vendorName || '—'} · {fmtDateShort(o.createdAt)}</div>
                      </div>
                      <div className="activity-meta">
                        <div className="amount">{fmtCurrency(o.totalPrice)}</div>
                        <StatusPill status={o.status} />
                      </div>
                    </div>
                  ))}
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
                  ) : recentAppts.map(a => (
                    <div key={a.id} className="appt-mini-item">
                      <div className="appt-mini-info">
                        <div className="name">{a.customerName || '—'}</div>
                        <div className="meta">{a.providerName || '—'}</div>
                      </div>
                      <div className="appt-mini-time">
                        <div>{a.date}</div>
                        <StatusPill status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pending Alerts */}
            {(pendingExperts > 0 || pendingProducts > 0) && (
              <div className="dash-section" style={{ borderColor: 'rgba(255,167,38,0.25)' }}>
                <div className="dash-section-header">
                  <h3><AlertTriangle size={15} color="#ffa726" /> Action Required</h3>
                </div>
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {pendingExperts > 0 && (
                    <button
                      className="btn btn-outline"
                      onClick={() => setActiveTab('providers')}
                      style={{ borderColor: '#ffa726', color: '#ffa726', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
        )}

        {/* ══════════════════════ EXPERTS ══════════════════════ */}
        {activeTab === 'providers' && (
          <>
            <div className="admin-page-header">
              <div><h1>Manage Experts</h1><p className="page-subtitle">Approve and manage doctors, clinics, and organizations</p></div>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchProviders(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="table-container">
              <div className="table-toolbar">
                <span className="table-title"><Users size={16} /> Experts</span>
                <div className="table-controls">
                  <div className="search-box" style={{ minWidth: '220px' }}>
                    <Search size={14} />
                    <input placeholder="Search name or email…" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} />
                  </div>
                </div>
              </div>

              {loadingProviders ? (
                <div className="loading-state"><div className="spinner spinner-sm" /> Loading experts…</div>
              ) : providers.length === 0 ? (
                <div className="empty-state"><div className="icon">👤</div><h4>No experts found</h4></div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                      <thead><tr>
                        <th>Expert</th><th>Role</th><th>Specialty</th><th>Location</th><th>Status</th><th>Actions</th>
                      </tr></thead>
                      <tbody>
                        {providers.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div className="user-cell">
                                <div className="user-avatar">
                                  {p.profileDetails?.profileImageUrl
                                    ? <img src={p.profileDetails.profileImageUrl} alt={p.name} />
                                    : userInitials(p)}
                                </div>
                                <div>
                                  <div className="name">{p.name || '—'}</div>
                                  <div className="email">{p.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textTransform: 'capitalize' }}>{p.role}</td>
                            <td>{p.profileDetails?.specialty || p.profileDetails?.category || '—'}</td>
                            <td>{p.profileDetails?.address || '—'}</td>
                            <td><StatusPill status={p.status === 'pending' ? 'pending' : 'approved'} /></td>
                            <td>
                              <div className="action-btns">
                                {p.status === 'pending' && (
                                  <button className="btn-xs approve" onClick={() => handleApproveUser(p.id)}>
                                    Approve
                                  </button>
                                )}
                                <button
                                  className="btn-xs edit-btn"
                                  onClick={() => {
                                    setSelectedDoctor(p);
                                    fetchDoctorAppointments(p.id);
                                  }}
                                  style={{ background: 'var(--primary-color)', color: 'white' }}
                                >
                                  View Details
                                </button>
                                <a href={`mailto:${p.email}`} className="btn-xs edit-btn" style={{ textDecoration: 'none' }}>
                                  Email
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="users-pagination">
                    <button className="btn btn-ghost btn-sm" onClick={handlePrevPageProviders} disabled={currentPageProviders <= 1 || loadingProviders}>
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="page-info">
                      Page <strong>{currentPageProviders}</strong>
                      {totalProviders > 0 && ` of ${Math.ceil(totalProviders / PAGE_SIZE)}`}
                      {totalProviders > 0 && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({totalProviders.toLocaleString()} total)</span>}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={handleNextPageProviders} disabled={!providersCursors[currentPageProviders] || loadingProviders}>
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════ ALL USERS ══════════════════════ */}
        {activeTab === 'users' && (
          <>
            <div className="admin-page-header">
              <div>
                <h1>User Management</h1>
                <p className="page-subtitle">
                  {totalUsers > 0 ? `${totalUsers.toLocaleString()} registered users` : 'All platform users'}
                </p>
              </div>
            </div>
            <div className="table-container">
              <div className="table-toolbar">
                <span className="table-title"><ShieldAlert size={16} /> Users</span>
                <div className="table-controls">
                  <div className="search-box">
                    <Search size={14} />
                    <input placeholder="Search name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  </div>
                  <div className="filter-chips">
                    {['all','user','doctor','clinic','organization','vendor'].map(r => (
                      <button key={r} className={`filter-chip ${userRoleFilter === r ? 'active' : ''}`} onClick={() => setUserRoleFilter(r)}>
                        {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loadingUsers ? (
                <div className="loading-state"><div className="spinner spinner-sm" /> Loading users…</div>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                      <thead><tr>
                        <th>#</th><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
                      </tr></thead>
                      <tbody>
                        {platformUsers.length === 0 ? (
                          <tr><td colSpan="6"><div className="empty-state"><div className="icon">👤</div><p>No users found</p></div></td></tr>
                        ) : platformUsers.map((u, idx) => (
                          <tr key={u.id}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                              {(currentPage - 1) * PAGE_SIZE + idx + 1}
                            </td>
                            <td>
                              <div className="user-cell">
                                <div className="user-avatar">{userInitials(u)}</div>
                                <div>
                                  <div className="name">{u.name || '—'}</div>
                                  <div className="email">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <select
                                className="role-select"
                                value={u.role || 'user'}
                                onChange={e => handleUpdateRole(u.id, e.target.value)}
                                disabled={u.email === 'yes.manujaya@gmail.com'}
                              >
                                {['user','doctor','clinic','organization','vendor'].map(r => (
                                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                ))}
                                {u.email === 'yes.manujaya@gmail.com' && <option value="admin">Admin</option>}
                              </select>
                            </td>
                            <td><StatusPill status={u.status === 'pending' ? 'pending' : 'active'} /></td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{fmtDate(u.createdAt)}</td>
                            <td>
                              <div className="action-btns">
                                {u.status === 'pending' && (
                                  <button className="btn-xs approve" onClick={() => handleApproveUser(u.id)}>Approve</button>
                                )}
                                <button
                                  className="btn-xs edit-btn"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setUserModalTab('profile');
                                    fetchUserAppointments(u.id);
                                    fetchUserOrders(u.id);
                                  }}
                                  style={{ background: 'var(--primary-color)', color: 'white' }}
                                >
                                  View Details
                                </button>
                                <button
                                  className="btn-xs delete-btn"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  disabled={u.email === 'yes.manujaya@gmail.com'}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="users-pagination">
                    <button className="btn btn-ghost btn-sm" onClick={handlePrevPage} disabled={currentPage <= 1 || loadingUsers}>
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="page-info">
                      Page <strong>{currentPage}</strong>
                      {totalUsers > 0 && ` of ${Math.ceil(totalUsers / PAGE_SIZE)}`}
                      {totalUsers > 0 && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({totalUsers.toLocaleString()} total)</span>}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={handleNextPage} disabled={!pagesCursors[currentPage] || loadingUsers}>
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════ PRODUCTS ══════════════════════ */}
        {activeTab === 'products' && (
          <>
            <div className="admin-page-header">
              <div><h1>Product Approvals</h1><p className="page-subtitle">Review vendor products before they go live</p></div>
              <button className="btn btn-ghost btn-sm" onClick={fetchProducts} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="table-container">
              <div className="table-toolbar">
                <span className="table-title"><Package size={16} /> {filteredProducts.length} products</span>
                <div className="table-controls">
                  <div className="search-box">
                    <Search size={14} />
                    <input placeholder="Search product or vendor…" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                  </div>
                  <div className="filter-chips">
                    {['All','pending','approved','hidden','rejected'].map(s => (
                      <button key={s} className={`filter-chip ${filterProduct === s ? 'active' : ''}`} onClick={() => setFilterProduct(s)}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loadingProducts ? (
                <div className="loading-state"><div className="spinner spinner-sm" /> Loading products…</div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state"><div className="icon">📦</div><h4>No products found</h4></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead><tr>
                      <th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredProducts.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="product-cell">
                              {(p.imageUrl || (p.images && p.images[0])) ? (
                                <img
                                  src={p.imageUrl || p.images[0]}
                                  alt={p.name}
                                  className="product-thumb"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                              )}
                              <div>
                                <div className="name">{p.name}</div>
                                <div className="desc">{p.description || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td>{p.vendorName || p.vendorId?.slice(0, 8) || '—'}</td>
                          <td>{p.category || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{fmtCurrency(p.price || p.basePrice)}</td>
                          <td>{p.stock ?? '—'}</td>
                          <td><StatusPill status={p.status} /></td>
                          <td>
                             <div className="action-btns">
                               <button
                                 className="btn-xs edit-btn"
                                 onClick={() => setSelectedProduct(p)}
                                 style={{ background: 'var(--primary-color)', color: 'white' }}
                               >
                                 View Details
                               </button>
                               {p.status === 'pending' && (
                                 <button className="btn-xs approve" onClick={() => handleProductAction(p.id, 'approve')}>Approve</button>
                                )}
                               {p.status === 'approved' && (
                                 <button className="btn-xs hide-btn" onClick={() => handleProductAction(p.id, 'hide')}>
                                   <EyeOff size={12} style={{ display: 'inline', marginRight: '3px' }} />Hide
                                 </button>
                               )}
                               {(p.status === 'hidden' || p.status === 'rejected') && (
                                 <button className="btn-xs approve" onClick={() => handleProductAction(p.id, 'approve')}>
                                   <Eye size={12} style={{ display: 'inline', marginRight: '3px' }} />Re-Approve
                                 </button>
                               )}
                               {p.status === 'pending' && (
                                 <button className="btn-xs reject" onClick={() => handleProductAction(p.id, 'reject')}>Reject</button>
                               )}
                               <button className="btn-xs delete-btn" onClick={() => handleProductAction(p.id, 'delete')}>
                                 <Trash2 size={12} style={{ display: 'inline', marginRight: '3px' }} />Del
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
          </>
        )}

        {/* ══════════════════════ ORDERS ══════════════════════ */}
        {activeTab === 'orders' && (
          <>
            <div className="admin-page-header">
              <div>
                <h1>All Orders</h1>
                <p className="page-subtitle">
                  {orders.length} orders · Total GMV: {fmtCurrency(orders.reduce((s, o) => s + Number(o.totalPrice || 0), 0))} · Commission: {fmtCurrency(commissionRevenue)}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={fetchOrders} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <RefreshCw size={14} /> Refresh
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
          </>
        )}

        {/* ══════════════════════ APPOINTMENTS ══════════════════════ */}
        {activeTab === 'appointments' && (
          <>
            <div className="admin-page-header">
              <div><h1>All Appointments</h1><p className="page-subtitle">{appointments.length} total appointments across the platform</p></div>
              <button className="btn btn-ghost btn-sm" onClick={fetchAppointments} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Mini stats */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
              {[
                { label: 'Pending',   val: appointments.filter(a => a.status === 'pending').length,   color: '#ffa726' },
                { label: 'Accepted',  val: appointments.filter(a => a.status === 'accepted').length,  color: '#4caf50' },
                { label: 'Completed', val: appointments.filter(a => a.status === 'completed').length, color: '#26c6da' },
                { label: 'Cancelled', val: appointments.filter(a => a.status === 'cancelled').length, color: '#ef5350' },
              ].map(({ label, val, color }) => (
                <div key={label} className="kpi-card" style={{ '--kpi-accent': color, padding: '1rem 1.25rem' }}>
                  <div className="kpi-value" style={{ fontSize: '1.6rem', color }}>{val}</div>
                  <div className="kpi-label">{label}</div>
                </div>
              ))}
            </div>

            <div className="table-container">
              <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <span className="table-title" style={{ minWidth: '150px' }}><Calendar size={16} /> {filteredAppts.length} appointments</span>
                <div className="table-controls" style={{ gap: '0.8rem', flexWrap: 'wrap', width: 'auto', flex: 1, justifyContent: 'flex-end' }}>
                  
                  {/* Doctor Filter */}
                  <select
                    className="status-select"
                    value={apptDoctorFilter}
                    onChange={e => setApptDoctorFilter(e.target.value)}
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', minWidth: '160px', color: 'var(--text-primary)' }}
                  >
                    <option value="all">All Doctors</option>
                    {Array.from(new Set(appointments.map(a => JSON.stringify({ id: a.providerId, name: a.providerName }))))
                      .map(str => JSON.parse(str))
                      .filter(p => p.id && p.name)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    }
                  </select>

                  {/* Date Filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="date"
                      className="status-select"
                      value={apptDateFilter}
                      onChange={e => setApptDateFilter(e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                    />
                    {apptDateFilter ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setApptDateFilter('')}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        All Dates
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setApptDateFilter(getTodayDateString())}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Today
                      </button>
                    )}
                  </div>

                  {/* Search Box */}
                  <div className="search-box">
                    <Search size={14} />
                    <input placeholder="Search patient name…" value={apptSearch} onChange={e => setApptSearch(e.target.value)} />
                  </div>
                </div>
              </div>

              {loadingAppointments ? (
                <div className="loading-state"><div className="spinner spinner-sm" /> Loading appointments…</div>
              ) : filteredAppts.length === 0 ? (
                <div className="empty-state"><div className="icon">📅</div><h4>No appointments found</h4></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead><tr>
                      <th>Patient</th><th>Contact</th><th>Doctor / Provider</th><th>Date/Time</th><th>Notes</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredAppts.map(a => (
                        <tr key={a.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.72rem' }}>
                                {(a.customerName || 'P').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="name">{a.customerName || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {a.customerPhone && (
                              <div style={{ marginBottom: '0.2rem' }}>
                                <a href={`tel:${a.customerPhone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.8rem' }}>📞 {a.customerPhone}</a>
                              </div>
                            )}
                            {a.customerEmail ? (
                              <div style={{ marginBottom: '0.2rem' }}>
                                <a href={`mailto:${a.customerEmail}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.8rem' }}>✉️ {a.customerEmail}</a>
                              </div>
                            ) : <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No Email</span>}
                          </td>
                          <td style={{ fontWeight: 600 }}>{a.providerName || '—'}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.date || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🕒 {a.time || '—'}</div>
                          </td>
                          <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                            {a.notes || '—'}
                          </td>
                          <td><StatusPill status={a.status} /></td>
                          <td>
                            <div className="action-btns" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <select
                                className="status-select"
                                value={a.status || 'pending'}
                                onChange={e => handleUpdateAppointmentStatus(a.id, e.target.value)}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                              >
                                {['pending','accepted','rejected','confirmed','completed','cancelled'].map(s => (
                                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                              </select>
                              <button
                                className="btn-xs delete-btn"
                                onClick={() => handleDeleteAppointment(a.id)}
                                style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Trash2 size={13} />
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
          </>
        )}

        {/* ══════════════════════ SETTINGS ══════════════════════ */}
        {activeTab === 'settings' && (
          <>
            <div className="admin-page-header">
              <div><h1>Platform Settings</h1><p className="page-subtitle">Configure global platform behavior</p></div>
            </div>

            <div className="dash-section">
              <div className="dash-section-header">
                <h3><DollarSign size={15} /> Revenue & Commission</h3>
              </div>
              <div className="settings-grid">
                <div className="settings-card">
                  <h4>Platform Commission Rate</h4>
                  <p>Percentage taken from each vendor sale</p>
                  <div className="form-group">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.commissionPercent}
                      onChange={e => setSettings({ ...settings, commissionPercent: Number(e.target.value) })}
                      className="form-control"
                      style={{ maxWidth: '120px' }}
                    />
                  </div>
                  <div className="commission-preview">
                    <span>On a Rs. 1,000 sale:</span>
                    <span className="highlight">Rs. {Math.round(1000 * settings.commissionPercent / 100)} commission</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="dash-section">
              <div className="dash-section-header">
                <h3><Activity size={15} /> Auto-Approval Rules</h3>
              </div>
              <div className="settings-grid">
                <div className="settings-card">
                  <h4>Auto-Approve Verified Clinics</h4>
                  <p>Instantly approve new clinic/doctor registrations without manual review</p>
                  <div className="toggle-group">
                    <div
                      className={`toggle-option ${settings.autoApproveExperts ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, autoApproveExperts: true })}
                    >
                      ✓ Yes, Auto-Approve
                    </div>
                    <div
                      className={`toggle-option ${!settings.autoApproveExperts ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, autoApproveExperts: false })}
                    >
                      ✗ Manual Review
                    </div>
                  </div>
                </div>
                <div className="settings-card">
                  <h4>Auto-Approve Products</h4>
                  <p>Instantly approve new vendor products without manual review</p>
                  <div className="toggle-group">
                    <div
                      className={`toggle-option ${settings.autoApproveProducts ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, autoApproveProducts: true })}
                    >
                      ✓ Yes, Auto-Approve
                    </div>
                    <div
                      className={`toggle-option ${!settings.autoApproveProducts ? 'active' : ''}`}
                      onClick={() => setSettings({ ...settings, autoApproveProducts: false })}
                    >
                      ✗ Manual Review
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {savingSettings ? <><div className="spinner spinner-sm" /> Saving…</> : '💾 Save Settings'}
                </button>
              </div>
            </div>
          </>
        )}

        
        {/* ── VIDEOS TAB ── */}
        {activeTab === 'videos' && (
          <>
            <div className="admin-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>Videos Management</h2>
                <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Add, edit, or remove videos displayed on the public library.</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setEditingVideo(null); setVideoForm({ title: '', description: '', youtubeId: '', category: 'Yoga & Meditation', duration: '' }); setShowVideoModal(true); }}>
                + Add Video
              </button>
            </div>

            {loadingVideos ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>Loading videos...</div>
            ) : videos.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                <Video size={48} style={{ color: '#555', margin: '0 auto 1rem' }} />
                <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No videos found</h3>
                <p style={{ color: '#aaa' }}>Click the Add Video button to create your first entry.</p>
              </div>
            ) : (
              <div className="admin-table-container glass-panel">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>YouTube ID</th>
                      <th>Duration</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(v => (
                      <tr key={v.id}>
                        <td>
                          <div style={{ fontWeight: '500', color: '#fff' }}>{v.title}</div>
                          {v.description && <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>{v.description.slice(0, 50)}...</div>}
                        </td>
                        <td><span className="status-pill" style={{ background: 'rgba(255,255,255,0.1)' }}>{v.category}</span></td>
                        <td><code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{v.youtubeId}</code></td>
                        <td>{v.duration || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-icon btn-sm" onClick={() => { setEditingVideo(v); setVideoForm({ title: v.title, description: v.description || '', youtubeId: v.youtubeId, category: v.category || 'Yoga & Meditation', duration: v.duration || '' }); setShowVideoModal(true); }} style={{ marginRight: '0.5rem' }}>✎</button>
                          <button className="btn btn-icon btn-sm" onClick={() => handleDeleteVideo(v.id)} style={{ color: '#ef5350' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {showVideoModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.25rem' }}>{editingVideo ? 'Edit Video' : 'Add New Video'}</h3>
              <form onSubmit={handleSaveVideo}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Video Title *</label>
                  <input required type="text" className="form-control" value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})} placeholder="e.g. Benefits of Ayurveda" />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>YouTube ID *</label>
                  <input required type="text" className="form-control" value={videoForm.youtubeId} onChange={e => setVideoForm({...videoForm, youtubeId: e.target.value})} placeholder="e.g. dQw4w9WgXcQ" />
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>The 11-character code in the YouTube URL (v=ID)</div>
                </div>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Category</label>
                    <input list="video-categories" className="form-control" value={videoForm.category} onChange={e => setVideoForm({...videoForm, category: e.target.value})} placeholder="Select or type category" />
                    <datalist id="video-categories">
                      <option value="Yoga & Meditation" />
                      <option value="Herbal Remedies" />
                      <option value="Healthy Diet" />
                      <option value="Daily Routine" />
                    </datalist>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Duration (Optional)</label>
                    <input type="text" className="form-control" value={videoForm.duration} onChange={e => setVideoForm({...videoForm, duration: e.target.value})} placeholder="e.g. 10 mins" />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Description</label>
                  <textarea className="form-control" value={videoForm.description} onChange={e => setVideoForm({...videoForm, description: e.target.value})} rows="3" placeholder="Brief description..."></textarea>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowVideoModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingVideo ? 'Update Video' : 'Add Video'}</button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Selected Doctor / Expert Details Modal */}
        {selectedDoctor && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', overflow: 'hidden', borderRadius: '50%' }}>
                    {selectedDoctor.profileDetails?.profileImageUrl ? (
                      <img src={selectedDoctor.profileDetails.profileImageUrl} alt={selectedDoctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      userInitials(selectedDoctor)
                    )}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedDoctor.name}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      💼 {selectedDoctor.role} · {selectedDoctor.profileDetails?.specialty || selectedDoctor.profileDetails?.category || 'General Ayurveda'}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDoctor(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
              </div>

              {/* Modal Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
                <button
                  className={`dashboard-tab ${modalTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setModalTab('profile')}
                  style={{ background: 'none', border: 'none', color: modalTab === 'profile' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: modalTab === 'profile' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Profile & Schedule
                </button>
                <button
                  className={`dashboard-tab ${modalTab === 'appointments' ? 'active' : ''}`}
                  onClick={() => setModalTab('appointments')}
                  style={{ background: 'none', border: 'none', color: modalTab === 'appointments' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: modalTab === 'appointments' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Appointments History ({doctorAppts.length})
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
                {modalTab === 'profile' && (
                  <div>
                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>
                        <div style={{ marginTop: '0.2rem' }}>
                          <a href={`mailto:${selectedDoctor.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{selectedDoctor.email}</a>
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong>
                        <div style={{ marginTop: '0.2rem' }}>
                          <a href={`tel:${selectedDoctor.profileDetails?.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{selectedDoctor.profileDetails?.phone || '—'}</a>
                        </div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <strong style={{ color: 'var(--text-secondary)' }}>Location/Address:</strong>
                        <div style={{ marginTop: '0.2rem' }}>📍 {selectedDoctor.profileDetails?.address || '—'}</div>
                      </div>
                    </div>

                    {/* Weekly Schedule */}
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '1rem 0 0.5rem' }}>
                      🗓️ Weekly Time Slots & Schedule
                    </h3>
                    {selectedDoctor.profileDetails?.schedule ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                          ⏱️ Appointment Slot Duration: <strong>{selectedDoctor.profileDetails.schedule.slotDuration || 30} minutes</strong>
                        </p>
                        {selectedDoctor.profileDetails.schedule.workingDays && Object.keys(selectedDoctor.profileDetails.schedule.workingDays).map(day => {
                          const info = selectedDoctor.profileDetails.schedule.workingDays[day];
                          return (
                            <div key={day} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.82rem' }}>
                              <span style={{ fontWeight: 600 }}>{day}</span>
                              <span style={{ color: info.active ? '#4caf50' : 'var(--text-muted)' }}>
                                {info.active ? `${info.start || '09:00'} - ${info.end || '17:00'}` : 'Closed'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No working schedule set by provider.</p>
                    )}
                  </div>
                )}

                {modalTab === 'appointments' && (
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '0 0 0.75rem' }}>
                      Appointments History (Last 50 bookings)
                    </h3>
                    {loadingDoctorAppts ? (
                      <div className="loading-state"><div className="spinner spinner-sm" /> Loading appointments…</div>
                    ) : doctorAppts.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem', padding: '1rem 0' }}>No appointments booked with this doctor yet.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ fontSize: '0.78rem' }}>
                          <thead><tr>
                            <th>Patient</th><th>Contact</th><th>Date/Time</th><th>Status</th>
                          </tr></thead>
                          <tbody>
                            {doctorAppts.map(a => (
                              <tr key={a.id}>
                                <td><strong>{a.customerName || 'Patient'}</strong></td>
                                <td>
                                  <div>{a.customerPhone || '—'}</div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{a.customerEmail || ''}</div>
                                </td>
                                <td>{a.date} at {a.time}</td>
                                <td><StatusPill status={a.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button className="btn btn-outline" onClick={() => setSelectedDoctor(null)}>Close</button>
              </div>

            </div>
          </div>
        )}

        {/* Selected User / Patient Details Modal */}
        {selectedUser && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', overflow: 'hidden', borderRadius: '50%' }}>
                    {userInitials(selectedUser)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedUser.name || 'User'}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      👤 Role: {selectedUser.role} · Member since: {fmtDate(selectedUser.createdAt)}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
              </div>

              {/* Modal Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
                <button
                  className={`dashboard-tab ${userModalTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setUserModalTab('profile')}
                  style={{ background: 'none', border: 'none', color: userModalTab === 'profile' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: userModalTab === 'profile' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Overview & Info
                </button>
                <button
                  className={`dashboard-tab ${userModalTab === 'appointments' ? 'active' : ''}`}
                  onClick={() => setUserModalTab('appointments')}
                  style={{ background: 'none', border: 'none', color: userModalTab === 'appointments' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: userModalTab === 'appointments' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Booked Appointments ({userAppts.length})
                </button>
                <button
                  className={`dashboard-tab ${userModalTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setUserModalTab('orders')}
                  style={{ background: 'none', border: 'none', color: userModalTab === 'orders' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: userModalTab === 'orders' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Order History ({userOrders.length})
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
                {userModalTab === 'profile' && (
                  <div>
                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>
                        <div style={{ marginTop: '0.2rem' }}>
                          <a href={`mailto:${selectedUser.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{selectedUser.email}</a>
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Account Status:</strong>
                        <div style={{ marginTop: '0.2rem' }}>
                          <StatusPill status={selectedUser.status === 'pending' ? 'pending' : 'active'} />
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>User ID:</strong>
                        <div style={{ marginTop: '0.2rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{selectedUser.id}</div>
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Joined Date:</strong>
                        <div style={{ marginTop: '0.2rem' }}>{fmtDate(selectedUser.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {userModalTab === 'appointments' && (
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '0 0 0.75rem' }}>
                      Appointments booked by this user
                    </h3>
                    {loadingUserAppts ? (
                      <div className="loading-state"><div className="spinner spinner-sm" /> Loading appointments…</div>
                    ) : userAppts.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem', padding: '1rem 0' }}>No appointments booked by this user yet.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ fontSize: '0.78rem' }}>
                          <thead><tr>
                            <th>Doctor</th><th>Date/Time</th><th>Notes</th><th>Status</th>
                          </tr></thead>
                          <tbody>
                            {userAppts.map(a => (
                              <tr key={a.id}>
                                <td><strong>{a.providerName || 'Doctor'}</strong></td>
                                <td>{a.date} at {a.time}</td>
                                <td>{a.notes || '—'}</td>
                                <td><StatusPill status={a.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {userModalTab === 'orders' && (
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '0 0 0.75rem' }}>
                      Product orders placed by this user
                    </h3>
                    {loadingUserOrders ? (
                      <div className="loading-state"><div className="spinner spinner-sm" /> Loading orders…</div>
                    ) : userOrders.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem', padding: '1rem 0' }}>No orders placed by this user yet.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ fontSize: '0.78rem' }}>
                          <thead><tr>
                            <th>Order ID</th><th>Date</th><th>Total</th><th>Status</th>
                          </tr></thead>
                          <tbody>
                            {userOrders.map(o => (
                              <tr key={o.id}>
                                <td style={{ fontFamily: 'monospace' }}>{o.id?.slice(0, 8)}...</td>
                                <td>{fmtDate(o.createdAt)}</td>
                                <td style={{ fontWeight: 600 }}>{fmtCurrency(o.totalPrice)}</td>
                                <td><StatusPill status={o.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button className="btn btn-outline" onClick={() => setSelectedUser(null)}>Close</button>
              </div>

            </div>
          </div>
        )}

        {/* Selected Product Details Modal */}
        {selectedProduct && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedProduct.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Category: {selectedProduct.category || 'Ayurveda Item'}
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
              </div>

              {/* Modal Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Product Image */}
                <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {(selectedProduct.imageUrl || (selectedProduct.images && selectedProduct.images[0])) ? (
                    <img
                      src={selectedProduct.imageUrl || selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📦</div>
                  )}
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Price:</strong>
                    <div style={{ marginTop: '0.2rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                      {fmtCurrency(selectedProduct.price || selectedProduct.basePrice)}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Stock Status:</strong>
                    <div style={{ marginTop: '0.2rem', fontSize: '1rem', fontWeight: 600 }}>
                      {selectedProduct.stock ?? 0} items available
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Vendor:</strong>
                    <div style={{ marginTop: '0.2rem' }}>{selectedProduct.vendorName || selectedProduct.vendorId || '—'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Status:</strong>
                    <div style={{ marginTop: '0.2rem' }}><StatusPill status={selectedProduct.status} /></div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Description:</strong>
                    <p style={{ marginTop: '0.4rem', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {selectedProduct.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

              </div>
              
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedProduct.status === 'pending' && (
                    <button className="btn btn-primary btn-sm" onClick={() => { handleProductAction(selectedProduct.id, 'approve'); setSelectedProduct(null); }}>Approve</button>
                  )}
                  {selectedProduct.status === 'pending' && (
                    <button className="btn btn-outline btn-sm" onClick={() => { handleProductAction(selectedProduct.id, 'reject'); setSelectedProduct(null); }} style={{ color: 'red', borderColor: 'rgba(255,0,0,0.3)' }}>Reject</button>
                  )}
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedProduct(null)}>Close</button>
              </div>

            </div>
          </div>
        )}

        {/* Selected Order Details Modal */}
        {selectedOrder && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Order Details</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Order ID: <span style={{ fontFamily: 'monospace' }}>#{selectedOrder.id}</span>
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
              </div>

              {/* Modal Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Status & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Status:</span>
                    <StatusPill status={selectedOrder.status} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Placed on: {fmtDate(selectedOrder.createdAt)}
                  </div>
                </div>

                {/* Customer Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Customer Name:</strong>
                    <div style={{ marginTop: '0.2rem' }}>{selectedOrder.customerName || '—'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Contact Info:</strong>
                    <div style={{ marginTop: '0.2rem' }}>
                      <div>✉️ {selectedOrder.customerEmail || '—'}</div>
                      <div>📞 {selectedOrder.customerPhone || '—'}</div>
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Shipping Address:</strong>
                    <div style={{ marginTop: '0.2rem', lineHeight: 1.4 }}>
                      📍 {selectedOrder.shippingAddress || selectedOrder.address || '—'}
                    </div>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '0.5rem 0 0.75rem' }}>
                    Ordered Items
                  </h3>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '1rem', overflow: 'hidden' }}>
                              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Qty: {item.quantity} · Price: {fmtCurrency(item.price)}</div>
                            </div>
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                            {fmtCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.82rem' }}>No items list found inside the order.</p>
                  )}
                </div>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>Total Order Value:</span>
                  <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#4caf50' }}>{fmtCurrency(selectedOrder.totalPrice)}</span>
                </div>

              </div>
              
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
                  <select
                    className="status-select"
                    value={selectedOrder.status || 'pending'}
                    onChange={e => { handleOrderStatus(selectedOrder.id, e.target.value); setSelectedOrder({ ...selectedOrder, status: e.target.value }); }}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                  >
                    {['pending','confirmed','processing','shipped','delivered','cancelled'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-outline" onClick={() => setSelectedOrder(null)}>Close</button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
