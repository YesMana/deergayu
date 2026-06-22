const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const dotenv = require('dotenv');
const { sendEmail } = require('./emailService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const allowedOrigins = [
  'https://deergayu.com',
  'https://www.deergayu.com',
  /\.vercel\.app$/,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests
    const allowed = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
    callback(null, allowed ? true : new Error('CORS: Origin not allowed'));
  },
  credentials: true
}));
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
      .get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const vendorName = userDoc.exists ? userDoc.data().name : req.user.email;

    const productData = {
      name,
      description: description || '',
      basePrice: req.body.basePrice ? Number(req.body.basePrice) : Number(price),
      price: Number(price),
      category: category || 'General',
      imageUrl: imageUrl || '',
      stock: Number(stock) || 0,
      vendorId: req.user.uid,
      vendorEmail: req.user.email,
      vendorName: vendorName,
      status: 'pending',
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await db.collection('products').add(productData);
    res.status(201).json({ id: docRef.id, ...productData });
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
      .get();
    let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
      .get();
    let appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    appointments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update appointment status (doctor)
apiRouter.post('/vendor/appointments/:id/status', verifyVendor, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'accepted', 'rejected', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const apptDoc = await db.collection('appointments').doc(id).get();
    if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
    if (apptDoc.data().providerId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only manage your own appointments' });
    }

    await db.collection('appointments').doc(id).update({ status, updatedAt: new Date().toISOString() });
    
    // Send email to customer
    try {
      const apptData = apptDoc.data();
      if (apptData.customerEmail) {
        const statusText = status === 'accepted' ? '✅ Confirmed' : status === 'rejected' ? '❌ Declined' : status;
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: ${status === 'accepted' ? '#2e7d32' : '#c62828'};">Appointment ${statusText}</h2>
            <p>Hello ${apptData.customerName || 'Patient'},</p>
            <p>Your appointment request has been <strong>${status}</strong> by <strong>${apptData.providerName}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${apptData.date}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${apptData.time}</p>
            </div>
            ${status === 'accepted' ? '<p>Please be ready 10 minutes before your appointment time.</p>' : '<p>You may try booking another available slot.</p>'}
            <br/>
            <p>Thanks,<br/>Deergayu Platform Team</p>
          </div>
        `;
        // Fire and forget email sending to avoid blocking the response
        sendEmail(apptData.customerEmail, `Appointment ${statusText} - Deergayu`, '', htmlBody)
          .catch(emailErr => console.error('Failed to send appointment status email in background:', emailErr));
      }
    } catch (emailErr) {
      console.error('Error preparing email:', emailErr);
    }
    
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

      // Send vendor notification (fire and forget)
      try {
        const vendorDoc = await db.collection('users').doc(vendorId).get();
        if (vendorDoc.exists && vendorDoc.data().email) {
          const itemsHtml = group.items.map(i => `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px">x${i.quantity}</td><td style="padding:6px 12px">Rs. ${(i.price * i.quantity).toLocaleString()}</td></tr>`).join('');
          const vendorHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#333">
            <h2 style="color:#2e7d32">&#128717; New Order Received!</h2>
            <p>Hello ${group.vendorName},</p>
            <p>You have a new order from <strong>${userName}</strong>.</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0">
              <thead><tr style="background:#f5f5f5"><th style="padding:6px 12px;text-align:left">Item</th><th style="padding:6px 12px">Qty</th><th style="padding:6px 12px">Price</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot><tr><td colspan="2" style="padding:8px 12px;font-weight:bold">Total</td><td style="padding:8px 12px;font-weight:bold">Rs. ${totalPrice.toLocaleString()}</td></tr></tfoot>
            </table>
            <p><strong>Payment:</strong> ${paymentMethod}</p>
            <p><strong>Delivery Address:</strong> ${deliveryAddress}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p>Please log in to your Deergayu dashboard to process this order.</p>
            <br/><p>Thanks,<br/>Deergayu Platform</p>
          </div>`;
          sendEmail(vendorDoc.data().email, `New Order - Rs. ${totalPrice.toLocaleString()} - Deergayu`, '', vendorHtml)
            .catch(e => console.error('Vendor order email error:', e));
        }
      } catch(emailErr) { console.error('Vendor email prep error:', emailErr); }
    }

    // Send customer confirmation email (fire and forget)
    try {
      const allItemsHtml = items.map(i => `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px">x${i.quantity}</td><td style="padding:6px 12px">Rs. ${(i.price * i.quantity).toLocaleString()}</td></tr>`).join('');
      const grandTotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const paymentInstructions = (paymentMethod === 'bank_transfer' || paymentMethod === 'qr_pay') 
        ? `<div style="background:#fff8e1;border-left:4px solid #ffc107;padding:16px;margin:16px 0;border-radius:4px">
            <h3 style="margin:0 0 8px 0;color:#f57f17">Payment Pending</h3>
            <p style="margin:0">Your order is reserved. Please complete your payment via <strong>${paymentMethod === 'qr_pay' ? 'QR Pay' : 'Bank Transfer'}</strong> and your order will be confirmed.</p>
            <p style="margin:8px 0 0 0"><strong>Bank:</strong> People's Bank | <strong>Acc:</strong> 123-4567-8901 | <strong>Name:</strong> Deergayu (Pvt) Ltd | <strong>Ref:</strong> ${orderIds[0]?.slice(-8).toUpperCase()}</p>
          </div>` 
        : '';
      const customerHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#333">
        <h2 style="color:#2e7d32">Order Confirmed!</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for shopping at Deergayu! Your order has been placed successfully.</p>
        <p><strong>Order Reference:</strong> ${orderIds.map(id => id.slice(-8).toUpperCase()).join(', ')}</p>
        ${paymentInstructions}
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <thead><tr style="background:#f5f5f5"><th style="padding:6px 12px;text-align:left">Item</th><th style="padding:6px 12px">Qty</th><th style="padding:6px 12px">Price</th></tr></thead>
          <tbody>${allItemsHtml}</tbody>
          <tfoot><tr><td colspan="2" style="padding:8px 12px;font-weight:bold">Total</td><td style="padding:8px 12px;font-weight:bold">Rs. ${grandTotal.toLocaleString()}</td></tr></tfoot>
        </table>
        <p><strong>Delivery to:</strong> ${deliveryAddress}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <br/><p>Thanks for your order!<br/>Deergayu Team</p>
      </div>`;
      sendEmail(req.user.email, `Order Confirmed - Rs. ${grandTotal.toLocaleString()} | Deergayu`, '', customerHtml)
        .catch(e => console.error('Customer order email error:', e));
    } catch(emailErr) { console.error('Customer email prep error:', emailErr); }
    
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
      .get();
    let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
    // Prevent double booking
    const existing = await db.collection('appointments')
      .where('providerId', '==', providerId)
      .where('date', '==', date)
      .where('time', '==', time)
      .where('status', 'in', ['pending', 'accepted'])
      .get();
      
    if (!existing.empty) {
      return res.status(400).json({ error: 'This time slot is already booked.' });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : req.user.email;
    
    const appointmentData = {
      customerId: req.user.uid,
      customerName: userName,
      customerEmail: req.user.email,
      customerPhone: req.body.phone || '',
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

    // Send Email
    try {
      const providerDoc = await db.collection('users').doc(providerId).get();
      if (providerDoc.exists && providerDoc.data().email) {
        const providerEmail = providerDoc.data().email;
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2e7d32;">New Appointment Request</h2>
            <p>Hello ${providerName},</p>
            <p>You have a new appointment booking request from <strong>${userName}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
              <p style="margin: 5px 0;"><strong>Patient Note:</strong> ${notes || 'None'}</p>
            </div>
            <p>Please log in to your Deergayu Vendor Dashboard to accept or decline this request.</p>
            <br/>
            <p>Thanks,<br/>Deergayu Platform Team</p>
          </div>
        `;
        // Fire and forget email sending to avoid blocking the response
        sendEmail(providerEmail, 'New Appointment Booking - Deergayu', '', htmlBody)
          .catch(emailErr => console.error('Failed to send booking email in background:', emailErr));
      }
    } catch (emailErr) {
      console.error("Error preparing booking email:", emailErr);
    }

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
      .get();
    let appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    appointments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

// Save Vendor Schedule
apiRouter.post('/vendor/schedule', verifyUser, async (req, res) => {
  try {
    const { schedule } = req.body; // e.g. { slotDuration, workingDays, unavailableDates }
    await db.collection('users').doc(req.user.uid).update({
      'profileDetails.schedule': schedule
    });
    res.json({ message: 'Schedule updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available slots for a provider on a specific date
apiRouter.get('/appointments/available/:providerId', async (req, res) => {
  const { providerId } = req.params;
  const { date } = req.query; // YYYY-MM-DD
  
  if (!date) return res.status(400).json({ error: "Date query param required" });

  try {
    // 1. Get Provider Schedule
    const providerDoc = await db.collection('users').doc(providerId).get();
    if (!providerDoc.exists) return res.status(404).json({ error: "Provider not found" });
    
    const profile = providerDoc.data().profileDetails || {};
    const schedule = profile.schedule || {
      slotDuration: 30,
      workingDays: {
        "Monday": { start: "09:00", end: "17:00" },
        "Tuesday": { start: "09:00", end: "17:00" },
        "Wednesday": { start: "09:00", end: "17:00" },
        "Thursday": { start: "09:00", end: "17:00" },
        "Friday": { start: "09:00", end: "17:00" },
      },
      unavailableDates: []
    };

    // Check if date is unavailable
    if (schedule.unavailableDates && schedule.unavailableDates.includes(date)) {
      return res.json({ allSlots: [], bookedSlots: [] });
    }

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const workingDay = schedule.workingDays ? schedule.workingDays[dayOfWeek] : null;

    if (!workingDay || !workingDay.start || !workingDay.end) {
      return res.json({ allSlots: [], bookedSlots: [] });
    }

    // 2. Fetch existing appointments for this provider on this date
    const apptsSnapshot = await db.collection('appointments')
      .where('providerId', '==', providerId)
      .where('date', '==', date)
      .where('status', 'in', ['pending', 'accepted'])
      .get();
      
    const bookedSlots = apptsSnapshot.docs.map(doc => doc.data().time);

    // 3. Generate slots
    const availableSlots = [];
    const [startH, startM] = workingDay.start.split(':').map(Number);
    const [endH, endM] = workingDay.end.split(':').map(Number);
    
    let currentMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const slotDuration = Number(schedule.slotDuration) || 30;

    while (currentMins + slotDuration <= endMins) {
      const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const m = (currentMins % 60).toString().padStart(2, '0');
      const timeString = `${h}:${m}`;
      
      availableSlots.push(timeString);
      currentMins += slotDuration;
    }

    res.json({ allSlots: availableSlots, bookedSlots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AI Chatbot Route (Gemini)
// ============================================================
apiRouter.post('/chat', async (req, res) => {
  try {
    const { message, lang } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured in backend." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are AyurBot, an expert Ayurvedic assistant for the Deergayu platform in Sri Lanka.
Your job is to provide safe, natural Ayurvedic home remedies for common ailments. 
If the ailment is serious, strongly advise them to consult a doctor via the 'Channeling' page.
Keep your answers brief, friendly, and highly relevant to Ayurveda.
The user is speaking in ${lang === 'si' ? 'Sinhala' : lang === 'ta' ? 'Tamil' : 'English'}. Please reply in the same language.
User's message: ${message}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// ============================================================
// MOUNT & START
// ============================================================

app.use('/api', apiRouter);
// Note: removed duplicate '/' mount to avoid route conflicts

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
