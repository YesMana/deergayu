import React, { useState } from 'react';
import { Package, ShoppingBag, Settings, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const initialOrders = [
  { id: '#ORD-1002', customer: 'Saman Kumara', product: 'Ashwagandha Extract', qty: 1, total: 2500, status: 'Processing' },
  { id: '#ORD-1005', customer: 'Nimali Perera', product: 'Herbal Hair Oil', qty: 2, total: 3000, status: 'Shipped' },
];

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState(initialOrders);
  const { user } = useAuth();

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
  };

  return (
    <div className="admin-container animate-fade-in">
      <aside className="admin-sidebar glass-panel">
        <div className="admin-brand">
          <h2>Vendor Panel</h2>
          <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{user?.name}</p>
        </div>
        <ul className="admin-nav">
          <li className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
            <Package size={20} /> My Products
          </li>
          <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
            <ShoppingBag size={20} /> Customer Orders
          </li>
          <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            <Settings size={20} /> Settings
          </li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{activeTab === 'products' ? 'Manage My Products' : activeTab === 'orders' ? 'Customer Orders' : 'Vendor Panel'}</h1>
          {activeTab === 'products' && <button className="btn btn-primary">+ Add New Product</button>}
        </header>

        <div className="admin-content">
          {activeTab === 'products' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Add products to your shop. Once approved by the main Admin, they will appear on the public shop.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fw-bold">Herbal Hair Oil</td>
                    <td>Hair Care</td>
                    <td>Rs. 1500</td>
                    <td><span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Pending Approval</span></td>
                    <td><button className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Edit</button></td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Kasaya Pack</td>
                    <td>Immunity</td>
                    <td>Rs. 850</td>
                    <td><span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Live</span></td>
                    <td><button className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Edit</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">View and process orders placed by customers for your products.</p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="fw-bold">{order.id}</td>
                      <td>{order.product} <br/><small style={{color: 'var(--text-secondary)'}}>({order.customer})</small></td>
                      <td>{order.qty}</td>
                      <td>Rs. {order.total}</td>
                      <td>
                        {order.status === 'Processing' && <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Processing</span>}
                        {order.status === 'Shipped' && <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Shipped</span>}
                        {order.status === 'Delivered' && <span className="type-badge" style={{background: '#cce5ff', color: '#004085'}}>Delivered</span>}
                      </td>
                      <td>
                        {order.status === 'Processing' && (
                          <button onClick={() => handleUpdateOrderStatus(order.id, 'Shipped')} className="btn btn-primary" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Mark Shipped</button>
                        )}
                        {order.status === 'Shipped' && (
                          <button onClick={() => handleUpdateOrderStatus(order.id, 'Delivered')} className="btn btn-primary" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--success-color)'}}>Mark Delivered</button>
                        )}
                        {order.status === 'Delivered' && (
                          <span style={{color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem'}}><CheckCircle size={16} /> Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel table-container" style={{maxWidth: '600px'}}>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '1rem'}}>Shop Settings</h2>
              <div className="form-group" style={{marginBottom: '1rem'}}>
                <label style={{color: 'var(--text-secondary)'}}>Shop Name</label>
                <input type="text" defaultValue={user?.name || "Vendor Name"} className="form-control" style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)'}} />
              </div>
              <div className="form-group" style={{marginBottom: '1rem'}}>
                <label style={{color: 'var(--text-secondary)'}}>Email Address</label>
                <input type="email" defaultValue={user?.email || "vendor@deergayu.lk"} disabled className="form-control" style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', opacity: 0.7}} />
              </div>
              
              <hr style={{border: 'none', borderTop: '1px solid rgba(212, 175, 55, 0.2)', margin: '2rem 0'}} />
              
              <h3 style={{color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.2rem'}}>Change Password</h3>
              <div className="form-group" style={{marginBottom: '1rem'}}>
                <label style={{color: 'var(--text-secondary)'}}>New Password</label>
                <input type="password" placeholder="Enter new password" className="form-control" style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)'}} />
              </div>
              <div className="form-group" style={{marginBottom: '1rem'}}>
                <label style={{color: 'var(--text-secondary)'}}>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" className="form-control" style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)'}} />
              </div>

              <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
                <button className="btn btn-primary">Save Changes</button>
                <button className="btn btn-outline" style={{borderColor: 'var(--error-color)', color: 'var(--error-color)'}} onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VendorDashboard;
