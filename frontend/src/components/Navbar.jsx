import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, UserCircle, ShoppingBag, Globe, Mic, Sun, Moon, Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [isListening, setIsListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'si' ? 'si-LK' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setIsListening(false);
      if (transcript.includes('appoint') || transcript.includes('doctor') || transcript.includes('channel')) {
        navigate('/channeling');
      } else if (transcript.includes('symptom') || transcript.includes('check')) {
        navigate('/symptom-checker');
      } else {
        navigate(`/shop?q=${encodeURIComponent(transcript)}`);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar glass-panel">
      <div className="container nav-content">
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Deergayu Logo" className="brand-logo" />
        </Link>
        
        {/* Hamburger Menu Toggle (Mobile Only) */}
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        
        <div className={`nav-menu-container ${isMobileMenuOpen ? 'open' : ''}`}>
          <ul className="nav-links">
            <li><Link to="/">{t('nav_home')}</Link></li>
            <li><Link to="/shop">{t('nav_shop')}</Link></li>
            <li><Link to="/channeling">{t('nav_channeling')}</Link></li>
            <li><Link to="/symptom-checker">{t('nav_symptoms')}</Link></li>
          </ul>
          
          <div className="nav-actions">
            <button 
              className="icon-btn" 
              onClick={handleVoiceSearch} 
              title="Voice Search"
              style={{ color: isListening ? 'var(--error-color)' : 'inherit', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}
            >
              <Mic size={20} />
            </button>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="icon-btn language-btn" onClick={toggleLanguage} title="Switch Language">
              <Globe size={20} /> <span>{lang.toUpperCase()}</span>
            </button>
            <Link to="/shop/cart" className="icon-btn" style={{ position: 'relative' }}>
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--error-color)', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.3rem', borderRadius: '10px', fontWeight: 'bold' }}>
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="user-profile-nav" style={{display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(var(--primary-color-rgb), 0.1)', padding: '0.4rem 1rem', borderRadius: '20px'}}>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2'}}>
                  <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)'}}>{user.displayName || user.email.split('@')[0]}</span>
                  {user.role === 'admin' ? (
                    <Link to="/admin" style={{fontSize: '0.75rem', color: 'var(--primary-color)', textTransform: 'capitalize', fontWeight: 'bold', textDecoration: 'none'}}>➜ Admin Panel</Link>
                  ) : user.role === 'vendor' || user.role === 'clinic' || user.role === 'doctor' || user.role === 'organization' ? (
                    <Link to="/vendor" style={{fontSize: '0.75rem', color: 'var(--primary-color)', textTransform: 'capitalize', fontWeight: 'bold', textDecoration: 'none'}}>➜ Dashboard</Link>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to="/my-orders" style={{fontSize: '0.7rem', color: 'var(--primary-color)', textDecoration: 'none'}}>Orders</Link>
                      <Link to="/my-appointments" style={{fontSize: '0.7rem', color: 'var(--primary-color)', textDecoration: 'none'}}>Appointments</Link>
                    </div>
                  )}
                </div>
                <button onClick={logout} className="icon-btn" title="Logout" style={{color: 'var(--error-color)', padding: '0.2rem'}}>
                  <X size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">
                <UserCircle size={20} />
                {t('nav_login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
