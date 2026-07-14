import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShieldAlert, Package, ShoppingBag, Calendar, Settings, Video, BookOpen, Star } from 'lucide-react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// Components
import OverviewDashboard from '../components/Admin/OverviewDashboard';
import ManageProviders from '../components/Admin/ManageProviders';
import ManageUsers from '../components/Admin/ManageUsers';
import ManageProducts from '../components/Admin/ManageProducts';
import ManageOrders from '../components/Admin/ManageOrders';
import ManageAppointments from '../components/Admin/ManageAppointments';
import ManageSettings from '../components/Admin/ManageSettings';
import ManageVideos from '../components/Admin/ManageVideos';
import ManageGuide from '../components/Admin/ManageGuide';
import ManageReviews from '../components/Admin/ManageReviews';
import ErrorBoundary from '../components/Common/ErrorBoundary';

import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Lightweight badge counts
  const [pendingExperts, setPendingExperts] = useState(0);
  const [pendingProducts, setPendingProducts] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        const usersQ = query(collection(db, 'users'), where('status', '==', 'pending'), where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor']));
        const usersSnap = await getCountFromServer(usersQ);
        setPendingExperts(usersSnap.data().count);

        const productsQ = query(collection(db, 'products'), where('status', '==', 'pending'));
        const productsSnap = await getCountFromServer(productsQ);
        setPendingProducts(productsSnap.data().count);

        const ordersQ = query(collection(db, 'orders'), where('status', '==', 'pending'));
        const ordersSnap = await getCountFromServer(ordersQ);
        setPendingOrders(ordersSnap.data().count);
      } catch (e) {
        console.error("Failed to fetch badge counts", e);
      }
    };
    
    fetchBadgeCounts();
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard',    label: 'Overview',         Icon: LayoutDashboard },
    { id: 'providers',    label: 'Manage Experts',   Icon: Users,           badge: pendingExperts },
    { id: 'users',        label: 'All Users',        Icon: ShieldAlert },
    { id: 'products',     label: 'Product Approvals', Icon: Package,         badge: pendingProducts },
    { id: 'orders',       label: 'All Orders',       Icon: ShoppingBag,     badge: pendingOrders },
    { id: 'appointments', label: 'Appointments',     Icon: Calendar },
    { id: 'reviews',      label: 'Reviews',          Icon: Star },
    { id: 'settings',     label: 'Settings',         Icon: Settings },
    { id: 'videos',       label: 'Videos',           Icon: Video },
    { id: 'guide',        label: 'Ayurvedic Guide',  Icon: BookOpen },
  ];

  return (
    <div className="admin-layout animate-fade-in">
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
          
          <li className="admin-nav-section-title">Users & Operations</li>
          {navItems.slice(1, 3).map(({ id, label, Icon, badge }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </li>
          ))}

          <li className="admin-nav-section-title">Commerce</li>
          {navItems.slice(3, 5).map(({ id, label, Icon, badge }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </li>
          ))}

          <li className="admin-nav-section-title">Services</li>
          {navItems.slice(5, 7).map(({ id, label, Icon, badge }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </li>
          ))}

          <li className="admin-nav-section-title">System</li>
          {navItems.slice(7).map(({ id, label, Icon, badge }) => (
            <li key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </li>
          ))}
        </ul>
      </aside>

      <main className="admin-main">
        {activeTab === 'dashboard'    && <OverviewDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'providers'    && <ManageProviders />}
        {activeTab === 'users'        && <ManageUsers />}
        {activeTab === 'products'     && <ManageProducts />}
        {activeTab === 'orders'       && <ManageOrders />}
        {activeTab === 'appointments' && <ManageAppointments />}
        {activeTab === 'reviews'      && <ManageReviews />}
        {activeTab === 'settings' && <ManageSettings />}
        {activeTab === 'videos' && <ManageVideos />}
        {activeTab === 'guide' && (
          <ErrorBoundary key="guide">
            <ManageGuide />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
