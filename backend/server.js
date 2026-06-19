const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized with ENV credentials.");
  } else {
    admin.initializeApp();
    console.log("Firebase Admin initialized with default credentials.");
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

const db = getFirestore();
const auth = getAuth();

// ============================================================
// MIDDLEWARE
// ============================================================

// Verify any authenticated user
const verifyUser = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Fetch user role from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.userRole = userDoc.data().role || 'user';
      req.userStatus = userDoc.data().status || 'approved';
    } else {
      req.userRole = 'user';
      req.userStatus = 'approved';
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify Admin Token
const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await auth.verifyIdToken(token);
    if (decodedToken.email !== 'yes.manujaya@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify vendor/doctor/clinic/organization
const verifyVendor = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'User profile not found' });
    }
    
    const userData = userDoc.data();
    const vendorRoles = ['vendor', 'doctor', 'clinic', 'organization'];
    if (!vendorRoles.includes(userData.role) && decodedToken.email !== 'yes.manujaya@gmail.com') {
      return res.status(403).json({ error: 'Vendor/Doctor access required' });
    }
    
    req.userRole = userData.role;
    req.userStatus = userData.status;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const apiRouter = express.Router();

// ============================================================
// HEALTH CHECK
// ============================================================
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Deergayu API is running', timestamp: new Date().toISOString() });
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// Get all users (from Firebase Auth + Firestore)
apiRouter.get('/users', verifyAdmin, async (req, res) => {
  try {
    const listUsersResult = await auth.listUsers(1000);
    res.json(listUsersResult.users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
apiRouter.post('/users/:uid/delete', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    try {
      await auth.deleteUser(uid);
    } catch (authError) {
      if (authError.code !== 'auth/user-not-found') throw authError;
      console.log(`User ${uid} not found in Auth, proceeding to delete from Firestore.`);
    }
    await db.collection('users').doc(uid).delete();
    res.json({ message: 'User successfully deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
apiRouter.post('/users/:uid/role', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;
  
  if (!['user', 'doctor', 'clinic', 'organization', 'vendor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await db.collection('users').doc(uid).set({ role }, { merge: true });
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user status
apiRouter.post('/users/:uid/status', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.collection('users').doc(uid).set({ status }, { merge: true });
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product status
apiRouter.post('/products/:id/status', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'approved', 'hidden', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.collection('products').doc(id).set({ status }, { merge: true });
    res.json({ message: 'Product status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (admin)
apiRouter.get('/orders', verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin)
apiRouter.post('/orders/:id/status', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.collection('orders').doc(id).update({ status, updatedAt: new Date().toISOString() });
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all appointments (admin)
apiRouter.get('/appointments', verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('appointments').orderBy('createdAt', 'desc').get();
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin settings
apiRouter.get('/settings', verifyAdmin, async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('admin').get();
    if (doc.exists) {
      res.json(doc.data());
    } else {
      // Return defaults
      res.json({ commissionPercent: 10, autoApproveExperts: false, autoApproveProducts: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save admin settings
apiRouter.post('/settings', verifyAdmin, async (req, res) => {
  const { commissionPercent, autoApproveExperts, autoApproveProducts } = req.body;
  try {
    await db.collection('settings').doc('admin').set({
      commissionPercent: commissionPercent || 10,
      autoApproveExperts: autoApproveExperts || false,
      autoApproveProducts: autoApproveProducts || false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// VENDOR / DOCTOR ROUTES
// ============================================================

// Get vendor's own products
apiRouter.get('/vendor/products', verifyVendor, async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('vendorId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new product
apiRouter.post('/vendor/products', verifyVendor, async (req, res) => {
  const { name, description, price, category, imageUrl, stock } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const productData = {
      name,
      description: description || '',
      price: Number(price),
      category: category || 'General',
      imageUrl: imageUrl || '',
      stock: Number(stock) || 0,
      vendorId: req.user.uid,
      vendorEmail: req.user.email,
      status: 'pending',
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Get vendor name
    const vendorDoc = await db.collection('users').doc(req.user.uid).get();
    if (vendorDoc.exists) {
      productData.vendorName = vendorDoc.data().name || req.user.email;
    }

    const docRef = await db.collection('products').add(productData);
    res.json({ id: docRef.id, ...productData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
apiRouter.put('/vendor/products/:id', verifyVendor, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, imageUrl, stock } = req.body;
  
  try {
    // Verify ownership
    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (productDoc.data().vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only edit your own products' });
    }

    const updateData = { updatedAt: new Date().toISOString() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = Number(price);
    if (category) updateData.category = category;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (stock !== undefined) updateData.stock = Number(stock);

    await db.collection('products').doc(id).update(updateData);
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
apiRouter.delete('/vendor/products/:id', verifyVendor, async (req, res) => {
  const { id } = req.params;
  
  try {
    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (productDoc.data().vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only delete your own products' });
    }

    await db.collection('products').doc(id).delete();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vendor's orders
apiRouter.get('/vendor/orders', verifyVendor, async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('vendorId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (vendor)
apiRouter.post('/vendor/orders/:id/status', verifyVendor, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const orderDoc = await db.collection('orders').doc(id).get();
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' });
    if (orderDoc.data().vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only manage your own orders' });
    }

    await db.collection('orders').doc(id).update({ status, updatedAt: new Date().toISOString() });
    res.json({ message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get doctor's appointments
apiRouter.get('/vendor/appointments', verifyVendor, async (req, res) => {
  try {
    const snapshot = await db.collection('appointments')
      .where('providerId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update appointment status (doctor)
apiRouter.post('/vendor/appointments/:id/status', verifyVendor, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const apptDoc = await db.collection('appointments').doc(id).get();
    if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
    if (apptDoc.data().providerId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only manage your own appointments' });
    }

    await db.collection('appointments').doc(id).update({ status, updatedAt: new Date().toISOString() });
    res.json({ message: 'Appointment status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// USER ROUTES
// ============================================================

// Get approved providers/doctors (public - for Channeling page)
apiRouter.get('/providers', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', 'in', ['doctor', 'clinic', 'organization'])
      .where('status', '==', 'approved')
      .get();
    const providers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        role: data.role,
        profileDetails: data.profileDetails || {},
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0
      };
    });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's cart
apiRouter.get('/cart', verifyUser, async (req, res) => {
  try {
    const doc = await db.collection('carts').doc(req.user.uid).get();
    if (doc.exists) {
      res.json(doc.data());
    } else {
      res.json({ items: [] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add/update cart
apiRouter.post('/cart', verifyUser, async (req, res) => {
  const { productId, name, price, quantity, vendorId, vendorName, imageUrl, category } = req.body;
  
  if (!productId || !name || !price) {
    return res.status(400).json({ error: 'productId, name, and price are required' });
  }

  try {
    const cartRef = db.collection('carts').doc(req.user.uid);
    const cartDoc = await cartRef.get();
    
    let items = [];
    if (cartDoc.exists) {
      items = cartDoc.data().items || [];
    }

    // Check if item already in cart
    const existingIndex = items.findIndex(item => item.productId === productId);
    if (existingIndex >= 0) {
      items[existingIndex].quantity = (items[existingIndex].quantity || 1) + (quantity || 1);
    } else {
      items.push({
        productId,
        name,
        price: Number(price),
        quantity: quantity || 1,
        vendorId: vendorId || '',
        vendorName: vendorName || '',
        imageUrl: imageUrl || '',
        category: category || '',
        addedAt: new Date().toISOString()
      });
    }

    await cartRef.set({ items, updatedAt: new Date().toISOString() });
    res.json({ items, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item quantity
apiRouter.put('/cart/:productId', verifyUser, async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  
  try {
    const cartRef = db.collection('carts').doc(req.user.uid);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) return res.status(404).json({ error: 'Cart not found' });
    
    let items = cartDoc.data().items || [];
    const index = items.findIndex(item => item.productId === productId);
    if (index < 0) return res.status(404).json({ error: 'Item not in cart' });
    
    if (quantity <= 0) {
      items.splice(index, 1);
    } else {
      items[index].quantity = quantity;
    }
    
    await cartRef.set({ items, updatedAt: new Date().toISOString() });
    res.json({ items, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item from cart
apiRouter.delete('/cart/:productId', verifyUser, async (req, res) => {
  const { productId } = req.params;
  
  try {
    const cartRef = db.collection('carts').doc(req.user.uid);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) return res.status(404).json({ error: 'Cart not found' });
    
    let items = cartDoc.data().items || [];
    items = items.filter(item => item.productId !== productId);
    
    await cartRef.set({ items, updatedAt: new Date().toISOString() });
    res.json({ items, message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Checkout - create order
apiRouter.post('/checkout', verifyUser, async (req, res) => {
  const { paymentMethod, deliveryAddress, phone, notes } = req.body;
  
  try {
    // Get cart
    const cartDoc = await db.collection('carts').doc(req.user.uid).get();
    if (!cartDoc.exists || !cartDoc.data().items?.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const items = cartDoc.data().items;
    
    // Get user info
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : req.user.email;
    
    // Group items by vendor for separate orders
    const vendorGroups = {};
    items.forEach(item => {
      const vid = item.vendorId || 'unknown';
      if (!vendorGroups[vid]) {
        vendorGroups[vid] = { items: [], vendorName: item.vendorName || 'Unknown Vendor' };
      }
      vendorGroups[vid].items.push(item);
    });
    
    const orderIds = [];
    
    // Create an order per vendor
    for (const [vendorId, group] of Object.entries(vendorGroups)) {
      const totalPrice = group.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderData = {
        customerId: req.user.uid,
        customerName: userName,
        customerEmail: req.user.email,
        vendorId,
        vendorName: group.vendorName,
        items: group.items,
        totalPrice,
        status: 'pending',
        paymentMethod: paymentMethod || 'cash_on_delivery',
        deliveryAddress: deliveryAddress || '',
        phone: phone || '',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await db.collection('orders').add(orderData);
      orderIds.push(docRef.id);
    }
    
    // Clear cart
    await db.collection('carts').doc(req.user.uid).set({ items: [], updatedAt: new Date().toISOString() });
    
    res.json({ message: 'Order placed successfully', orderIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's orders
apiRouter.get('/my-orders', verifyUser, async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('customerId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book appointment
apiRouter.post('/appointments', verifyUser, async (req, res) => {
  const { providerId, providerName, date, time, notes } = req.body;
  
  if (!providerId || !date || !time) {
    return res.status(400).json({ error: 'providerId, date, and time are required' });
  }

  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : req.user.email;
    
    const appointmentData = {
      customerId: req.user.uid,
      customerName: userName,
      customerEmail: req.user.email,
      providerId,
      providerName: providerName || '',
      date,
      time,
      status: 'pending',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('appointments').add(appointmentData);
    res.json({ id: docRef.id, ...appointmentData, message: 'Appointment booked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's appointments
apiRouter.get('/my-appointments', verifyUser, async (req, res) => {
  try {
    const snapshot = await db.collection('appointments')
      .where('customerId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel appointment (user)
apiRouter.post('/my-appointments/:id/cancel', verifyUser, async (req, res) => {
  const { id } = req.params;
  
  try {
    const apptDoc = await db.collection('appointments').doc(id).get();
    if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
    if (apptDoc.data().customerId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only cancel your own appointments' });
    }
    if (apptDoc.data().status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
    }

    await db.collection('appointments').doc(id).update({ 
      status: 'cancelled', 
      updatedAt: new Date().toISOString() 
    });
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// MOUNT & START
// ============================================================

app.use('/api', apiRouter);
app.use('/', apiRouter);

app.all('{*path}', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
