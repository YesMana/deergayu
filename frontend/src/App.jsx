import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Channeling from './pages/Channeling';
import SymptomChecker from './pages/SymptomChecker';
import AdminDashboard from './pages/AdminDashboard';
import VendorDashboard from './pages/VendorDashboard';
import Login from './pages/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LanguagePopup from './components/Common/LanguagePopup';
import AyurBot from './components/AI/AyurBot';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <Router>
          <div className="app-container">
            <LanguagePopup />
            <Navbar />
            <AyurBot />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/channeling" element={<Channeling />} />
                <Route path="/symptom-checker" element={<SymptomChecker />} />
                <Route path="/login" element={<Login />} />
                
                {/* Protected Admin Routes */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/admin/*" element={<AdminDashboard />} />
                </Route>

                {/* Protected Vendor Routes */}
                <Route element={<ProtectedRoute requiredRole={['vendor', 'doctor', 'clinic', 'organization']} />}>
                  <Route path="/vendor/*" element={<VendorDashboard />} />
                </Route>
              </Routes>
            </main>
          </div>
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
