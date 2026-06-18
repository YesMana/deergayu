import React, { useState, useEffect } from 'react';
import { Users, LayoutDashboard, Settings, ArrowUp, ArrowDown, Bell, Search, Filter, ShieldAlert } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './AdminDashboard.css';

const initialProviders = [
  { id: 1, name: "Dr. Anura Dissanayake", role: "Ayurvedic Physician", rank: 1, type: "doctor" },
  { id: 2, name: "Vedamahaththaya Somarathna", role: "Traditional Healer", rank: 2, type: "doctor" },
  { id: 3, name: "Astrologer Wickramasinghe", role: "Vedic Astrologer", rank: 3, type: "astrologer" },
  { id: 4, name: "Dr. Samanthi Perera", role: "Ayurvedic Physician", rank: 4, type: "doctor" },
];

const initialProducts = [
  { id: 101, name: "Herbal Hair Oil", vendor: "Sanjeewani Weda Madura", category: "Hair Care", price: 1500, status: "pending" },
  { id: 102, name: "Kasaya Pack", vendor: "Arogya Pharmacy", category: "Immunity", price: 850, status: "approved" },
  { id: 103, name: "Neem Face Wash", vendor: "Arogya Pharmacy", category: "Skin Care", price: 1200, status: "pending" },
  { id: 104, name: "Joint Pain Relief Oil", vendor: "Hela Wedakama", category: "Pain Relief", price: 2100, status: "approved" },
];

const initialAdminOrders = [
  { id: '#ORD-1001', customer: 'Amala Silva', product: 'Herbal Cough Syrup', vendor: 'Arogya Pharmacy', total: 1200, status: 'Delivered' },
  { id: '#ORD-1002', customer: 'Saman Kumara', product: 'Ashwagandha Extract', vendor: 'Sanjeewani Weda Madura', total: 2500, status: 'Processing' },
  { id: '#ORD-1005', customer: 'Nimali Perera', product: 'Herbal Hair Oil', vendor: 'Sanjeewani Weda Madura', total: 3000, status: 'Shipped' },
];

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
  const [providers, setProviders] = useState(initialProviders);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState(initialAdminOrders);
  const [filterVendor, setFilterVendor] = useState('All');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [platformUsers, setPlatformUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab]);

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

  const handleUpdateRole = async (uid, newRole) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        alert("Role updated successfully!");
        fetchUsers();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(`Failed: ${data.error}`);
        } catch (e) {
          alert(`Server Error: ${res.status} - ${text.substring(0, 50)}`);
        }
      }
    } catch (err) {
      alert(`Network Error: ${err.message}`);
    }
  };

  const handleApproveUser = async (uid) => {
    if (!window.confirm("Approve this expert?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/users/${uid}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        alert("Expert approved successfully!");
        fetchUsers();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(`Failed: ${data.error}`);
        } catch (e) {
          alert(`Server Error: ${res.status} - ${text.substring(0, 50)}`);
        }
      }
    } catch (err) {
      alert(`Network Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!window.confirm("Are you sure you want to completely delete this user? This cannot be undone.")) return;
    
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/users/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert("User deleted successfully!");
        fetchUsers();
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          alert(`Failed: ${data.error}`);
        } catch (e) {
          alert(`Server Error: ${res.status} - ${text.substring(0, 50)}`);
        }
      }
    } catch (err) {
      alert(`Network Error: ${err.message}`);
    }
  };
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpert, setNewExpert] = useState({
    name: '', role: 'Ayurvedic Physician', type: 'doctor', specialty: specialtiesList[0], province: 'Western', districts: [], experience: '', image: ''
  });

  const pendingCount = products.filter(p => p.status === 'pending').length;

  const handleProductAction = async (id, action) => {
    try {
      const newStatus = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'rejected';
      
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/products/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        alert(`Product ${action}d successfully!`);
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
      alert(`Error updating product status`);
    }
  };

  const handleDistrictToggle = (district) => {
    setNewExpert(prev => {
      const isSelected = prev.districts.includes(district);
      if (isSelected) {
        return { ...prev, districts: prev.districts.filter(d => d !== district) };
      } else {
        return { ...prev, districts: [...prev.districts, district] };
      }
    });
  };

  const handleAddExpert = (e) => {
    e.preventDefault();
    const nextId = Math.max(...providers.map(p => p.id)) + 1;
    const nextRank = Math.max(...providers.map(p => p.rank)) + 1;
    
    setProviders([...providers, { ...newExpert, id: nextId, rank: nextRank }]);
    setShowAddModal(false);
    setNewExpert({ name: '', role: 'Ayurvedic Physician', type: 'doctor', specialty: specialtiesList[0], province: 'Western', districts: [], experience: '', image: '' });
  };


  const moveRank = (id, direction) => {
    const currentIndex = providers.findIndex(p => p.id === id);
    if (direction === 'up' && currentIndex > 0) {
      const newProviders = [...providers];
      // Swap ranks
      const tempRank = newProviders[currentIndex].rank;
      newProviders[currentIndex].rank = newProviders[currentIndex - 1].rank;
      newProviders[currentIndex - 1].rank = tempRank;
      
      // Swap elements
      const temp = newProviders[currentIndex];
      newProviders[currentIndex] = newProviders[currentIndex - 1];
      newProviders[currentIndex - 1] = temp;
      
      setProviders(newProviders);
    } else if (direction === 'down' && currentIndex < providers.length - 1) {
      const newProviders = [...providers];
      // Swap ranks
      const tempRank = newProviders[currentIndex].rank;
      newProviders[currentIndex].rank = newProviders[currentIndex + 1].rank;
      newProviders[currentIndex + 1].rank = tempRank;
      
      // Swap elements
      const temp = newProviders[currentIndex];
      newProviders[currentIndex] = newProviders[currentIndex + 1];
      newProviders[currentIndex + 1] = temp;
      
      setProviders(newProviders);
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
          <li className={activeTab === 'providers' ? 'active' : ''} onClick={() => setActiveTab('providers')}>
            <Users size={20} /> Manage Experts
            {activeTab === 'providers' && (
              <span className="badge" style={{background: 'var(--primary-color)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', marginLeft: 'auto'}}>
                2
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
          <h1>{activeTab === 'providers' ? 'Manage Experts (Ranking)' : activeTab === 'users' ? 'User Management' : activeTab === 'products' ? 'Product Approvals' : activeTab === 'orders' ? 'All Platform Orders' : 'Admin Panel'}</h1>
          {activeTab === 'providers' && <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add New Expert</button>}
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
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#856404', margin: '0.5rem 0' }}>{products.filter(p => p.status === 'pending').length}</p>
              </div>
              <div className="glass-panel stat-card" onClick={() => setActiveTab('orders')} style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <h3 style={{ color: 'var(--text-secondary)' }}>Total Orders</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0.5rem 0' }}>{orders.length}</p>
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Use the arrows to rank experts. Top ranked experts appear first on the Channeling page.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Type</th>
                    <th>Reorder</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider, index) => (
                    <tr key={provider.id}>
                      <td><span className="rank-badge">{provider.rank}</span></td>
                      <td className="fw-bold">{provider.name}</td>
                      <td>{provider.role}</td>
                      <td><span className={`type-badge ${provider.type}`}>{provider.type}</span></td>
                      <td>
                        <div className="rank-controls">
                          <button 
                            className="icon-btn-small" 
                            onClick={() => moveRank(provider.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button 
                            className="icon-btn-small" 
                            onClick={() => moveRank(provider.id, 'down')}
                            disabled={index === providers.length - 1}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    {[...new Set(products.map(p => p.vendor))].map(vendor => (
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
                    .filter(p => filterVendor === 'All' || p.vendor === filterVendor)
                    .map(product => (
                    <tr key={product.id}>
                      <td className="fw-bold">{product.name}</td>
                      <td>{product.vendor}</td>
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
                  {products.filter(p => filterVendor === 'All' || p.vendor === filterVendor).length === 0 && (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">View all orders placed across the platform. You can monitor the status here.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Vendor</th>
                    <th>Total Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="fw-bold">{order.id}</td>
                      <td>{order.customer}</td>
                      <td>{order.product}</td>
                      <td>{order.vendor}</td>
                      <td>Rs. {order.total}</td>
                      <td>
                        {order.status === 'Processing' && <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Processing</span>}
                        {order.status === 'Shipped' && <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Shipped</span>}
                        {order.status === 'Delivered' && <span className="type-badge" style={{background: '#cce5ff', color: '#004085'}}>Delivered</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2>Admin Settings</h2>
              <p className="admin-hint">Configure platform settings here.</p>
              
              <div className="form-group" style={{ maxWidth: '400px', marginTop: '2rem' }}>
                <label>Platform Commission (%)</label>
                <input type="number" defaultValue={10} className="form-control" />
              </div>
              
              <div className="form-group" style={{ maxWidth: '400px', marginTop: '1rem' }}>
                <label>Auto-approve Verified Clinics</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label><input type="radio" name="auto_approve" defaultChecked /> Yes</label>
                  <label><input type="radio" name="auto_approve" /> No</label>
                </div>
              </div>

              <button className="btn btn-primary" style={{ marginTop: '2rem' }}>Save Settings</button>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Manage all registered users on the platform. You can update roles or completely delete accounts.</p>
              {loadingUsers ? <p>Loading users...</p> : (
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

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Add New Expert</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddExpert} className="admin-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={newExpert.name} onChange={e => setNewExpert({...newExpert, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={newExpert.role} onChange={e => setNewExpert({...newExpert, role: e.target.value})} placeholder="e.g. Ayurvedic Physician" required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={newExpert.type} onChange={e => setNewExpert({...newExpert, type: e.target.value})}>
                  <option value="doctor">Doctor</option>
                  <option value="astrologer">Astrologer</option>
                </select>
              </div>
              <div className="form-group">
                <label>Specialty</label>
                <select value={newExpert.specialty} onChange={e => setNewExpert({...newExpert, specialty: e.target.value})}>
                  {specialtiesList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Province</label>
                <select value={newExpert.province} onChange={e => setNewExpert({...newExpert, province: e.target.value, districts: []})}>
                  {Object.keys(sriLankaData).map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Treatment Districts (Select multiple)</label>
                <div className="district-checkboxes" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {sriLankaData[newExpert.province].map(dist => (
                    <label key={dist} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={newExpert.districts.includes(dist)}
                        onChange={() => handleDistrictToggle(dist)}
                      />
                      {dist}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Experience (Years)</label>
                <input type="text" value={newExpert.experience} onChange={e => setNewExpert({...newExpert, experience: e.target.value})} placeholder="e.g. 15 Years" required />
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input type="url" value={newExpert.image} onChange={e => setNewExpert({...newExpert, image: e.target.value})} placeholder="https://..." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Register Expert</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
