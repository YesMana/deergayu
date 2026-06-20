import React, { useState, useEffect } from 'react';
import { Users, LayoutDashboard, Settings, ArrowUp, ArrowDown, Bell, Search, Filter, ShieldAlert } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from '../context/ToastContext';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const sriLankaData = {
  "Western": ["Colombo", "Gampaha", "Kalutara"],
  "Central": ["Kandy", "Matale", "Nuwara Eliya"],
  "Southern": ["Galle", "Matara", "Hambantota"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "Eastern": ["Trincomalee", "Batticaloa", "Ampara"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "Uva": ["Badulla", "Monaragala"],
  "Sabaragamuwa": ["Ratnapura", "Kegalle"],
  "Online": ["Online"]
};

const specialtiesList = ["Sarwanga Roga (General)", "Kadum Bindum (Orthopedic)", "Sarpa Visha (Toxicology)", "Yantra & Mantra", "Vastu Shastra"];

const AdminDashboard = () => {
  const { success, error } = useToast();
  const [providers, setProviders] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({ commissionPercent: 10, autoApproveExperts: false, autoApproveProducts: false });
  const [filterVendor, setFilterVendor] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [platformUsers, setPlatformUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'providers') fetchProviders();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'dashboard') {
      fetchProviders();
      fetchProducts();
      fetchOrders();
    }
  }, [activeTab]);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const experts = userSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role !== 'user' && u.role !== 'admin');
      setProviders(experts);
    } catch (err) {
      console.error("Error fetching providers:", err);
    } finally {
      setLoadingProviders(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsCol = collection(db, 'products');
      const productSnapshot = await getDocs(productsCol);
      const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlatformUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        success("Settings saved successfully!");
      } else {
        error("Failed to save settings");
      }
    } catch (err) {
      error(`Network Error: ${err.message}`);
    }
  };

  const handleUpdateRole = async (uid, newRole) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        success("Role updated successfully!");
        fetchUsers();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          error(`Failed: ${data.error}`);
        } catch (e) {
          error(`Server Error: ${res.status} - ${text.substring(0, 50)}`);
        }
      }
    } catch (err) {
      error(`Network Error: ${err.message}`);
    }
  };

  const handleApproveUser = async (uid) => {
    if (!window.confirm("Approve this expert?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        success("Expert approved successfully!");
        fetchUsers();
        fetchProviders();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          error(`Failed: ${data.error}`);
        } catch (e) {
          error(`Server Error: ${res.status} - ${text.substring(0, 50)}`);
        }
      }
    } catch (err) {
      error(`Network Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!window.confirm("Are you sure you want to completely delete this user? This cannot be undone.")) return;
    
    try {
      // Direct Firestore Deletion (Frontend Bypass)
      await deleteDoc(doc(db, 'users', uid));
      setPlatformUsers(platformUsers.filter(u => u.id !== uid));
      success("User deleted successfully!");
      
      // Attempt backend deletion for Auth cleanup (silently fail if backend is down)
      try {
        const token = await auth.currentUser.getIdToken();
        await fetch(`${API_URL}/api/users/${uid}/delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.warn("Backend auth deletion failed, but Firestore doc removed.");
      }
    } catch (err) {
      error(`Error deleting user: ${err.message}`);
    }
  };
  
  const pendingCount = products.filter(p => p.status === 'pending').length;
  const pendingExpertCount = providers.filter(p => p.status === 'pending').length;

  const handleProductAction = async (id, action) => {
    try {
      const newStatus = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'rejected';
      
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/products/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        success(`Product ${action}d successfully!`);
        fetchProducts();
      } else {
        // Fallback to local state if API isn't ready
        setProducts(products.map(p => {
          if (p.id === id) {
            if (action === 'approve') return { ...p, status: 'approved' };
            if (action === 'hide') return { ...p, status: 'hidden' };
            if (action === 'delete') return null;
          }
          return p;
        }).filter(Boolean));
      }
    } catch (err) {
      error(`Error updating product status`);
    }
  };

  return (
    <div className="admin-layout animate-fade-in">
      <aside className="admin-sidebar glass-panel">
        <div className="admin-brand">
          <h2>Admin Panel</h2>
        </div>
        <ul className="admin-nav">
          <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </li>
          <li className={activeTab === 'providers' ? 'active' : ''} onClick={() => setActiveTab('providers')} style={{position: 'relative'}}>
            <Users size={20} /> Manage Experts
            {pendingExpertCount > 0 && (
              <span style={{
                position: 'absolute', right: '15px', top: '15px', background: 'var(--error-color)', color: 'white', 
                borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold'
              }}>
                {pendingExpertCount}
              </span>
            )}
          </li>
          <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            <ShieldAlert size={20} /> All Users
          </li>
          <li className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')} style={{position: 'relative'}}>
            <LayoutDashboard size={20} /> Product Approvals
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', right: '15px', top: '15px', background: 'var(--error-color)', color: 'white', 
                borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold'
              }}>
                {pendingCount}
              </span>
            )}
          </li>
          <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
            <LayoutDashboard size={20} /> All Orders
          </li>
          <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            <Settings size={20} /> Settings
          </li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{activeTab === 'providers' ? 'Manage Experts' : activeTab === 'users' ? 'User Management' : activeTab === 'products' ? 'Product Approvals' : activeTab === 'orders' ? 'All Platform Orders' : activeTab === 'settings' ? 'Settings' : 'Admin Panel'}</h1>
        </header>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel stat-card" onClick={() => setActiveTab('providers')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Total Experts</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', margin: '0.5rem 0' }}>{providers.length}</p>
              </div>
              <div className="glass-panel stat-card" onClick={() => setActiveTab('products')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Pending Products</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#856404', margin: '0.5rem 0' }}>{pendingCount}</p>
              </div>
              <div className="glass-panel stat-card" onClick={() => setActiveTab('orders')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Total Orders</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.5rem 0' }}>{orders.length}</p>
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Review and approve expert profiles on the platform.</p>
              {loadingProviders ? <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading experts...</p> : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Specialty/Type</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => (
                      <tr key={provider.id}>
                        <td className="fw-bold">{provider.name || 'N/A'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{provider.role}</td>
                        <td>{provider.profileDetails?.specialty || provider.profileDetails?.doctorType || 'N/A'}</td>
                        <td>{provider.profileDetails?.address || 'N/A'}</td>
                        <td>
                          {provider.status === 'pending' ? (
                            <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Pending</span>
                          ) : (
                            <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Approved</span>
                          )}
                        </td>
                        <td>
                          {provider.status === 'pending' && (
                            <button onClick={() => handleApproveUser(provider.id)} className="btn btn-primary" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--success-color)'}}>Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {providers.length === 0 && (
                      <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No experts found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="glass-panel table-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p className="admin-hint" style={{ margin: 0 }}>Review products added by Vendors before they go live.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={16} color="var(--text-secondary)" />
                  <select 
                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    value={filterVendor}
                    onChange={(e) => setFilterVendor(e.target.value)}
                  >
                    <option value="All">All Vendors</option>
                    {[...new Set(products.map(p => p.vendorName || p.vendorId))].map(vendor => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter(p => filterVendor === 'All' || p.vendorName === filterVendor || p.vendorId === filterVendor)
                    .map(product => (
                    <tr key={product.id}>
                      <td className="fw-bold">{product.name}</td>
                      <td>{product.vendorName || product.vendorId}</td>
                      <td>{product.category}</td>
                      <td>Rs. {product.price}</td>
                      <td>
                        {product.status === 'pending' && <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Pending</span>}
                        {product.status === 'approved' && <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Approved</span>}
                        {product.status === 'hidden' && <span className="type-badge" style={{background: '#e2e3e5', color: '#383d41'}}>Hidden</span>}
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          {product.status === 'pending' && (
                            <button onClick={() => handleProductAction(product.id, 'approve')} className="btn btn-primary" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--success-color)'}}>Approve</button>
                          )}
                          {product.status === 'approved' && (
                            <button onClick={() => handleProductAction(product.id, 'hide')} className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Hide</button>
                          )}
                          {product.status === 'hidden' && (
                            <button onClick={() => handleProductAction(product.id, 'approve')} className="btn btn-primary" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--success-color)'}}>Re-Approve</button>
                          )}
                          <button onClick={() => handleProductAction(product.id, 'delete')} className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: 'var(--error-color)', borderColor: 'var(--error-color)'}}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.filter(p => filterVendor === 'All' || p.vendorName === filterVendor || p.vendorId === filterVendor).length === 0 && (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">View all orders placed across the platform. You can monitor the status here.</p>
              {loadingOrders ? <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading orders...</p> : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Vendor</th>
                      <th>Total Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td className="fw-bold">{order.id}</td>
                        <td>{order.customerName}</td>
                        <td>{order.vendorName}</td>
                        <td>Rs. {order.totalPrice}</td>
                        <td>
                          {order.status === 'pending' && <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Pending</span>}
                          {order.status === 'confirmed' && <span className="type-badge doctor" style={{background: '#cce5ff', color: '#004085'}}>Confirmed</span>}
                          {order.status === 'processing' && <span className="type-badge astrologer" style={{background: '#e2d9f3', color: '#553c9a'}}>Processing</span>}
                          {order.status === 'shipped' && <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Shipped</span>}
                          {order.status === 'delivered' && <span className="type-badge" style={{background: '#cce5ff', color: '#004085'}}>Delivered</span>}
                          {order.status === 'cancelled' && <span className="type-badge" style={{background: '#f8d7da', color: '#721c24'}}>Cancelled</span>}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No orders found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2>Admin Settings</h2>
              <p className="admin-hint">Configure platform settings here.</p>
              
              <div className="form-group" style={{ maxWidth: '400px', marginTop: '2rem' }}>
                <label>Platform Commission (%)</label>
                <input 
                  type="number" 
                  value={settings.commissionPercent} 
                  onChange={e => setSettings({...settings, commissionPercent: Number(e.target.value)})}
                  className="form-control" 
                />
              </div>
              
              <div className="form-group" style={{ maxWidth: '400px', marginTop: '1rem' }}>
                <label>Auto-approve Verified Clinics</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label>
                    <input 
                      type="radio" 
                      name="auto_approve_experts" 
                      checked={settings.autoApproveExperts === true} 
                      onChange={() => setSettings({...settings, autoApproveExperts: true})}
                    /> Yes
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="auto_approve_experts" 
                      checked={settings.autoApproveExperts === false} 
                      onChange={() => setSettings({...settings, autoApproveExperts: false})}
                    /> No
                  </label>
                </div>
              </div>
              
              <div className="form-group" style={{ maxWidth: '400px', marginTop: '1rem' }}>
                <label>Auto-approve Products</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label>
                    <input 
                      type="radio" 
                      name="auto_approve_products" 
                      checked={settings.autoApproveProducts === true} 
                      onChange={() => setSettings({...settings, autoApproveProducts: true})}
                    /> Yes
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="auto_approve_products" 
                      checked={settings.autoApproveProducts === false} 
                      onChange={() => setSettings({...settings, autoApproveProducts: false})}
                    /> No
                  </label>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: '2rem' }}>Save Settings</button>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Manage all registered users on the platform. You can update roles or completely delete accounts.</p>
              {loadingUsers ? <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading users...</p> : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status & Details</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformUsers.map(u => (
                      <tr key={u.id}>
                        <td className="fw-bold">{u.name || 'N/A'}</td>
                        <td>{u.email}</td>
                        <td>
                          <select 
                            value={u.role || 'user'} 
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ccc', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                            disabled={u.email === 'yes.manujaya@gmail.com'}
                          >
                            <option value="user">User</option>
                            <option value="doctor">Doctor</option>
                            <option value="clinic">Clinic</option>
                            <option value="organization">Organization</option>
                            <option value="vendor">Vendor</option>
                            {u.email === 'yes.manujaya@gmail.com' && <option value="admin">Admin</option>}
                          </select>
                        </td>
                        <td>
                          {u.status === 'pending' ? (
                            <span style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>Pending</span>
                          ) : (
                            <span style={{ color: 'var(--success-color)' }}>Approved</span>
                          )}
                          {u.profileDetails && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {u.profileDetails.phone} <br/> {u.profileDetails.address}
                            </div>
                          )}
                        </td>
                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {u.status === 'pending' && (
                              <button onClick={() => handleApproveUser(u.id)} className="btn btn-primary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}>Approve</button>
                            )}
                            <button 
                              className="btn btn-outline" 
                              style={{color: 'white', background: 'var(--error-color)', borderColor: 'var(--error-color)', padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}
                              onClick={() => handleDeleteUser(u.id)}
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
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
