import React from 'react';
import { 
  LayoutDashboard, Users, ShieldAlert, Package, ShoppingBag, 
  Calendar, Video, Settings 
} from 'lucide-react';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'providers', icon: ShieldAlert, label: 'Manage Experts' },
    { id: 'users', icon: Users, label: 'Manage Users' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders' },
    { id: 'appointments', icon: Calendar, label: 'Appointments' },
    { id: 'videos', icon: Video, label: 'Videos' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="nav-btn logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
