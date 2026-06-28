import React, { useState, useEffect } from 'react';
import { Package, ShoppingBag, Settings, CheckCircle, Clock, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, auth, storage } from '../firebase';
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './AdminDashboard.css';


const API_URL = import.meta.env.VITE_API_URL || '';

const VendorDashboard = () => {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
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
    phone: '',
    profileImageUrl: ''
  });
  const [submittingProfile, setSubmittingProfile] = useState(false);

  const [settingsData, setSettingsData] = useState({
    name: '',
    profileImageUrl: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [settingsUploadingImage, setSettingsUploadingImage] = useState(false);

  const handleImageUpload = async (e, isSettings = false) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file (JPG, PNG, WEBP, etc.)');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      error('Image must be less than 3MB');
      return;
    }

    isSettings ? setSettingsUploadingImage(true) : setUploadingImage(true);
    try {
      const storageRef = ref(storage, `profileImages/${user.uid}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      if (isSettings) {
        setSettingsData(prev => ({ ...prev, profileImageUrl: downloadURL }));
      } else {
        setProfileData(prev => ({ ...prev, profileImageUrl: downloadURL }));
      }
      success("Image uploaded successfully!");
    } catch (err) {
      console.error("Error uploading image:", err);
      error("Failed to upload image");
    } finally {
      isSettings ? setSettingsUploadingImage(false) : setUploadingImage(false);
    }
  };

  // Fetch vendor's products & schedule
  useEffect(() => {
    if (user) {
      if (activeTab === 'products') fetchProducts();
      if (user.profileDetails?.schedule) {
        setSchedule(user.profileDetails.schedule);
      }
      setSettingsData(prev => ({
        ...prev,
        name: user.displayName || user.name || '',
        profileImageUrl: user.profileDetails?.profileImageUrl || ''
      }));
    }
  }, [activeTab, user]);

  // Fetch vendor's orders
  useEffect(() => {
    if (activeTab === 'orders' && user) {
      fetchOrders();
    }
  }, [activeTab, user]);

  // Listen to vendor's appointments in real-time
  useEffect(() => {
    if (!user) return;
    
    setLoadingAppointments(true);
    let initialLoad = true;
    
    const q = query(
      collection(db, 'appointments'),
      where('providerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      appts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAppointments(appts);
      setLoadingAppointments(false);
      
      if (!initialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            success(`🔔 New Appointment from ${data.customerName || data.patientName}!`);
          }
        });
      }
      initialLoad = false;
    }, (err) => {
      console.error('Error listening to appointments:', err);
      setLoadingAppointments(false);
    });
    
    return () => unsubscribe();
  }, [user]);

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
      window.location.reload(); // Reload to clear pending state
    } catch (err) {
      console.error("Error updating profile", err);
      error("Failed to save profile details");
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingSettings(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      // Merge image URL into existing profileDetails (preserve address, phone, specialty etc.)
      const existingDetails = user.profileDetails || {};
      await updateDoc(userRef, {
        name: settingsData.name,
        'profileDetails.profileImageUrl': settingsData.profileImageUrl
      });
      // Refresh the user in AuthContext so Navbar + profile pic updates immediately
      if (refreshUser) await refreshUser();
      // Also update local user object for immediate UI feedback
      if (user.profileDetails) {
        user.profileDetails.profileImageUrl = settingsData.profileImageUrl;
      } else {
        user.profileDetails = { profileImageUrl: settingsData.profileImageUrl };
      }
      user.displayName = settingsData.name;
      success('Profile picture and name updated successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      error('Failed to save profile. Please try again.');
    } finally {
      setSavingSettings(false);
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
                <label>Profile Picture <small style={{color: 'var(--text-secondary)'}}>(Optional)</small></label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  className="form-control"
                  disabled={uploadingImage}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
                {uploadingImage && <small style={{color: 'var(--primary-color)', marginTop: '0.5rem', display: 'block'}}>Uploading image...</small>}
                {profileData.profileImageUrl && !uploadingImage && (
                  <div style={{marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <img src={profileData.profileImageUrl} alt="Preview" style={{width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)'}} />
                    <button type="button" className="btn btn-outline" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--error-color)', color: 'var(--error-color)'}} onClick={() => setProfileData({...profileData, profileImageUrl: ''})}>Remove</button>
                  </div>
                )}
              </div>
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
          <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{user?.displayName || user?.name}</p>
        </div>
        <ul className="admin-nav">
          <li className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
            <Package size={20} /> My Products
          </li>
          <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
            <ShoppingBag size={20} /> Customer Orders
          </li>
          <li className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>
            <Calendar size={20} /> Appointments
          </li>
          <li className={activeTab === 'schedule' ? 'active' : ''} onClick={() => setActiveTab('schedule')}>
            <Clock size={20} /> My Schedule
          </li>
          <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            <Settings size={20} /> Settings
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

          {activeTab === 'products' && (
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
                    {orders.length === 0 ? (
                      <tr><td colSpan={6} style={{textAlign:'center',padding:'2rem',color:'var(--text-secondary)'}}>No orders yet.</td></tr>
                    ) : orders.map(order => {
                      const itemNames = (order.items || []).map(i => i.name).join(', ');
                      const itemQty   = (order.items || []).reduce((s,i) => s + (i.quantity||1), 0);
                      return (
                      <tr key={order.id}>
                        <td className="fw-bold" style={{fontSize:'0.78rem'}}>{order.id?.slice(-8).toUpperCase()}</td>
                        <td>{itemNames || '—'} <br/><small style={{color:'var(--text-secondary)'}}>{order.customerName || 'Customer'}</small></td>
                        <td>{itemQty}</td>
                        <td>Rs. {(order.totalPrice || 0).toLocaleString()}</td>
                        <td>
                          {order.status === 'pending'    && <span className="type-badge astrologer" style={{background:'#fff3cd',color:'#856404'}}>Pending</span>}
                          {order.status === 'confirmed'  && <span className="type-badge astrologer" style={{background:'#cce5ff',color:'#004085'}}>Confirmed</span>}
                          {order.status === 'processing' && <span className="type-badge astrologer" style={{background:'#fff3cd',color:'#856404'}}>Processing</span>}
                          {order.status === 'shipped'    && <span className="type-badge doctor" style={{background:'#d4edda',color:'#155724'}}>Shipped</span>}
                          {order.status === 'delivered'  && <span className="type-badge" style={{background:'#cce5ff',color:'#004085'}}>Delivered</span>}
                          {order.status === 'cancelled'  && <span className="type-badge" style={{background:'#f8d7da',color:'#721c24'}}>Cancelled</span>}
                          {order.phone && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(order.customerName)},%20regarding%20your%20order%20(${order.id?.slice(-8).toUpperCase()})%20from%20Deergayu:`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: '#25D366', color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </td>
                        <td>
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'processing')} className="btn btn-primary" style={{padding:'0.25rem 0.75rem',fontSize:'0.85rem'}}>Process</button>
                          )}
                          {order.status === 'processing' && (
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} className="btn btn-primary" style={{padding:'0.25rem 0.75rem',fontSize:'0.85rem'}}>Mark Shipped</button>
                          )}
                          {order.status === 'shipped' && (
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'delivered')} className="btn btn-primary" style={{padding:'0.25rem 0.75rem',fontSize:'0.85rem',background:'var(--success-color)'}}>Mark Delivered</button>
                          )}
                          {order.status === 'delivered' && (
                            <span style={{color:'var(--success-color)',display:'flex',alignItems:'center',gap:'0.25rem',fontSize:'0.85rem'}}><CheckCircle size={16}/> Done</span>
                          )}
                        </td>
                      </tr>
                    );})}
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
                      <th>Contact</th>
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
                        <td className="fw-bold">{apt.customerName || apt.patientName || apt.userName || 'N/A'}</td>
                        <td>
                          {apt.customerPhone && (
                            <div style={{ marginBottom: '0.25rem' }}>
                              <a href={`tel:${apt.customerPhone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.85rem' }}>📞 {apt.customerPhone}</a>
                            </div>
                          )}
                          {apt.customerEmail ? (
                            <div>
                              <a href={`mailto:${apt.customerEmail}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.85rem' }}>✉️ {apt.customerEmail}</a>
                            </div>
                          ) : <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>No Email</span>}
                          {apt.customerPhone && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a href={`https://wa.me/${apt.customerPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(apt.customerName)},%20regarding%20your%20appointment%20with%20Deergayu:`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: '#25D366', color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </td>
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
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No appointments yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel table-container" style={{maxWidth: '600px'}}>
              <h2 style={{color: 'var(--text-primary)', marginBottom: '0.25rem'}}>Profile Settings</h2>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem'}}>Update your name and profile picture. Changes apply immediately.</p>
              
              {/* Profile Picture Section - Prominent */}
              <div style={{
                background: 'rgba(76,175,80,0.05)',
                border: '1px solid rgba(76,175,80,0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Avatar Preview */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {settingsData.profileImageUrl ? (
                    <>
                      <img
                        src={settingsData.profileImageUrl}
                        alt="Profile"
                        style={{
                          width: '90px', height: '90px', borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid var(--primary-color)',
                          boxShadow: '0 4px 16px rgba(76,175,80,0.3)'
                        }}
                        onError={e => { e.target.style.display='none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setSettingsData({...settingsData, profileImageUrl: ''})}
                        style={{
                          position: 'absolute', top: -4, right: -4,
                          background: 'var(--error-color)', color: 'white',
                          border: 'none', borderRadius: '50%',
                          width: '22px', height: '22px', fontSize: '11px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                        title="Remove photo"
                      >✕</button>
                    </>
                  ) : (
                    <div style={{
                      width: '90px', height: '90px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(76,175,80,0.2), rgba(212,175,55,0.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed rgba(76,175,80,0.4)',
                      fontSize: '2rem', color: 'var(--primary-color)'
                    }}>
                      {(user?.displayName || user?.name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ color: 'var(--text-primary)', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
                    Profile Picture
                  </label>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                    JPG, PNG or WEBP. Max 3MB. Square images work best.
                  </p>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    background: settingsUploadingImage ? 'rgba(76,175,80,0.1)' : 'var(--primary-color)',
                    color: settingsUploadingImage ? 'var(--primary-color)' : 'white',
                    borderRadius: 'var(--radius-full)',
                    cursor: settingsUploadingImage ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem', fontWeight: '600',
                    border: '1px solid var(--primary-color)',
                    transition: 'all 0.2s'
                  }}>
                    {settingsUploadingImage ? (
                      <><div className="spinner spinner-sm" style={{width:'14px',height:'14px',border:'2px solid var(--primary-color)',borderTopColor:'transparent'}}/> Uploading...</>
                    ) : (
                      <>📷 {settingsData.profileImageUrl ? 'Change Photo' : 'Upload Photo'}</>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      disabled={settingsUploadingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              <div className="form-group" style={{marginBottom: '1rem'}}>
                <label style={{color: 'var(--text-secondary)'}}>Email Address</label>
                <input type="email" defaultValue={user?.email || ''} disabled className="form-control" style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', opacity: 0.7}} />
              </div>

              <div className="form-group" style={{marginBottom: '1.5rem'}}>
                <label style={{color: 'var(--text-secondary)'}}>Display Name</label>
                <input type="text" value={settingsData.name} onChange={e => setSettingsData({...settingsData, name: e.target.value})} className="form-control" style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)'}} />
              </div>

              <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
                <button className="btn btn-primary" onClick={handleSettingsSubmit} disabled={savingSettings || settingsUploadingImage}>
                  {savingSettings ? <><div className="spinner spinner-sm" style={{width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',display:'inline-block',marginRight:'0.4rem'}}/> Saving...</> : '✓ Save Changes'}
                </button>
                <button className="btn btn-outline" style={{borderColor: 'var(--error-color)', color: 'var(--error-color)', marginLeft: 'auto'}} onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Logout</button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default VendorDashboard;
