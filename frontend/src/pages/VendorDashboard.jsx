import React, { useState, useEffect } from 'react';
import { Package, ShoppingBag, Settings, CheckCircle, Clock, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection } from 'firebase/firestore';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const VendorDashboard = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState([]);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Medicine', basePrice: 0, imageUrl: '', description: '' });
  const [addingProduct, setAddingProduct] = useState(false);

  const [schedule, setSchedule] = useState({
    slotDuration: 30,
    workingDays: {
      "Monday": { start: "09:00", end: "17:00", active: true },
      "Tuesday": { start: "09:00", end: "17:00", active: true },
      "Wednesday": { start: "09:00", end: "17:00", active: true },
      "Thursday": { start: "09:00", end: "17:00", active: true },
      "Friday": { start: "09:00", end: "17:00", active: true },
      "Saturday": { start: "09:00", end: "13:00", active: false },
      "Sunday": { start: "09:00", end: "13:00", active: false },
    },
    unavailableDates: []
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  
  const [profileData, setProfileData] = useState({
    category: 'Ayurvedic Doctor',
    address: '',
    phone: ''
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Fetch vendor's products & schedule
  useEffect(() => {
    if (user) {
      if (activeTab === 'products') fetchProducts();
      if (user.profileDetails?.schedule) {
        setSchedule(user.profileDetails.schedule);
      }
    }
  }, [activeTab, user]);

  // Fetch vendor's orders
  useEffect(() => {
    if (activeTab === 'orders' && user) {
      fetchOrders();
    }
  }, [activeTab, user]);

  // Fetch vendor's appointments
  useEffect(() => {
    if (activeTab === 'appointments' && user) {
      fetchAppointments();
    }
  }, [activeTab, user]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVendorProducts(data);
      } else {
        console.error('Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching vendor products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching vendor orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      } else {
        console.error('Failed to fetch appointments');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setOrders(orders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
        success(`Order status updated to ${newStatus}`);
      } else {
        error('Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      error('Error updating order status');
    }
  };

  const handleAppointmentAction = async (appointmentId, status) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/appointments/${appointmentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAppointments(appointments.map(a => a.id === appointmentId ? { ...a, status } : a));
        success(`Appointment status updated to ${status}`);
      } else {
        error('Failed to update appointment status');
      }
    } catch (err) {
      console.error('Error updating appointment:', err);
      error('Error updating appointment');
    }
  };

  const calculateSitePrice = (basePrice) => {
    const price = Number(basePrice) || 0;
    if (price === 0) return 0;
    const commission = Math.max(300, price * 0.10);
    return price + commission;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (newProduct.basePrice <= 0) return error("Base price must be greater than 0");
    setAddingProduct(true);
    
    try {
      const sitePrice = calculateSitePrice(newProduct.basePrice);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProduct.name,
          category: newProduct.category,
          basePrice: Number(newProduct.basePrice),
          price: sitePrice,
          imageUrl: newProduct.imageUrl,
          description: newProduct.description
        })
      });

      if (res.ok) {
        const data = await res.json();
        success("Product submitted for approval!");
        setShowAddProductModal(false);
        setNewProduct({ name: '', category: 'Medicine', basePrice: 0, imageUrl: '', description: '' });
        fetchProducts();
      } else {
        const errData = await res.json().catch(() => ({}));
        error(errData.error || "Failed to add product");
      }
    } catch (err) {
      console.error("Error adding product", err);
      error("Failed to add product");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setVendorProducts(vendorProducts.filter(p => p.id !== productId));
        success("Product deleted successfully!");
      } else {
        error("Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      error("Error deleting product");
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
      success("Profile details saved!");
    } catch (err) {
      console.error("Error updating profile", err);
      error("Failed to save profile details");
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/vendor/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ schedule })
      });
      if (res.ok) {
        // Update local user state
        if (!user.profileDetails) user.profileDetails = {};
        user.profileDetails.schedule = schedule;
        success("Schedule updated successfully!");
      } else {
        error("Failed to update schedule");
      }
    } catch (err) {
      console.error("Error updating schedule", err);
      error("Error updating schedule");
    } finally {
      setSavingSchedule(false);
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
          <button 
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`} 
          onClick={() => setActiveTab('appointments')}
        >
          <Calendar size={18} /> Channeling
        </button>
        <button 
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} 
          onClick={() => setActiveTab('schedule')}
        >
          <Clock size={18} /> My Schedule
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} 
          onClick={() => setActiveTab('profile')}
        >    <Settings size={20} /> Settings
          </li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{activeTab === 'products' ? 'Manage My Products' : activeTab === 'orders' ? 'Customer Orders' : activeTab === 'appointments' ? 'Appointments' : 'Vendor Panel'}</h1>
          {activeTab === 'products' && <button onClick={() => setShowAddProductModal(true)} className="btn btn-primary">+ Add New Product</button>}
        </header>

        <div className="admin-content">
          {activeTab === 'schedule' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ color: 'var(--secondary-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={24} /> Schedule Management
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Set your working hours and appointment slot duration. This will determine the time slots available for patients to book.
              </p>

              <form onSubmit={handleScheduleSubmit}>
                <div className="form-group" style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Slot Duration (minutes)</label>
                  <select 
                    value={schedule.slotDuration} 
                    onChange={e => setSchedule({...schedule, slotDuration: Number(e.target.value)})}
                    className="form-control"
                    style={{ width: '100%', maxWidth: '200px', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>1 Hour</option>
                  </select>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Working Days</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.keys(schedule.workingDays).map(day => (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ width: '120px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={schedule.workingDays[day].active !== false}
                              onChange={e => setSchedule({
                                ...schedule, 
                                workingDays: { 
                                  ...schedule.workingDays, 
                                  [day]: { ...schedule.workingDays[day], active: e.target.checked }
                                }
                              })}
                            />
                            {day}
                          </label>
                        </div>
                        
                        {schedule.workingDays[day].active !== false && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input 
                              type="time" 
                              value={schedule.workingDays[day].start || '09:00'}
                              onChange={e => setSchedule({
                                ...schedule, 
                                workingDays: { 
                                  ...schedule.workingDays, 
                                  [day]: { ...schedule.workingDays[day], start: e.target.value }
                                }
                              })}
                              style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                            <span>to</span>
                            <input 
                              type="time" 
                              value={schedule.workingDays[day].end || '17:00'}
                              onChange={e => setSchedule({
                                ...schedule, 
                                workingDays: { 
                                  ...schedule.workingDays, 
                                  [day]: { ...schedule.workingDays[day], end: e.target.value }
                                }
                              })}
                              style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          </div>
                        )}
                        {schedule.workingDays[day].active === false && (
                          <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                  <button disabled={savingSchedule} type="submit" className="btn btn-primary">
                    {savingSchedule ? 'Saving...' : 'Save Schedule'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Add products to your shop. Once approved by the main Admin, they will appear on the public shop.</p>
              {loadingProducts ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading products...</p>
              ) : (
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
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem'}}>Edit</button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)} 
                              className="btn btn-outline" 
                              style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: 'var(--error-color)', borderColor: 'var(--error-color)'}}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {vendorProducts.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>You haven't added any products yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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
                    <label>Image URL (Optional)</label>
                    <input 
                      type="url" 
                      placeholder="https://example.com/image.jpg"
                      value={newProduct.imageUrl || ''} 
                      onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} 
                      className="form-control"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea 
                      placeholder="Product description..."
                      value={newProduct.description || ''} 
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                      className="form-control"
                      rows="3"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    ></textarea>
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
              {loadingOrders ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading orders...</p>
              ) : (
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
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No orders yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="glass-panel table-container">
              <p className="admin-hint">Manage appointment requests from patients.</p>
              {loadingAppointments ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading appointments...</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt.id}>
                        <td className="fw-bold">{apt.patientName || apt.userName || 'N/A'}</td>
                        <td>{apt.date}</td>
                        <td>{apt.time}</td>
                        <td>{apt.notes || '-'}</td>
                        <td>
                          {apt.status === 'pending' && <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}>Pending</span>}
                          {apt.status === 'accepted' && <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}>Accepted</span>}
                          {apt.status === 'rejected' && <span className="type-badge" style={{background: '#f8d7da', color: '#721c24'}}>Rejected</span>}
                        </td>
                        <td>
                          {apt.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleAppointmentAction(apt.id, 'accepted')} className="btn btn-primary" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--success-color)'}}>Accept</button>
                              <button onClick={() => handleAppointmentAction(apt.id, 'rejected')} className="btn btn-outline" style={{padding: '0.25rem 0.75rem', fontSize: '0.85rem', color: 'var(--error-color)', borderColor: 'var(--error-color)'}}>Reject</button>
                            </div>
                          )}
                          {apt.status !== 'pending' && (
                            <span style={{ color: apt.status === 'accepted' ? 'var(--success-color)' : 'var(--error-color)', fontSize: '0.85rem' }}>
                              {apt.status === 'accepted' ? '✓ Confirmed' : '✗ Declined'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No appointments yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
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
