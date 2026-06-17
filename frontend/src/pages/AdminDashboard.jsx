import React, { useState } from 'react';
import { Users, LayoutDashboard, Settings, ArrowUp, ArrowDown, Bell, Search, Filter } from 'lucide-react';
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

const AdminDashboard = () => {
  const [providers, setProviders] = useState(initialProviders);
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialAdminOrders);
  const [filterVendor, setFilterVendor] = useState('All');
  const [activeTab, setActiveTab] = useState('providers');

  const pendingCount = products.filter(p => p.status === 'pending').length;

  const handleProductAction = (id, action) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        if (action === 'approve') return { ...p, status: 'approved' };
        if (action === 'hide') return { ...p, status: 'hidden' };
        if (action === 'delete') return null; // We'll filter nulls out below
      }
      return p;
    }).filter(Boolean));
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
          <h1>{activeTab === 'providers' ? 'Manage Experts (Ranking)' : activeTab === 'products' ? 'Product Approvals' : activeTab === 'orders' ? 'All Platform Orders' : 'Admin Panel'}</h1>
          {activeTab === 'providers' && <button className="btn btn-primary">+ Add New Expert</button>}
        </header>

        <div className="admin-content">
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
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
