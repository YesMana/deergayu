import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LanguagePopup from './components/Common/LanguagePopup';
import AyurBot from './components/AI/AyurBot';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorBoundary from './components/Common/ErrorBoundary';

import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import './App.css';

// Lazy load pages for Code Splitting
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Channeling = lazy(() => import('./pages/Channeling'));
const AyurvedicGuide = lazy(() => import('./pages/AyurvedicGuide'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const VendorDashboard = lazy(() => import('./pages/VendorDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Cart = lazy(() => import('./pages/Cart'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const MyAppointments = lazy(() => import('./pages/MyAppointments'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Videos = lazy(() => import('./pages/Videos'));
const Astrology = lazy(() => import('./pages/Astrology'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const Contact = lazy(() => import('./pages/Contact'));

const Contact = lazy(() => import('./pages/Contact'));
const MobileAuth = lazy(() => import('./pages/MobileAuth'));

function AppShell() {
  const location = useLocation();
  const bare = location.pathname === '/mobile-auth';

  return (
    <div className="app-container">
      {!bare && <LanguagePopup />}
      {!bare && <Navbar />}
      {!bare && <AyurBot />}
      <main>
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner"></div></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/channeling" element={<Channeling />} />
            <Route path="/ayurvedic-guide" element={<AyurvedicGuide />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/astrology" element={<Astrology />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mobile-auth" element={<MobileAuth />} />

            {/* Protected User Routes */}
            <Route element={<ProtectedRoute requiredRole={['user', 'admin', 'vendor', 'doctor', 'clinic', 'organization']} />}>
              <Route path="/shop/cart" element={<Cart />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/my-appointments" element={<MyAppointments />} />
              <Route path="/my-account" element={<CustomerDashboard />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>

            {/* Protected Vendor Routes */}
            <Route element={<ProtectedRoute requiredRole={['vendor', 'doctor', 'clinic', 'organization']} />}>
              <Route path="/vendor/*" element={<VendorDashboard />} />
            </Route>

            {/* 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <LanguageProvider>
              <Router>
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
              </Router>
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
