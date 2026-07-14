const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
// Always load .env next to server.js (cPanel cwd is often not the app root)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { sendEmail, sendAdminEmail, verifySmtp, getEmailStatus, ADMIN_EMAIL } = require('./emailService');
const {
  getSettings,
  isAdminUser,
  calcProductPricing,
  getCategoryCommission,
  calcOrderEarnings,
  updateReviewAggregates,
  DEFAULT_SETTINGS,
} = require('./platformUtils');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');

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

// Verify Admin Token (multi-admin: Firestore role, adminEmails list, or super-admin)
const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const allowed = await isAdminUser(db, decodedToken);
    if (!allowed) {
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
    const isAdmin = await isAdminUser(db, decodedToken);
    if (!vendorRoles.includes(userData.role) && !isAdmin) {
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

// Public-safe email config probe (no secrets)
apiRouter.get('/email/status', (req, res) => {
  const s = getEmailStatus();
  res.json({
    configured: s.configured,
    mode: s.mode,
    host: s.host,
    port: s.port,
    user: s.user,
    adminEmail: s.adminEmail,
    okHint: s.okHint,
    envFilePresent: s.envFilePresent,
    passLength: s.passLength,
    resendConfigured: s.resendConfigured,
    appDir: s.appDir,
    envKeysSeen: s.envKeysSeen || [],
  });
});

// Admin: verify SMTP + optionally send a real test message
apiRouter.post('/admin/email-test', verifyAdmin, async (req, res) => {
  try {
    const verify = await verifySmtp();
    if (!verify.ok) return res.status(500).json(verify);

    const to = (req.body?.to || ADMIN_EMAIL || '').trim();
    const result = await sendEmail(
      to,
      'Deergayu SMTP test',
      'If you received this, outbound email from info@deergayu.com is working.',
      `<div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#2e7d32">Deergayu SMTP test OK</h2>
        <p>Outbound mail from <strong>info@deergayu.com</strong> is working.</p>
        <p>Sent at ${new Date().toISOString()}</p>
      </div>`
    );
    res.json({ verify, send: result, to });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Auth identity — includes adminEmails list (for multi-admin UI access)
apiRouter.get('/auth/me', verifyUser, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const data = userDoc.exists ? userDoc.data() : {};
    const admin = await isAdminUser(db, req.user);
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      role: admin ? 'admin' : (data.role || 'user'),
      status: data.status || 'approved',
      name: data.name || null,
      isAdmin: admin,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public storefront settings (shipping, bank, payhere flag)
apiRouter.get('/storefront-settings', async (req, res) => {
  try {
    const settings = await getSettings(db);
    res.json({
      shippingZones: settings.shippingZones || DEFAULT_SETTINGS.shippingZones,
      bankDetails: settings.bankDetails || DEFAULT_SETTINGS.bankDetails,
      payhereEnabled: Boolean(settings.payhereEnabled && process.env.PAYHERE_MERCHANT_ID),
      contactEmail: settings.contactEmail || DEFAULT_SETTINGS.contactEmail,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sitemap data for SEO (products + static pages)
apiRouter.get('/sitemap-data', async (req, res) => {
  try {
    const snap = await db.collection('products').where('status', '==', 'approved').limit(500).get();
    const products = snap.docs.map((d) => ({
      id: d.id,
      updatedAt: d.data().updatedAt || d.data().createdAt || null,
    }));
    res.json({
      baseUrl: 'https://deergayu.com',
      static: [
        '/', '/shop', '/channeling', '/ayurvedic-guide', '/videos', '/astrology',
        '/contact', '/privacy', '/terms', '/refund-policy',
      ],
      products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AUTHENTICATION APIs
// ============================================================
apiRouter.post('/auth/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4CAF50; text-align: center;">Password Reset Request</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">We received a request to reset your password for your Deergayu account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666;">If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">Deergayu Platform &copy; ${new Date().getFullYear()}</p>
      </div>
    `;
    
    await sendEmail(email, 'Reset your Deergayu password', 'Password Reset Link', html);
    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error generating password reset link:', error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User with this email not found' });
    }
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Notify user + admin after registration (called from frontend after Firebase signup)
apiRouter.post('/auth/register-notify', async (req, res) => {
  const { name, email, role, profileDetails } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'name, email, and role are required' });
  }

  const isExpert = ['doctor', 'clinic', 'organization', 'vendor'].includes(role);
  const statusLabel = isExpert ? 'Pending Admin Approval' : 'Active';

  const welcomeHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2e7d32; text-align: center;">Welcome to Deergayu!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering on the Deergayu Ayurvedic platform. Your account has been created successfully.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Account Type:</strong> ${role}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${statusLabel}</p>
      </div>
      ${isExpert
        ? '<p>Our team will review your expert profile shortly. You will be notified once your account is approved.</p>'
        : '<p>You can now browse products, book doctor appointments, and use our AI health assistant.</p>'}
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://deergayu.com" style="background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Deergayu</a>
      </p>
      <p style="font-size: 12px; color: #999; text-align: center;">Deergayu Platform &copy; ${new Date().getFullYear()}</p>
    </div>
  `;

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #1565c0;">New User Registration</h2>
      <p>A new user has registered on Deergayu:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Role:</strong> ${role}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${statusLabel}</p>
        ${profileDetails?.telephone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${profileDetails.telephone}</p>` : ''}
        ${profileDetails?.address ? `<p style="margin: 5px 0;"><strong>Address:</strong> ${profileDetails.address}</p>` : ''}
        ${profileDetails?.specialty ? `<p style="margin: 5px 0;"><strong>Specialty:</strong> ${profileDetails.specialty}</p>` : ''}
      </div>
      ${isExpert ? '<p><strong>Action required:</strong> Please review and approve this expert in the Admin Dashboard.</p>' : ''}
      <p><a href="https://deergayu.com/admin">Open Admin Dashboard</a></p>
    </div>
  `;

  try {
    sendEmail(email, 'Welcome to Deergayu!', '', welcomeHtml)
      .catch(e => console.error('Welcome email error:', e));
    sendAdminEmail(`New Registration: ${name} (${role})`, adminHtml)
      .catch(e => console.error('Admin registration email error:', e));
    res.json({ message: 'Registration notifications sent' });
  } catch (error) {
    console.error('Register notify error:', error);
    res.status(500).json({ error: 'Failed to send registration notifications' });
  }
});

// Public contact form — emails admin and sends confirmation to user
apiRouter.post('/contact', async (req, res) => {
  const { name, email, phone, message, subject } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }

  const topic = subject || 'General Inquiry';

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #1565c0;">New Contact Message</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${topic}</p>
      </div>
      <p style="white-space: pre-wrap;">${message}</p>
      <p style="margin-top: 20px;"><a href="mailto:${email}">Reply to ${name}</a></p>
    </div>
  `;

  const userHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2e7d32;">We received your message</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for contacting Deergayu. We have received your message and our team will get back to you shortly.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Subject:</strong> ${topic}</p>
        <p style="margin: 5px 0; white-space: pre-wrap;"><strong>Your message:</strong><br/>${message}</p>
      </div>
      <p>For urgent matters, call us at <strong>0762209299</strong>.</p>
      <p style="font-size: 12px; color: #999; text-align: center;">Deergayu Platform &copy; ${new Date().getFullYear()}</p>
    </div>
  `;

  try {
    await db.collection('contact_messages').add({
      name, email, phone: phone || '', subject: topic, message,
      status: 'new', createdAt: new Date().toISOString(),
    });
    const adminResult = await sendAdminEmail(`Contact: ${topic} — ${name}`, adminHtml);
    const userResult = await sendEmail(email, 'We received your message — Deergayu', '', userHtml);

    const emailsOk = Boolean(adminResult?.ok && userResult?.ok);
    if (!emailsOk) {
      console.error('Contact email failure', { adminResult, userResult });
      return res.status(502).json({
        message: 'Message saved, but email delivery failed. Please check SMTP settings.',
        saved: true,
        email: { admin: adminResult, user: userResult },
      });
    }

    res.json({ message: 'Message sent successfully', saved: true, emailOk: true });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

apiRouter.get('/admin/contact-messages', verifyAdmin, async (req, res) => {
  try {
    const snap = await db.collection('contact_messages').orderBy('createdAt', 'desc').limit(100).get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUBLIC SMART APIs (Home Page, Symptom Checker, etc.)
// ============================================================

// Get platform stats for Home page
apiRouter.get('/home-stats', async (req, res) => {
  try {
    const [providersSnap, productsSnap, ordersSnap, appointmentsSnap] = await Promise.all([
      db.collection('users').where('role', 'in', ['doctor', 'clinic', 'organization']).where('status', '==', 'approved').get(),
      db.collection('products').where('status', '==', 'approved').get(),
      db.collection('orders').get(),
      db.collection('appointments').get()
    ]);
    res.json({
      expertCount: providersSnap.size,
      productCount: productsSnap.size,
      orderCount: ordersSnap.size,
      appointmentCount: appointmentsSnap.size,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured/approved providers for Home page
apiRouter.get('/featured-providers', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', 'in', ['doctor', 'clinic', 'organization'])
      .where('status', '==', 'approved')
      .limit(6)
      .get();
    const providers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        role: data.role,
        profileDetails: data.profileDetails || {},
        rating: data.rating || 4.5,
        reviewCount: data.reviewCount || 0
      };
    });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get featured products for Home page
apiRouter.get('/featured-products', async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('status', '==', 'approved')
      .limit(6)
      .get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public product catalog (mobile + storefront)
apiRouter.get('/products', async (req, res) => {
  try {
    const limitN = Math.min(Number(req.query.limit) || 50, 100);
    const snapshot = await db.collection('products')
      .where('status', '==', 'approved')
      .limit(limitN)
      .get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI-Powered Symptom Checker
apiRouter.post('/symptom-check', async (req, res) => {
  try {
    const { symptom, lang } = req.body;
    if (!symptom) return res.status(400).json({ error: 'Symptom is required' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Fetch real data from DB in parallel
    let providersSnap = { docs: [] };
    let productsSnap = { docs: [] };
    
    try {
      [providersSnap, productsSnap] = await Promise.all([
        db.collection('users').where('role', 'in', ['doctor', 'clinic', 'organization']).where('status', '==', 'approved').get(),
        db.collection('products').where('status', '==', 'approved').get()
      ]);
    } catch (dbErr) {
      console.warn('Symptom Checker: Could not fetch from DB (Firebase may not be configured locally). Proceeding with AI only.');
    }

    const providersList = providersSnap.docs.map(d => {
      const data = d.data();
      return `${data.name} (${data.role}) - Specialty: ${data.profileDetails?.specialty || 'General Ayurveda'} - Location: ${data.profileDetails?.address || 'Sri Lanka'}`;
    }).join('\n');

    const productsList = productsSnap.docs.map(d => {
      const data = d.data();
      return `${data.name} - Category: ${data.category} - Price: Rs.${data.price}`;
    }).join('\n');

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are AyurBot, an expert Ayurvedic assistant for the Deergayu platform in Sri Lanka.
A patient has described their symptoms. Your job is to:
1. Give a brief Ayurvedic analysis of the likely condition (2-3 sentences)
2. Suggest 2-4 natural home remedies based on Sri Lankan Ayurveda
3. From the list of REAL doctors on our platform, pick the TOP 3 most suitable ones for this symptom
4. From the list of REAL products on our platform, pick the TOP 3 most suitable ones for this symptom

RESPOND ONLY IN VALID JSON in this exact format:
{
  "analysis": "Brief Ayurvedic analysis...",
  "remedies": ["remedy 1", "remedy 2", "remedy 3"],
  "recommendedDoctors": ["exact name from list", "exact name from list"],
  "recommendedProducts": ["exact product name from list", "exact product name from list"]
}

Language: ${lang === 'si' ? 'Sinhala' : lang === 'ta' ? 'Tamil' : 'English'}
Patient Symptom: ${symptom}

AVAILABLE DOCTORS ON PLATFORM:
${providersList || 'No doctors available yet'}

AVAILABLE PRODUCTS ON PLATFORM:
${productsList || 'No products available yet'}

If no matching doctors/products exist for this symptom, return empty arrays. Do not make up names.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');
    const aiData = JSON.parse(jsonMatch[0]);

    // Find matching provider IDs from DB
    const matchedProviders = providersSnap.docs
      .filter(d => {
        const docName = d.data().name;
        if (!docName || typeof docName !== 'string') return false;
        return aiData.recommendedDoctors?.some(name => docName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(docName.toLowerCase()));
      })
      .map(d => ({ id: d.id, ...d.data(), profileDetails: d.data().profileDetails || {} }))
      .slice(0, 3);

    // Find matching product IDs from DB
    const matchedProducts = productsSnap.docs
      .filter(d => {
        const docName = d.data().name;
        if (!docName || typeof docName !== 'string') return false;
        return aiData.recommendedProducts?.some(name => docName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(docName.toLowerCase()));
      })
      .map(d => ({ id: d.id, ...d.data() }))
      .slice(0, 3);

    res.json({
      analysis: aiData.analysis || '',
      remedies: aiData.remedies || [],
      doctors: matchedProviders,
      products: matchedProducts
    });
  } catch (error) {
    console.error('Symptom check error:', error);
    res.status(500).json({ error: 'Failed to analyze symptoms' });
  }
});

// Wishlist - add/remove (toggle)
apiRouter.post('/wishlist/:productId', verifyUser, async (req, res) => {
  const { productId } = req.params;
  try {
    const wishlistRef = db.collection('wishlists').doc(req.user.uid);
    const doc = await wishlistRef.get();
    let items = doc.exists ? (doc.data().items || []) : [];

    const idx = items.indexOf(productId);
    if (idx >= 0) {
      items.splice(idx, 1); // remove
      await wishlistRef.set({ items, updatedAt: new Date().toISOString() });
      res.json({ added: false, items });
    } else {
      items.push(productId); // add
      await wishlistRef.set({ items, updatedAt: new Date().toISOString() });
      res.json({ added: true, items });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's wishlist
apiRouter.get('/wishlist', verifyUser, async (req, res) => {
  try {
    const doc = await db.collection('wishlists').doc(req.user.uid).get();
    const items = doc.exists ? (doc.data().items || []) : [];
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
  
  if (!['user', 'doctor', 'clinic', 'organization', 'vendor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await db.collection('users').doc(uid).set({ role }, { merge: true });
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile details (admin edit expert)
apiRouter.post('/users/:uid/profile', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  const { name, role, status, profileDetails, email } = req.body;
  try {
    const updates = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) {
      if (!['user', 'doctor', 'clinic', 'organization', 'vendor', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }
    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected', 'hidden'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.status = status;
    }
    if (profileDetails !== undefined && typeof profileDetails === 'object') {
      const existing = await db.collection('users').doc(uid).get();
      const prev = existing.exists ? (existing.data().profileDetails || {}) : {};
      updates.profileDetails = { ...prev, ...profileDetails };
    }
    await db.collection('users').doc(uid).set(updates, { merge: true });

    // Keep Auth displayName in sync when name changes
    if (name) {
      try {
        await auth.updateUser(uid, { displayName: name });
      } catch (e) {
        console.warn('Auth displayName update skipped:', e.message);
      }
    }

    res.json({ message: 'Profile updated', email: email || null });
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

// Update appointment status (admin)
apiRouter.post('/appointments/:id/status', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'accepted', 'rejected', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const apptDoc = await db.collection('appointments').doc(id).get();
    if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
    
    await db.collection('appointments').doc(id).update({ status, updatedAt: new Date().toISOString() });
    
    // Send email to customer
    try {
      const apptData = apptDoc.data();
      if (apptData.customerEmail) {
        const statusText = status === 'accepted' ? '✅ Confirmed' : status === 'rejected' ? '❌ Declined' : status;
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: ${status === 'accepted' ? '#2e7d32' : '#c62828'};">Appointment Status Updated by Admin</h2>
            <p>Hello ${apptData.customerName || 'Patient'},</p>
            <p>Your appointment request with <strong>${apptData.providerName}</strong> has been updated to <strong>${status}</strong> by the system administrator.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${apptData.date}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${apptData.time}</p>
            </div>
            <p>Thank you for using Deergayu!</p>
          </div>
        `;
        await sendEmail(apptData.customerEmail, `Appointment Status Updated - Deergayu`, htmlBody);
      }
    } catch (e) {
      console.error('Failed to send email to customer:', e);
    }

    res.json({ message: 'Appointment status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete appointment (admin)
apiRouter.delete('/appointments/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const apptDoc = await db.collection('appointments').doc(id).get();
    if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });
    await db.collection('appointments').doc(id).delete();
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin settings
apiRouter.get('/settings', verifyAdmin, async (req, res) => {
  try {
    res.json(await getSettings(db));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public: product categories + commission rates (for vendor product form)
apiRouter.get('/categories', async (req, res) => {
  try {
    const settings = await getSettings(db);
    res.json({
      categories: settings.categories || DEFAULT_SETTINGS.categories,
      defaultCommissionPercent: settings.commissionPercent || 10,
      minCommissionRs: settings.minCommissionRs || 300,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save admin settings
apiRouter.post('/settings', verifyAdmin, async (req, res) => {
  const {
    commissionPercent,
    bookingCommissionPercent,
    minCommissionRs,
    autoApproveExperts,
    autoApproveProducts,
    adminEmails,
    categories,
  } = req.body;
  try {
    const payload = {
      updatedAt: new Date().toISOString(),
    };
    if (commissionPercent !== undefined) payload.commissionPercent = Number(commissionPercent) || 10;
    if (bookingCommissionPercent !== undefined) payload.bookingCommissionPercent = Number(bookingCommissionPercent) || 10;
    if (minCommissionRs !== undefined) payload.minCommissionRs = Number(minCommissionRs) || 300;
    if (autoApproveExperts !== undefined) payload.autoApproveExperts = !!autoApproveExperts;
    if (autoApproveProducts !== undefined) payload.autoApproveProducts = !!autoApproveProducts;
    if (Array.isArray(adminEmails)) payload.adminEmails = adminEmails.filter(Boolean);
    if (Array.isArray(categories)) payload.categories = categories;

    await db.collection('settings').doc('admin').set(payload, { merge: true });
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: broadcast email to customers, doctors, vendors, or all
apiRouter.post('/admin/broadcast', verifyAdmin, async (req, res) => {
  const { subject, message, audience } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'subject and message are required' });
  }

  const roleMap = {
    all: null,
    customers: ['user'],
    experts: ['doctor', 'clinic', 'organization', 'vendor'],
    vendors: ['vendor'],
    doctors: ['doctor', 'clinic', 'organization'],
  };
  const targetRoles = roleMap[audience] ?? roleMap.all;

  try {
    const snap = await db.collection('users').get();
    let recipients = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.email && u.status !== 'rejected');

    if (targetRoles) {
      recipients = recipients.filter((u) => targetRoles.includes(u.role));
    }

    let sent = 0;
    for (const user of recipients) {
      const personalizedHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2e7d32;">Deergayu Platform</h2>
          <p>Hello <strong>${user.name || 'there'}</strong>,</p>
          <div style="white-space: pre-wrap; font-size: 16px; color: #333; line-height: 1.6;">${message}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">Deergayu &copy; ${new Date().getFullYear()}</p>
        </div>
      `;
      const ok = await sendEmail(user.email, subject, message, personalizedHtml);
      if (ok) sent++;
    }

    res.json({ message: `Broadcast sent to ${sent} of ${recipients.length} recipients`, sent, total: recipients.length });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Admin: full profile view (everything about a user/vendor/doctor)
apiRouter.get('/admin/users/:uid/profile', verifyAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const userData = { id: uid, ...userDoc.data() };

    const [productsSnap, ordersSnap, customerOrdersSnap, apptsAsProvider, apptsAsCustomer, reviewsSnap] =
      await Promise.all([
        db.collection('products').where('vendorId', '==', uid).get(),
        db.collection('orders').where('vendorId', '==', uid).get(),
        db.collection('orders').where('customerId', '==', uid).get(),
        db.collection('appointments').where('providerId', '==', uid).get(),
        db.collection('appointments').where('customerId', '==', uid).get(),
        db.collection('users').doc(uid).collection('reviews').get(),
      ]);

    const vendorOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const delivered = vendorOrders.filter((o) => o.status === 'delivered');
    const totalSales = delivered.reduce((s, o) => s + Number(o.totalPrice || 0), 0);
    const vendorEarnings = delivered.reduce((s, o) => s + Number(o.vendorEarnings ?? o.totalPrice * 0.9), 0);
    const platformFees = delivered.reduce((s, o) => s + Number(o.platformFee ?? o.totalPrice * 0.1), 0);

    res.json({
      user: userData,
      products: productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      vendorOrders,
      customerOrders: customerOrdersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      appointmentsAsProvider: apptsAsProvider.docs.map((d) => ({ id: d.id, ...d.data() })),
      appointmentsAsCustomer: apptsAsCustomer.docs.map((d) => ({ id: d.id, ...d.data() })),
      reviews: reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      stats: {
        totalSales,
        vendorEarnings,
        platformFees,
        productCount: productsSnap.size,
        orderCount: vendorOrders.length,
        appointmentCount: apptsAsProvider.size,
      },
    });
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
  const { name, description, category, imageUrl, images, stock } = req.body;
  const basePrice = Number(req.body.basePrice ?? req.body.price);

  if (!name || !basePrice) {
    return res.status(400).json({ error: 'Name and base price are required' });
  }

  try {
    const settings = await getSettings(db);
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const vendorName = userDoc.exists ? userDoc.data().name : req.user.email;
    const catCommission = await getCategoryCommission(db, category || 'General');
    const pricing = calcProductPricing(basePrice, catCommission, settings.minCommissionRs);

    const productData = {
      name,
      description: description || '',
      basePrice: pricing.basePrice,
      commissionPercent: pricing.commissionPercent,
      commissionAmount: pricing.commissionAmount,
      price: pricing.price,
      category: category || 'General',
      imageUrl: imageUrl || '',
      images: Array.isArray(images) ? images : (imageUrl ? [imageUrl] : []),
      stock: Number(stock) || 0,
      vendorId: req.user.uid,
      vendorEmail: req.user.email,
      vendorName,
      status: settings.autoApproveProducts ? 'approved' : 'pending',
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('products').add(productData);
    
    // Notify admin about new product pending approval
    const adminProductHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1565c0;">New Product Submitted</h2>
        <p>A vendor has added a new product awaiting approval:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Product:</strong> ${name}</p>
          <p style="margin: 5px 0;"><strong>Price:</strong> Rs. ${pricing.price.toLocaleString()} (Base: Rs. ${pricing.basePrice.toLocaleString()}, Commission: ${pricing.commissionPercent}%)</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${category || 'General'}</p>
          <p style="margin: 5px 0;"><strong>Vendor:</strong> ${vendorName}</p>
          <p style="margin: 5px 0;"><strong>Vendor Email:</strong> ${req.user.email}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Pending Approval</p>
        </div>
        <p><a href="https://deergayu.com/admin">Review in Admin Dashboard</a></p>
      </div>
    `;
    sendAdminEmail(`New Product: ${name} — Pending Approval`, adminProductHtml)
      .catch(e => console.error('Admin new product email error:', e));

    res.status(201).json({ id: docRef.id, ...productData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vendor earnings — net payout only (not customer-facing totals)
apiRouter.get('/vendor/earnings', verifyVendor, async (req, res) => {
  try {
    const [ordersSnap, apptsSnap, settings] = await Promise.all([
      db.collection('orders').where('vendorId', '==', req.user.uid).get(),
      db.collection('appointments').where('providerId', '==', req.user.uid).where('status', '==', 'completed').get(),
      getSettings(db),
    ]);

    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const delivered = orders.filter((o) => o.status === 'delivered');
    const now = new Date();

    const sumEarnings = (list) =>
      list.reduce((s, o) => s + Number(o.vendorEarnings ?? calcOrderEarnings(o.items).vendorEarnings), 0);

    const totalEarnings = sumEarnings(delivered);
    const monthEarnings = sumEarnings(
      delivered.filter((o) => {
        const d = new Date(o.createdAt || 0);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
    );

    const bookingPct = settings.bookingCommissionPercent || 10;
    const bookingEarnings = apptsSnap.docs.reduce((s, d) => {
      const fee = Number(d.data().consultationFee || d.data().fee || 0);
      return s + fee * (1 - bookingPct / 100);
    }, 0);

    res.json({
      totalEarnings: Math.round(totalEarnings),
      monthEarnings: Math.round(monthEarnings),
      bookingEarnings: Math.round(bookingEarnings),
      pendingOrders: orders.filter((o) => ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)).length,
      deliveredOrders: delivered.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reviews — products and providers
apiRouter.get('/reviews/:targetType/:targetId', async (req, res) => {
  const { targetType, targetId } = req.params;
  if (!['product', 'provider'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target type' });
  }
  try {
    const col =
      targetType === 'product'
        ? db.collection('products').doc(targetId).collection('reviews')
        : db.collection('users').doc(targetId).collection('reviews');
    const snap = await col.orderBy('createdAt', 'desc').limit(50).get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => !r.status || r.status === 'published'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/reviews', verifyUser, async (req, res) => {
  const { targetType, targetId, rating, comment } = req.body;
  if (!targetType || !targetId || !rating) {
    return res.status(400).json({ error: 'targetType, targetId, and rating are required' });
  }
  if (!['product', 'provider'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target type' });
  }

  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : req.user.email;
    const reviewData = {
      userId: req.user.uid,
      userName,
      rating: Number(rating),
      comment: comment || '',
      createdAt: new Date().toISOString(),
    };

    const col =
      targetType === 'product'
        ? db.collection('products').doc(targetId).collection('reviews')
        : db.collection('users').doc(targetId).collection('reviews');

    const ref = await col.add(reviewData);
    const aggregates = await updateReviewAggregates(db, targetType === 'product' ? 'product' : 'provider', targetId);

    res.status(201).json({ id: ref.id, ...reviewData, aggregates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: list recent reviews
apiRouter.get('/admin/reviews', verifyAdmin, async (req, res) => {
  try {
    const [productsSnap, usersSnap] = await Promise.all([
      db.collection('products').limit(80).get(),
      db.collection('users').where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor']).limit(80).get(),
    ]);
    const reviews = [];
    for (const docSnap of productsSnap.docs) {
      const rSnap = await docSnap.ref.collection('reviews').orderBy('createdAt', 'desc').limit(5).get();
      rSnap.docs.forEach((r) => reviews.push({
        id: r.id, targetType: 'product', targetId: docSnap.id,
        targetName: docSnap.data().name || docSnap.id, ...r.data(),
      }));
    }
    for (const docSnap of usersSnap.docs) {
      const rSnap = await docSnap.ref.collection('reviews').orderBy('createdAt', 'desc').limit(5).get();
      rSnap.docs.forEach((r) => reviews.push({
        id: r.id, targetType: 'provider', targetId: docSnap.id,
        targetName: docSnap.data().name || docSnap.data().email || docSnap.id, ...r.data(),
      }));
    }
    reviews.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    res.json(reviews.slice(0, 100));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/admin/reviews/:targetType/:targetId/:reviewId/status', verifyAdmin, async (req, res) => {
  const { targetType, targetId, reviewId } = req.params;
  const { status } = req.body;
  if (!['product', 'provider'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target type' });
  }
  if (!['published', 'hidden', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const col =
      targetType === 'product'
        ? db.collection('products').doc(targetId).collection('reviews')
        : db.collection('users').doc(targetId).collection('reviews');
    await col.doc(reviewId).update({ status, moderatedAt: new Date().toISOString() });
    await updateReviewAggregates(db, targetType, targetId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/payments/payhere/hash', verifyUser, async (req, res) => {
  try {
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    if (!merchantId || !merchantSecret) {
      return res.status(503).json({ error: 'PayHere is not configured yet. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.' });
    }
    const { orderId, amount, currency = 'LKR' } = req.body;
    if (!orderId || !amount) return res.status(400).json({ error: 'orderId and amount required' });
    const crypto = require('crypto');
    const amountFormatted = Number(amount).toFixed(2);
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hash = crypto
      .createHash('md5')
      .update(merchantId + orderId + amountFormatted + currency + hashedSecret)
      .digest('hex')
      .toUpperCase();
    res.json({
      merchant_id: merchantId,
      hash,
      sandbox: process.env.PAYHERE_SANDBOX === 'true',
      return_url: process.env.PAYHERE_RETURN_URL || 'https://deergayu.com/my-orders',
      cancel_url: process.env.PAYHERE_CANCEL_URL || 'https://deergayu.com/shop/cart',
      notify_url: process.env.PAYHERE_NOTIFY_URL || 'https://deergayu.com/api/payments/payhere/notify',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/payments/payhere/notify', async (req, res) => {
  console.log('PayHere IPN:', req.body);
  res.status(200).send('OK');
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
  const { productId, name, price, basePrice, quantity, vendorId, vendorName, imageUrl, category } = req.body;
  
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
        basePrice: Number(basePrice ?? price),
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
  const { paymentMethod, deliveryAddress, phone, notes, shippingZoneId } = req.body;
  
  try {
    // Get cart
    const cartDoc = await db.collection('carts').doc(req.user.uid).get();
    if (!cartDoc.exists || !cartDoc.data().items?.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    const items = cartDoc.data().items;
    const settings = await getSettings(db);
    const zones = settings.shippingZones || DEFAULT_SETTINGS.shippingZones;
    const zone = zones.find((z) => z.id === shippingZoneId) || zones[0] || { id: 'island', name: 'Island-wide', fee: 500 };
    const shippingFee = Number(zone.fee) || 0;

    // Enrich cart items with basePrice from product records
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        if (item.basePrice !== undefined) return item;
        if (!item.productId) return item;
        const prod = await db.collection('products').doc(item.productId).get();
        if (!prod.exists) return item;
        return { ...item, basePrice: prod.data().basePrice ?? item.price };
      })
    );
    
    // Get user info
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userName = userDoc.exists ? userDoc.data().name : req.user.email;
    
    // Group items by vendor for separate orders
    const vendorGroups = {};
    enrichedItems.forEach(item => {
      const vid = item.vendorId || 'unknown';
      if (!vendorGroups[vid]) {
        vendorGroups[vid] = { items: [], vendorName: item.vendorName || 'Unknown Vendor' };
      }
      vendorGroups[vid].items.push(item);
    });
    
    const orderIds = [];
    const vendorIds = Object.keys(vendorGroups);
    // Split shipping across vendor orders (first order carries full fee for simplicity)
    let shippingAssigned = false;
    
    // Create an order per vendor
    for (const [vendorId, group] of Object.entries(vendorGroups)) {
      const itemsTotal = group.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderShipping = !shippingAssigned ? shippingFee : 0;
      shippingAssigned = true;
      const totalPrice = itemsTotal + orderShipping;
      const { vendorEarnings, platformFee } = calcOrderEarnings(group.items);
      
      const orderData = {
        customerId: req.user.uid,
        customerName: userName,
        customerEmail: req.user.email,
        vendorId,
        vendorName: group.vendorName,
        items: group.items,
        itemsTotal,
        shippingFee: orderShipping,
        shippingZone: zone,
        totalPrice,
        vendorEarnings: Math.round(vendorEarnings),
        platformFee: Math.round(platformFee),
        status: paymentMethod === 'payhere' ? 'awaiting_payment' : 'pending',
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
      const allItemsHtml = enrichedItems.map(i => `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px">x${i.quantity}</td><td style="padding:6px 12px">Rs. ${(i.price * i.quantity).toLocaleString()}</td></tr>`).join('');
      const grandTotal = enrichedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
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

      const adminOrderHtml = `<div style="font-family:Arial,sans-serif;padding:20px;color:#333">
        <h2 style="color:#1565c0">New Order Placed</h2>
        <p><strong>Customer:</strong> ${userName} (${req.user.email})</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Order Ref:</strong> ${orderIds.map(id => id.slice(-8).toUpperCase()).join(', ')}</p>
        <p><strong>Total:</strong> Rs. ${grandTotal.toLocaleString()}</p>
        <p><strong>Payment:</strong> ${paymentMethod}</p>
        <p><strong>Delivery:</strong> ${deliveryAddress}</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <thead><tr style="background:#f5f5f5"><th style="padding:6px 12px;text-align:left">Item</th><th style="padding:6px 12px">Qty</th><th style="padding:6px 12px">Price</th></tr></thead>
          <tbody>${allItemsHtml}</tbody>
        </table>
        <p><a href="https://deergayu.com/admin">View in Admin Dashboard</a></p>
      </div>`;
      sendAdminEmail(`New Order: Rs. ${grandTotal.toLocaleString()} — ${userName}`, adminOrderHtml)
        .catch(e => console.error('Admin order email error:', e));
    } catch(emailErr) { console.error('Customer email prep error:', emailErr); }
    
    // Clear cart
    await db.collection('carts').doc(req.user.uid).set({ items: [], updatedAt: new Date().toISOString() });
    
    res.json({
      message: 'Order placed successfully',
      orderIds,
      shippingFee,
      shippingZone: zone,
      payhereReady: paymentMethod === 'payhere',
    });
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
  const { providerId, providerName, date, time, notes, consultationType } = req.body;
  
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
      consultationType: consultationType === 'video' ? 'video' : 'in_person',
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
// AI Chatbot Route (Gemini with Rule-based fallback)
// ============================================================
function getAyurvedicFallback(message, lang) {
  const msg = (message || '').toLowerCase();
  
  const remedies = {
    english: {
      cough: "For cough and cold, try drinking warm ginger tea with honey 2-3 times a day. You can also inhale steam with eucalyptus oil or take a teaspoon of turmeric mixed with warm milk.",
      fever: "For mild fever, drink coriander seed tea (dhania) or pathpadagam. Ensure you rest and stay hydrated. If fever exceeds 101°F, please consult a doctor via our 'Channeling' page.",
      headache: "For headache, apply a paste of ginger powder and water to your forehead. Resting in a quiet, dark room and drinking warm herbal tea also helps.",
      stomach: "For stomach ache or indigestion, try drinking warm water with a pinch of roasted cumin (jeera) and fennel seeds (saunf). Avoid heavy foods.",
      joint: "For joint pain, gently massage the area with warm sesame oil or Mahanarayana oil. Apply a warm compress afterwards.",
      skin: "For minor skin irritations or rash, apply fresh Aloe Vera gel or a paste of neem leaves and turmeric to the affected area.",
      stress: "For stress and anxiety, drink warm chamomile or ashwagandha tea before bedtime. Practice deep breathing (Pranayama) for 10 minutes daily.",
      default: "Ayubowan! I am AyurBot. I recommend maintaining a balanced diet with warm, freshly cooked meals. Please let me know your symptoms (e.g., cough, headache, fever) so I can suggest a specific Ayurvedic remedy, or consult a professional via our 'Channeling' page."
    },
    sinhala: {
      cough: "කැස්ස සහ සෙම්ප්‍රතිශ්‍යාව සඳහා, මී පැණි සමඟ ඉඟුරු තේ දිනකට 2-3 වතාවක් පානය කරන්න. කොහොඹ කොළ තම්බා හුමාලය ඇල්ලීමද ඉතා සුදුසුය.",
      fever: "සුළු උණ තත්ත්වයන් සඳහා, කොත්තමල්ලි සහ වෙනිවැල්ගැට තම්බා පානය කරන්න. හොඳින් විවේක ගන්න. උණ දිගටම පවතී නම්, කරුණාකර අපගේ 'Channeling' පිටුව හරහා වෛද්‍යවරයකු හමුවන්න.",
      headache: "හිසරදය සඳහා, ඉඟුරු කුඩු ස්වල්පයක් වතුරෙන් අනා නළලෙහි ආලේප කරන්න. නිශ්ශබ්ද කාමරයක විවේක ගැනීමද උපකාරී වේ.",
      stomach: "බඩේ කැක්කුම හෝ අජීර්ණය සඳහා, බැදපු සූදුරු සහ මහදුරු දැමූ උණුසුම් ජලය පානය කරන්න. බර ආහාර ගැනීමෙන් වළකින්න.",
      joint: "හන්දිපත් රුදාව සඳහා, උණුසුම් තල තෙල් හෝ මහානාරායන තෙල් ගල්වා මෘදුව සම්බාහනය කරන්න. පසුව මඳ උණුසුම් වතුරෙන් තවන්න.",
      skin: "සමේ පළු දැමීම හෝ සුළු කැසීම් සඳහා, කෝමාරිකා සාරය හෝ කොහොඹ කොළ සහ කහ මිශ්‍ර ආලේපය ගල්වන්න.",
      stress: "මානසික ආතතිය සහ නින්ද නොයාම සඳහා, නින්දට පෙර අශ්වගන්ධ තේ පානය කරන්න. දිනපතා විනාඩි 10ක් ප්‍රාණයාම ශ්වසන අභ්‍යාස කරන්න.",
      default: "ආයුබෝවන්! මම AyurBot. සමබර ආහාර වේලක් ලබා ගැනීමටත්, උණුසුම්ව පිළියෙළ කළ නැවුම් ආහාර ගැනීමටත් උත්සාහ කරන්න. ඔබේ රෝග ලක්ෂණ (කැස්ස, හිසරදය, උණ ආදී) පවසන්න, එවිට මට නිවැරදි අත් බෙහෙත් යෝජනා කළ හැක."
    },
    ta: {
      cough: "இருமல் மற்றும் சளிக்கு, இஞ்சி தேநீரில் தேன் கலந்து குடிக்கவும். யூக்கலிப்டஸ் எண்ணெய் சேர்த்து ஆவி பிடிக்கலாம்.",
      fever: "லேசான காய்ச்சலுக்கு, கொத்தமல்லி அல்லது துளசி தேநீர் குடிக்கவும். காய்ச்சல் நீடித்தால், தயவுசெய்து எங்களது Channeling பக்கத்தின் மூலம் மருத்துவரை அணுகவும்.",
      headache: "தலைவலிக்கு, இஞ்சிப் பொடியை தண்ணீரில் குழைத்து நெற்றியில் பற்று போடவும். அமைதியான அறையில் ஓய்வெடுக்கவும்.",
      stomach: "வயிற்று வலிக்கு, வறுத்த சீரகம் மற்றும் பெருஞ்சீரகம் கலந்த வெதுவெதுப்பான நீரைக் குடிக்கவும். கனமான உணவுகளைத் தவிர்க்கவும்.",
      joint: "மூட்டு வலிக்கு, வெதுவெதுப்பான நல்லெண்ணெய் அல்லது மகாநாராயண எண்ணெய் கொண்டு மசாஜ் செய்யவும்.",
      skin: "சரும அரிப்புகளுக்கு, கற்றாழை ஜெல் அல்லது வேப்பிலை மற்றும் மஞ்சள் விழுதை தடவவும்.",
      stress: "மன அழுத்தத்திற்கு, அஸ்வகந்தா தேநீர் அருந்தவும் மற்றும் தியானம் செய்யவும்.",
      default: "வணக்கம்! நான் ஆயுர்பாட். உங்கள் அறிகுறிகளைக் குறிப்பிடுங்கள் (இருமல், தலைவலி, காய்ச்சல் போன்றவை), நான் அதற்கான ஆயுர்வேத வீட்டு வைத்தியத்தை பரிந்துரைக்கிறேன்."
    }
  };

  const currentRemedies = remedies[lang] || remedies.english;
  
  if (msg.includes('cough') || msg.includes('cold') || msg.includes('flu') || msg.includes('කැස්ස') || msg.includes('සෙම') || msg.includes('இருமல்') || msg.includes('சளி')) {
    return currentRemedies.cough;
  }
  if (msg.includes('fever') || msg.includes('temperature') || msg.includes('උණ') || msg.includes('කாய்ச்சල්')) {
    return currentRemedies.fever;
  }
  if (msg.includes('head') || msg.includes('headache') || msg.includes('හිස') || msg.includes('හිසරදය') || msg.includes('தலைவலி')) {
    return currentRemedies.headache;
  }
  if (msg.includes('stomach') || msg.includes('belly') || msg.includes('indigestion') || msg.includes('බඩ') || msg.includes('අජීර්ණ') || msg.includes('வயிற்று')) {
    return currentRemedies.stomach;
  }
  if (msg.includes('joint') || msg.includes('knee') || msg.includes('pain') || msg.includes('රුදාව') || msg.includes('කැක්කුම') || msg.includes('வலி')) {
    return currentRemedies.joint;
  }
  if (msg.includes('skin') || msg.includes('rash') || msg.includes('itch') || msg.includes('සම') || msg.includes('කැසීම') || msg.includes('அரிப்பு')) {
    return currentRemedies.skin;
  }
  if (msg.includes('stress') || msg.includes('sleep') || msg.includes('anxiety') || msg.includes('ආතතිය') || msg.includes('නින්ද') || msg.includes('தூக்கம்')) {
    return currentRemedies.stress;
  }

  return currentRemedies.default;
}

// --- VIDEOS ---
apiRouter.get('/videos', async (req, res) => {
  try {
    const snapshot = await db.collection('videos').orderBy('createdAt', 'desc').get();
    const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

apiRouter.post('/videos', verifyAdmin, async (req, res) => {
  try {
    const { title, description, youtubeId, category, duration } = req.body;
    if (!title || !youtubeId) return res.status(400).json({ error: 'Title and YouTube ID are required' });
    const newVideo = {
      title, description, youtubeId, category, duration,
      createdAt: new Date().toISOString()
    };
    const docRef = await db.collection('videos').add(newVideo);
    res.status(201).json({ id: docRef.id, ...newVideo });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

apiRouter.put('/videos/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, youtubeId, category, duration } = req.body;
    await db.collection('videos').doc(id).update({
      title, description, youtubeId, category, duration,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

apiRouter.delete('/videos/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('videos').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

apiRouter.post('/astrology', async (req, res) => {
  try {
    const data = req.body;
    data.createdAt = new Date().toISOString();
    const docRef = await db.collection('astrology_requests').add(data);
    res.json({ id: docRef.id, message: 'Astrology request saved successfully' });
  } catch (error) {
    console.error('Error saving astrology request:', error);
    res.status(500).json({ error: 'Failed to save request' });
  }
});

apiRouter.post('/chat', async (req, res) => {
  try {
    const { message, lang } = req.body;
    let replyText = "";

    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith("AIzaSy")) {
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
        replyText = response.text();
      } else {
        throw new Error("Gemini API Key is missing or invalid format.");
      }
    } catch (apiError) {
      console.warn("Gemini API call failed. Using rule-based fallback:", apiError.message);
      replyText = getAyurvedicFallback(message, lang);
    }

    res.json({ reply: replyText });
  } catch (error) {
    console.error("AI Chat Route error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// ============================================================
// MOUNT & START
// ============================================================

// Configure multer storage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed'));
  },
});

// Serve uploaded files — explicit route works reliably on cPanel/Passenger
function serveUploadFile(req, res) {
  const filename = path.basename(req.params.filename || '');
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  return res.sendFile(filePath);
}

app.use('/uploads', express.static(uploadDir));
app.get('/uploads/:filename', serveUploadFile);
app.get('/api/uploads/:filename', serveUploadFile);
apiRouter.get('/uploads/:filename', serveUploadFile);
apiRouter.use('/uploads', express.static(uploadDir));

function publicUploadUrl(req, filename) {
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host');
  const prefix = (process.env.PUBLIC_API_PREFIX || '/api').replace(/\/$/, '');
  return `${proto}://${host}${prefix}/uploads/${filename}`;
}

// Add file upload API endpoint
apiRouter.post('/upload', verifyUser, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5MB' : (err.message || 'Upload failed');
      return res.status(400).json({ error: msg });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const relativePath = `/uploads/${req.file.filename}`;
      const url = publicUploadUrl(req, req.file.filename);
      res.json({ url, path: relativePath });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });
});

// --- AYURVEDIC GUIDE ---
const mapGuideDocs = (snapshot) => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

const filterPublishedGuide = (items) =>
  items.filter(item => !item.status || item.status === 'published');

const isGuideAdmin = async (req) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return false;
  try {
    const decoded = await auth.verifyIdToken(token);
    return isAdminUser(db, decoded);
  } catch {
    return false;
  }
};

apiRouter.get('/guide/remedies', async (req, res) => {
  try {
    const snapshot = await db.collection('herbal_remedies').get();
    let remedies = mapGuideDocs(snapshot);
    const admin = await isGuideAdmin(req);
    if (!admin) remedies = filterPublishedGuide(remedies);
    remedies.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(remedies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/guide/routines', async (req, res) => {
  try {
    const snapshot = await db.collection('daily_routines').get();
    let routines = mapGuideDocs(snapshot);
    const admin = await isGuideAdmin(req);
    if (!admin) routines = filterPublishedGuide(routines);
    routines.sort((a, b) => {
      if ((a.condition || 'general') !== (b.condition || 'general')) {
        return (a.condition || 'general').localeCompare(b.condition || 'general');
      }
      return (a.order || 0) - (b.order || 0);
    });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/guide/seed', verifyAdmin, async (req, res) => {
  try {
    const remedies = [
      {
        image: 'https://images.unsplash.com/photo-1596541223130-5d564415f0d4?auto=format&fit=crop&q=80&w=400',
        category: 'cold_immunity', order: 1, status: 'published',
        en: { name: 'Paspanguwa', ingredients: 'Coriander, Ginger, Pathpadagam, Katuwelbatu, Veniwelgeta', uses: 'Common cold, fever, body aches, and boosting immunity.', preparation: 'Boil all 5 ingredients in 4 cups of water until it reduces to 1 cup. Drink warm, optionally with jaggery.' },
        si: { name: 'පස්පංගුව', ingredients: 'කොත්තමල්ලි, ඉඟුරු, පත්පාඩගම්, කටුවැල්බටු, වෙනිවැල්ගැට', uses: 'සෙම්ප්‍රතිශ්‍යාව, උණ, ඇඟපත වේදනාව සහ ප්‍රතිශක්තිය වැඩි කිරීමට.', preparation: 'මේ ඖෂධ 5ම වතුර කෝප්ප 4ක් දමා කෝප්ප 1කට සිඳෙන්නට හැර උණුවෙන්ම බොන්න.' },
        ta: { name: 'பஸ்பங்குவ', ingredients: 'கொத்தமல்லி, இஞ்சி, பத்பாடகம், கட்டுவெல்படு, வெனிவெல்கெட', uses: 'ஜலதோஷம், காய்ச்சல், உடல் வலி மற்றும் நோய் எதிர்ப்பு சக்தியை அதிகரிக்கும்.', preparation: 'இந்த 5 பொருட்களையும் 4 கப் தண்ணீரில் 1 கப்பாக குறையும் வரை கொதிக்க வைக்கவும். சூடாக குடிக்கவும்.' }
      },
      {
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400',
        category: 'fever', order: 2, status: 'published',
        en: { name: 'Koththamalli', ingredients: 'Coriander seeds, Ginger (optional)', uses: 'Mild fever, sore throat, indigestion, and as a cooling drink.', preparation: 'Roast coriander seeds lightly, crush them, and boil with water. Strain and drink warm.' },
        si: { name: 'කොත්තමල්ලි', ingredients: 'කොත්තමල්ලි ඇට, ඉඟුරු', uses: 'සුළු උණ, උගුරේ අමාරුව, ආහාර අරුචිය සහ ඇඟ නිවීමට.', preparation: 'කොත්තමල්ලි ඇට මද ගින්නේ බැද, තලා වතුරෙන් තම්බා පෙරා උණුවෙන් බොන්න.' },
        ta: { name: 'கொத்தமல்லி', ingredients: 'கொத்தமல்லி விதைகள், இஞ்சி', uses: 'லேசான காய்ச்சல், தொண்டை வலி, மற்றும் உடலை குளிர்விக்க.', preparation: 'கொத்தமல்லி விதைகளை லேசாக வறுத்து, தண்ணீரில் கொதிக்க வைத்து வடிகட்டி சூடாக குடிக்கவும்.' }
      },
      {
        image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=400',
        category: 'pain_inflammation', order: 3, status: 'published',
        en: { name: 'Veniwelgeta', ingredients: 'Yellow Vine (Coscinium fenestratum)', uses: 'Pain relief, reducing inflammation, wound healing.', preparation: 'Boil the dried stems in water for 15-20 minutes. Drink the bitter decoction.' },
        si: { name: 'වෙනිවැල්ගැට', ingredients: 'වෙනිවැල්ගැට', uses: 'වේදනා නාශකයක් ලෙස, ඉදිමුම් අඩු කිරීමට සහ තුවාල සුව කිරීමට.', preparation: 'වියළි වෙනිවැල්ගැට කැබලි විනාඩි 15-20ක් පමණ තම්බා එහි තිත්ත කසාය පානය කරන්න.' },
        ta: { name: 'வெனிவெல்கெட', ingredients: 'வெனிவெல்கெட', uses: 'வலி நிவாரணி, வீக்கத்தை குறைத்தல், காயங்களை ஆற்றுதல்.', preparation: 'காய்ந்த வெனிவெல்கெட துண்டுகளை 15-20 நிமிடங்கள் தண்ணீரில் கொதிக்க வைத்து கசப்பான கஷாயத்தை குடிக்கவும்.' }
      },
      {
        image: 'https://images.unsplash.com/photo-1589363460779-cb495392ee5a?auto=format&fit=crop&q=80&w=400',
        category: 'skin_blood', order: 4, status: 'published',
        en: { name: 'Iramusu', ingredients: 'Indian Sarsaparilla (Hemidesmus indicus)', uses: 'Purifying blood, cooling the body, improving skin complexion.', preparation: 'Boil the dried roots in water and drink as a regular tea.' },
        si: { name: 'ඉරමුසු', ingredients: 'ඉරමුසු', uses: 'රුධිරය පිරිසිදු කිරීමට, ශරීරය සිසිල් කිරීමට සහ සම පැහැපත් කිරීමට.', preparation: 'වියළි ඉරමුසු මුල් තම්බා සාමාන්‍ය තේ පානයක් ලෙස බොන්න.' },
        ta: { name: 'இரமுசு', ingredients: 'நன்னாரி (இரமுசு)', uses: 'இரத்தத்தை சுத்திகரித்தல், உடலை குளிர்வித்தல், சருமத்தை மேம்படுத்துதல்.', preparation: 'காய்ந்த வேர்களை தண்ணீரில் கொதிக்க வைத்து தேநீர் போல குடிக்கவும்.' }
      },
      {
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400',
        category: 'memory', order: 5, status: 'published',
        en: { name: 'Gotukola Kenda', ingredients: 'Gotukola leaves, Red rice, Coconut milk, Garlic, Ginger', uses: 'Enhancing memory, improving eyesight, and nourishing the body.', preparation: 'Blend Gotukola leaves, extract juice, and cook with boiled red rice gruel and coconut milk.' },
        si: { name: 'ගොටුකොළ කැඳ', ingredients: 'ගොටුකොළ, රතු කැකුළු සහල්, පොල් කිරි, සුදුළූණු, ඉඟුරු', uses: 'මතක ශක්තිය වැඩි කිරීමට, ඇස් පෙනීම වර්ධනයට සහ ශරීරය පෝෂණය කිරීමට.', preparation: 'ගොටුකොළ කොටා යුෂ ගෙන, තම්බාගත් රතු කැකුළු සහල් සහ පොල් කිරි සමඟ මිශ්‍ර කර උයාගන්න.' },
        ta: { name: 'வல்லாரை கஞ்சி', ingredients: 'வல்லாரை இலைகள், சிவப்பு அரிசி, தேங்காய் பால், பூண்டு, இஞ்சி', uses: 'நினைவாற்றலை அதிகரித்தல், கண்பார்வையை மேம்படுத்துதல், உடலை போஷித்தல்.', preparation: 'வல்லாரை இலைகளை அரைத்து சாறு எடுத்து, சமைத்த சிவப்பு அரிசி மற்றும் தேங்காய் பாலுடன் கலக்கவும்.' }
      },
      {
        image: 'https://images.unsplash.com/photo-1606579294215-64bc63bba2c2?auto=format&fit=crop&q=80&w=400',
        category: 'diabetes', order: 6, status: 'published',
        en: { name: 'Karapincha', ingredients: 'Curry leaves', uses: 'Lowering cholesterol, improving digestion, and controlling diabetes.', preparation: 'Extract juice from fresh leaves and mix with a little lime and salt, or consume as a gruel.' },
        si: { name: 'කරපිංචා', ingredients: 'කරපිංචා කොළ', uses: 'කොලෙස්ටරෝල් අඩු කිරීමට, දිරවීම පහසු කිරීමට සහ දියවැඩියාව පාලනයට.', preparation: 'නැවුම් කොළ කොටා යුෂ ගෙන දෙහි සහ ලුණු ස්වල්පයක් සමඟ පානය කරන්න.' },
        ta: { name: 'கறிவேப்பிலை', ingredients: 'கறிவேப்பிலை', uses: 'கொலஸ்ட்ராலைக் குறைத்தல், செரிமானத்தை மேம்படுத்துதல், நீரிழிவு நோயைக் கட்டுப்படுத்துதல்.', preparation: 'புதிய இலைகளிலிருந்து சாறு எடுத்து சிறிதளவு எலுமிச்சை மற்றும் உப்புடன் கலந்து குடிக்கவும்.' }
      }
    ];

    const routines = [
      { condition: 'general', order: 1, icon: 'Sun', status: 'published', en: { time: '5:00 AM - 6:00 AM', title: 'Brahma Muhurta (Wake Up)', description: 'Wake up 1.5 hours before sunrise. Ideal for spiritual practices.', tips: 'Gently stretch in bed | Express gratitude | Avoid checking your phone immediately' }, si: { time: 'පෙ.ව. 5:00 - 6:00', title: 'බ්‍රහ්ම මුහුර්තය', description: 'හිරු උදාවට පැය 1.5කට පෙර අවදි වන්න.', tips: 'ඇඳේ සිටම ඇඟ මැලි කඩන්න | ස්වභාවධර්මයට ස්තූති කරන්න | දුරකථනය බැලීමෙන් වළකින්න' }, ta: { time: 'காலை 5:00 - 6:00', title: 'பிரம்மா முஹூர்த்தம்', description: 'சூரிய உதயத்திற்கு 1.5 மணி நேரத்திற்கு முன்பு எழுந்திருங்கள்.', tips: 'படுக்கையில் மெதுவாக நீட்டவும் | இயற்கைக்கு நன்றி தெரிவிக்கவும் | தொலைபேசியைத் தவிர்க்கவும்' } },
      { condition: 'general', order: 2, icon: 'Droplet', status: 'published', en: { time: '6:00 AM - 6:30 AM', title: 'Purification & Cleansing', description: 'Cleanse the senses. Wash your face, scrape your tongue, and drink warm water.', tips: 'Use a copper tongue scraper | Drink warm lemon water | Brush teeth with herbal toothpaste' }, si: { time: 'පෙ.ව. 6:00 - 6:30', title: 'පිරිසිදු වීම', description: 'මුහුණ සෝදා, දිව මැද විස ඉවත් කරගන්න.', tips: 'තඹ දිව මදින උපකරණය | උණුසුම් දෙහි වතුර | ඖෂධීය දන්තාලේප' }, ta: { time: 'காலை 6:00 - 6:30', title: 'சுத்திகரிப்பு', description: 'முகம் கழுவி, நாக்கை சுத்தம் செய்து வெதுவெதுப்பான நீர் குடிக்கவும்.', tips: 'செம்பு நாக்கு வழிப்பான் | எலுமிச்சை நீர் | மூலிகை பற்பசை' } },
      { condition: 'general', order: 3, icon: 'Activity', status: 'published', en: { time: '6:30 AM - 7:30 AM', title: 'Movement & Meditation', description: 'Gentle exercise like Yoga, followed by breathwork and meditation.', tips: 'Sun salutations | 10-15 minutes of meditation | Abhyanga (self-massage)' }, si: { time: 'පෙ.ව. 6:30 - 7:30', title: 'ව්‍යායාම සහ භාවනා', description: 'යෝගා වැනි සැහැල්ලු ව්‍යායාම.', tips: 'සූර්ය නමස්කාරය | විනාඩි 10-15ක භාවනාව | අභ්‍යංග' }, ta: { time: 'காலை 6:30 - 7:30', title: 'உடற்பயிற்சி & தியானம்', description: 'யோகா போன்ற மென்மையான உடற்பயிற்சி.', tips: 'சூரிய நமஸ்காரம் | 15 நிமிட தியானம் | அப்யங்கா' } },
      { condition: 'diabetes', order: 1, icon: 'Coffee', status: 'published', en: { time: '6:30 AM', title: 'Morning Drink', description: 'Start your day with a drink to regulate blood sugar levels.', tips: 'Kothalahimbutu tea | Bitter gourd juice | Avoid sugar' }, si: { time: 'පෙ.ව. 6:30', title: 'උදෑසන පානය', description: 'රුධිරයේ සීනි මට්ටම පාලනය කිරීමට සුදුසු පානයකින් දවස අරඹන්න.', tips: 'කොතලහිඹුටු තේ | කරවිල යුෂ | සීනි භාවිතයෙන් වළකින්න' }, ta: { time: 'காலை 6:30', title: 'காலை பானம்', description: 'இரத்த சர்க்கரை அளவை கட்டுப்படுத்தும் பானத்துடன் நாளைத் தொடங்குங்கள்.', tips: 'கொத்தலஹிம்புடு தேநீர் | பாகற்காய் சாறு | சர்க்கரையைத் தவிர்க்கவும்' } },
      { condition: 'hypertension', order: 1, icon: 'Activity', status: 'published', en: { time: '7:00 AM', title: 'Calming Yoga', description: 'Gentle yoga and breathing to reduce stress and lower blood pressure.', tips: 'Pranayama | Avoid rigorous cardio | Meditate for 15 minutes' }, si: { time: 'පෙ.ව. 7:00', title: 'සැහැල්ලු යෝගා', description: 'මානසික ආතතිය සහ රුධිර පීඩනය අඩු කිරීම.', tips: 'ප්‍රාණයාම | වෙහෙසකර ව්‍යායාම වලින් වළකින්න | විනාඩි 15ක භාවනාව' }, ta: { time: 'காலை 7:00', title: 'அமைதியான யோகா', description: 'மன அழுத்தம் மற்றும் இரத்த அழுத்தத்தைக் குறைக்க.', tips: 'பிராணயாமா | கடுமையான பயிற்சிகளைத் தவிர்க்கவும் | 15 நிமிடம் தியானம்' } }
    ];

    const batch = db.batch();
    (await db.collection('herbal_remedies').get()).docs.forEach(doc => batch.delete(doc.ref));
    (await db.collection('daily_routines').get()).docs.forEach(doc => batch.delete(doc.ref));
    remedies.forEach(r => batch.set(db.collection('herbal_remedies').doc(), { ...r, createdAt: FieldValue.serverTimestamp() }));
    routines.forEach(r => batch.set(db.collection('daily_routines').doc(), { ...r, createdAt: FieldValue.serverTimestamp() }));
    await batch.commit();
    res.json({ success: true, message: 'Guide content seeded successfully', counts: { remedies: remedies.length, routines: routines.length } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/guide/remedies', verifyAdmin, async (req, res) => {
  try {
    const remedy = { ...req.body, status: req.body.status || 'published', order: Number(req.body.order) || 0, createdAt: FieldValue.serverTimestamp(), updatedAt: new Date().toISOString() };
    const docRef = await db.collection('herbal_remedies').add(remedy);
    res.status(201).json({ id: docRef.id, ...remedy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/guide/remedies/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body, updatedAt: new Date().toISOString() };
    delete update.id;
    await db.collection('herbal_remedies').doc(id).update(update);
    res.json({ id, ...update });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/guide/remedies/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('herbal_remedies').doc(req.params.id).delete();
    res.json({ message: 'Remedy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/guide/routines', verifyAdmin, async (req, res) => {
  try {
    const routine = { ...req.body, status: req.body.status || 'published', order: Number(req.body.order) || 1, createdAt: FieldValue.serverTimestamp(), updatedAt: new Date().toISOString() };
    const docRef = await db.collection('daily_routines').add(routine);
    res.status(201).json({ id: docRef.id, ...routine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/guide/routines/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body, updatedAt: new Date().toISOString() };
    delete update.id;
    await db.collection('daily_routines').doc(id).update(update);
    res.json({ id, ...update });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/guide/routines/:id', verifyAdmin, async (req, res) => {
  try {
    await db.collection('daily_routines').doc(req.params.id).delete();
    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api', apiRouter);
// Duplicate unauthenticated guide endpoints removed (use apiRouter + verifyAdmin).

// Test Endpoint
app.get('/api/test', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

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
