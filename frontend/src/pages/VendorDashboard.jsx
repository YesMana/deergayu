import React, { useState } from 'react';
import { Package, ShoppingBag, Settings, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import './AdminDashboard.css';

const initialOrders = [
  { id: '#ORD-1002', customer: 'Saman Kumara', product: 'Ashwagandha Extract', qty: 1, total: 2500, status: 'Processing' },
  { id: '#ORD-1005', customer: 'Nimali Perera', product: 'Herbal Hair Oil', qty: 2, total: 3000, status: 'Shipped' },
];

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState(initialOrders);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Medicine', basePrice: 0 });
  const [addingProduct, setAddingProduct] = useState(false);

  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState({
    category: 'Ayurvedic Doctor',
    address: '',
    phone: ''
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
  };

  const calculateSitePrice = (basePrice) => {
    const price = Number(basePrice) || 0;
    if (price === 0) return 0;
    const commission = Math.max(300, price * 0.10);
    return price + commission;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (newProduct.basePrice <= 0) return alert("Base price must be greater than 0");
    setAddingProduct(true);
    
    try {
      const sitePrice = calculateSitePrice(newProduct.basePrice);
      const newDocRef = doc(collection(db, 'products'));
      const productObj = {
        name: newProduct.name,
        category: newProduct.category,
        basePrice: Number(newProduct.basePrice),
        price: sitePrice,
        vendorId: user.uid,
        vendorName: user.name || user.displayName || 'Vendor',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await setDoc(newDocRef, productObj);
      alert("Product submitted for approval!");
      setShowAddProductModal(false);
      setNewProduct({ name: '', category: 'Medicine', basePrice: 0 });
      // In a real app, fetch products again here
      setVendorProducts([...vendorProducts, { id: newDocRef.id, ...productObj }]);
    } catch (err) {
      console.error("Error adding product", err);
      alert("Failed to add product");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmittingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        profileDetails: profileData
      });
      // Update local state temporarily to avoid reload
      user.profileDetails = profileData;
    } catch (err) {
      console.error("Error updating profile", err);
    } finally {
      setSubmittingProfile(false);
    }
  };

  // INTERCEPT FOR PENDING EXPERTS
  if (user?.status === 'pending') {
    if (!user.profileDetails) {
      return (
        <div className="login-container animate-fade-in" style={{ paddingTop: '80px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="login-card glass-panel" style={{ maxWidth: '500px', width: '90%' }}>
            <h2 style={{ textAlign: 'center', color: 'var(--secondary-color)', marginBottom: '1rem' }}>Complete Your Profile</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Please provide additional details to complete your registration as an expert.</p>
            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {user.role === 'doctor' && (
                <div className="form-group">
                  <label>Doctor Category</label>
                  <select 
                    value={profileData.category} 
                    onChange={e => setProfileData({...profileData, category: e.target.value})}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  >
                    <option value="Ayurvedic Doctor">Ayurvedic Doctor</option>
                    <option value="Paramparika Doctor">Paramparika Doctor</option>
                    <option value="Astrologer">Astrologer</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Address / Clinic Location</label>
                <textarea 
                  required
                  value={profileData.address}
                  onChange={e => setProfileData({...profileData, address: e.target.value})}
                  className="form-control"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                ></textarea>
              </div>
              <div className="form-group">
                <label>Telephone Number</label>
                <input 
                  type="tel" 
                  required
                  value={profileData.phone}
                  onChange={e => setProfileData({...profileData, phone: e.target.value})}
                  className="form-control"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <button disabled={submittingProfile} type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                {submittingProfile ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      );
    } else {
      return (
        <div className="login-container animate-fade-in" style={{ paddingTop: '80px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="login-card glass-panel" style={{ maxWidth: '500px', width: '90%', textAlign: 'center' }}>
            <Clock size={64} style={{ color: 'var(--primary-color)', margin: '0 auto 1.5rem auto' }} />
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Application Under Review</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Thank you for submitting your details. Our administrative team is currently reviewing your application. 
              <br/><br/>
              We will contact you shortly via the provided telephone number to complete the verification and payment process.
            </p>
            <button onClick={() => window.location.href = '/'} className="btn btn-outline" style={{ marginTop: '2rem' }}>Return to Home</button>
          </div>
        </div>
      );
    }
  }

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
          {activeTab === 'products' && <button onClick={() => setShowAddProductModal(true)} className="btn btn-primary">+ Add New Product</button>}
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
                  {vendorProducts.map(p => (
                    <tr key={p.id}>
                      <td className="fw-bold">{p.name}</td>
                      <td>{p.category}</td>
                      <td>Rs. {p.price} <br/><small style={{color: 'var(--text-secondary)'}}>(You get Rs. {p.basePrice})</small></td>
                      <td>
                        {p.status === 'pending' ? (
                          <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Pending Approval</span>
                        ) : p.status === 'approved' ? (
                          <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Live</span>
                        ) : (
                          <span className="type-badge" style={{background: '#f8d7da', color: '#721c24'}}>Rejected</span>
                        )}
                      </td>
                      <td><button className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Edit</button></td>
                    </tr>
                  ))}
                  {vendorProducts.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>You haven't added any products yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {showAddProductModal && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div className="modal-content glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '90%' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--secondary-color)' }}>Add New Product</h3>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Please note: The platform takes a commission of 10% or Rs. 300 (whichever is higher) to cover operational costs. 
                  The calculated final site price will be displayed to customers.
                </p>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Product Name</label>
                    <input 
                      type="text" 
                      value={newProduct.name} 
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                      required 
                      className="form-control"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select 
                      value={newProduct.category} 
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                      className="form-control"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="Medicine">Medicine / Supplements</option>
                      <option value="Hair Care">Hair Care</option>
                      <option value="Skin Care">Skin Care</option>
                      <option value="Pain Relief">Pain Relief Oils</option>
                      <option value="Equipment">Medical Equipment</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Your Selling Price (Base Price Rs.)</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newProduct.basePrice || ''} 
                      onChange={e => setNewProduct({...newProduct, basePrice: e.target.value})} 
                      required 
                      className="form-control"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  
                  {newProduct.basePrice > 0 && (
                    <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', border: '1px dashed var(--primary-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <span>Your Price:</span>
                        <span>Rs. {Number(newProduct.basePrice)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--error-color)', fontSize: '0.9rem' }}>
                        <span>Platform Commission:</span>
                        <span>+ Rs. {calculateSitePrice(newProduct.basePrice) - Number(newProduct.basePrice)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                        <span>Final Site Price:</span>
                        <span>Rs. {calculateSitePrice(newProduct.basePrice)}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button disabled={addingProduct} type="submit" className="btn btn-primary" style={{ flex: 1 }}>{addingProduct ? 'Submitting...' : 'Submit for Approval'}</button>
                    <button type="button" onClick={() => setShowAddProductModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </form>
              </div>
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
