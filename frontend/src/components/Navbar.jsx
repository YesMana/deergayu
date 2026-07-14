import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, ShoppingBag, Globe, Mic, Sun, Moon, Menu, X, Bell, ChevronDown, User, Package, Calendar, LayoutDashboard, Shield, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const Navbar = () => {
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const [isListening, setIsListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      } else if (transcript.includes('ayurveda') || transcript.includes('guide')) {
        navigate('/ayurvedic-guide');
      } else {
        navigate(`/shop?q=${encodeURIComponent(transcript)}`);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Admin', color: '#ef5350' },
      doctor: { label: 'Doctor', color: '#29b6f6' },
      clinic: { label: 'Clinic', color: '#29b6f6' },
      organization: { label: 'Organisation', color: '#29b6f6' },
      vendor: { label: 'Vendor', color: '#ab47bc' },
      user: { label: 'Member', color: '#4caf50' },
    };
    return badges[role] || badges.user;
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (['vendor', 'doctor', 'clinic', 'organization'].includes(user.role)) return '/vendor';
    return '/my-account';
  };

  const roleBadge = user ? getRoleBadge(user.role) : null;
  const profileInitial = user ? (user.displayName || user.email || 'U')[0].toUpperCase() : 'U';
  const profilePic = user?.profileDetails?.profileImageUrl;

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-content">
        {/* Brand */}
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Deergayu Logo" className="brand-logo" />
        </Link>

        {/* Desktop Nav Links */}
        <ul className="nav-links desktop-only">
          <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>{t('nav_home')}</Link></li>
          <li><Link to="/shop" className={location.pathname.startsWith('/shop') ? 'active' : ''}>{t('nav_shop')}</Link></li>
          <li><Link to="/channeling" className={location.pathname === '/channeling' ? 'active' : ''}>{t('nav_channeling')}</Link></li>
          <li><Link to="/ayurvedic-guide" className={location.pathname === '/ayurvedic-guide' ? 'active' : ''}>Ayurvedic Guide</Link></li>
          <li><Link to="/astrology" className={location.pathname === '/astrology' ? 'active' : ''}>{t('nav_astrology')}</Link></li>
          <li><Link to="/videos" className={location.pathname === '/videos' ? 'active' : ''}>{t('nav_videos')}</Link></li>
        </ul>

        {/* Nav Actions */}
        <div className="nav-actions">
          {/* Voice Search */}
          <button
            className={`icon-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceSearch}
            title="Voice Search"
          >
            <Mic size={19} />
          </button>

          {/* Theme Toggle */}
          <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Language Toggle */}
          <button className="icon-btn lang-btn" onClick={toggleLanguage} title="Switch Language">
            <Globe size={18} /> <span>{lang.toUpperCase()}</span>
          </button>

          {/* Cart */}
          <Link to="/shop/cart" className="icon-btn cart-btn" title="Cart">
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {/* User Menu */}
          {user ? (
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                className="user-avatar-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="User menu"
              >
                {profilePic ? (
                  <img src={profilePic} alt={profileInitial} className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">{profileInitial}</div>
                )}
                <ChevronDown size={14} className={`chevron ${isUserMenuOpen ? 'open' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="user-dropdown animate-fade-in-scale">
                  {/* Profile Header */}
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {profilePic ? (
                        <img src={profilePic} alt={profileInitial} />
                      ) : (
                        <div className="avatar-placeholder large">{profileInitial}</div>
                      )}
                    </div>
                    <div>
                      <div className="dropdown-name">{user.displayName || user.email?.split('@')[0]}</div>
                      <div className="dropdown-email">{user.email}</div>
                      <span className="dropdown-role-badge" style={{ background: `${roleBadge.color}22`, color: roleBadge.color }}>
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* Dashboard Link */}
                  {(user.role === 'admin' || ['vendor', 'doctor', 'clinic', 'organization'].includes(user.role)) && (
                    <Link to={getDashboardLink()} className="dropdown-item">
                      {user.role === 'admin' ? <Shield size={16} /> : <LayoutDashboard size={16} />}
                      {user.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                    </Link>
                  )}

                  {/* Customer Links */}
                  {user.role === 'user' && (
                    <>
                      <Link to="/my-account" className="dropdown-item">
                        <User size={16} /> My Account
                      </Link>
                      <Link to="/my-orders" className="dropdown-item">
                        <Package size={16} /> My Orders
                      </Link>
                      <Link to="/my-appointments" className="dropdown-item">
                        <Calendar size={16} /> My Appointments
                      </Link>
                    </>
                  )}

                  <div className="dropdown-divider" />

                  <button onClick={logout} className="dropdown-item danger">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <User size={16} />
              {t('nav_login')}
            </Link>
          )}

          {/* Hamburger */}
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-links">
          <li><Link to="/">{t('nav_home')}</Link></li>
          <li><Link to="/shop">{t('nav_shop')}</Link></li>
          <li><Link to="/channeling">{t('nav_channeling')}</Link></li>
          <li><Link to="/ayurvedic-guide">Ayurvedic Guide</Link></li>
          <li><Link to="/astrology">{t('nav_astrology')}</Link></li>
          <li><Link to="/videos">{t('nav_videos')}</Link></li>
          {user && (
            <>
              <li><Link to={getDashboardLink()}>
                {user.role === 'admin' ? '🛡 Admin Panel' : ['vendor', 'doctor', 'clinic', 'organization'].includes(user.role) ? '📊 My Dashboard' : '👤 My Account'}
              </Link></li>
              {user.role === 'user' && <>
                <li><Link to="/my-orders">📦 My Orders</Link></li>
                <li><Link to="/my-appointments">📅 My Appointments</Link></li>
              </>}
              <li><button onClick={logout} className="mobile-logout-btn">🚪 Sign Out</button></li>
            </>
          )}
          {!user && <li><Link to="/login" className="mobile-login-btn">Login / Sign Up</Link></li>}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
