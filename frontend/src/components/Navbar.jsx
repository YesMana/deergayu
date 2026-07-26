import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Globe, Mic, Sun, Moon, Menu, X, ChevronDown, User, Package, Calendar, LayoutDashboard, Shield, LogOut } from 'lucide-react';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const moreRef = useRef(null);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
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
        navigate('/doctors');
      } else if (transcript.includes('ayurveda') || transcript.includes('guide')) {
        navigate('/ayurveda');
      } else {
        navigate(`/shop?q=${encodeURIComponent(transcript)}`);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
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
  const path = location.pathname;

  const moreActive = ['/specialties', '/channeling', '/videos', '/astrology', '/faq', '/join-as-doctor'].some(
    (p) => path.startsWith(p)
  );

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} aria-label="Main">
      <div className="container nav-content">
        <Link to="/" className="brand" aria-label="Deergayu home">
          <img src="/logo.png" alt="Deergayu" className="brand-logo" />
        </Link>

        <ul className="nav-links desktop-only">
          <li>
            <Link to="/" className={path === '/' ? 'active' : ''}>
              {t('nav_home')}
            </Link>
          </li>
          <li>
            <Link to="/doctors" className={path.startsWith('/doctors') ? 'active' : ''}>
              Find a Doctor
            </Link>
          </li>
          <li>
            <Link to="/ayurveda" className={path === '/ayurveda' || path.startsWith('/ayurveda/') ? 'active' : ''}>
              Ayurveda
            </Link>
          </li>
          <li>
            <Link
              to="/online-consultation"
              className={path.startsWith('/online-consultation') ? 'active' : ''}
            >
              Online Consultation
            </Link>
          </li>
          <li>
            <Link to="/ayurvedic-guide" className={path.startsWith('/ayurvedic-guide') ? 'active' : ''}>
              Guide
            </Link>
          </li>
          <li>
            <Link to="/shop" className={path.startsWith('/shop') ? 'active' : ''}>
              {t('nav_shop')}
            </Link>
          </li>
          <li>
            <Link to="/about" className={path === '/about' ? 'active' : ''}>
              About
            </Link>
          </li>
          <li>
            <Link to="/contact" className={path === '/contact' ? 'active' : ''}>
              Contact
            </Link>
          </li>
          <li className="nav-dropdown" ref={moreRef}>
            <button
              type="button"
              className={`nav-dropdown-trigger ${moreActive ? 'active' : ''}`}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More <ChevronDown size={14} />
            </button>
            {moreOpen && (
              <div className="nav-dropdown-menu" role="menu">
                <Link to="/specialties" role="menuitem">
                  Specialties
                </Link>
                <Link to="/channeling" role="menuitem">
                  Book / Channel
                </Link>
                <Link to="/faq" role="menuitem">
                  FAQ
                </Link>
                <Link to="/videos" role="menuitem">
                  Videos
                </Link>
                <Link to="/astrology" role="menuitem">
                  Astrology
                </Link>
                <Link to="/join-as-doctor" role="menuitem">
                  Join as Doctor
                </Link>
              </div>
            )}
          </li>
        </ul>

        <div className="nav-actions">
          <Link to="/doctors" className="btn btn-primary btn-sm nav-cta desktop-only">
            Find a Doctor
          </Link>
          <Link to="/channeling" className="btn btn-outline btn-sm nav-cta-secondary desktop-only">
            Book
          </Link>

          <button
            type="button"
            className={`icon-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceSearch}
            title="Voice Search"
            aria-label="Voice search"
          >
            <Mic size={19} />
          </button>

          <button type="button" className="icon-btn" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <button type="button" className="icon-btn lang-btn" onClick={toggleLanguage} title="Switch Language" aria-label="Switch language">
            <Globe size={18} /> <span>{lang.toUpperCase()}</span>
          </button>

          <Link to="/shop/cart" className="icon-btn cart-btn" title="Cart" aria-label="Cart">
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {user ? (
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className="user-avatar-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="User menu"
                aria-expanded={isUserMenuOpen}
              >
                {profilePic ? (
                  <img src={profilePic} alt="" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">{profileInitial}</div>
                )}
                <ChevronDown size={14} className={`chevron ${isUserMenuOpen ? 'open' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="user-dropdown animate-fade-in-scale">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {profilePic ? (
                        <img src={profilePic} alt="" />
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

                  {(user.role === 'admin' || ['vendor', 'doctor', 'clinic', 'organization'].includes(user.role)) && (
                    <Link to={getDashboardLink()} className="dropdown-item">
                      {user.role === 'admin' ? <Shield size={16} /> : <LayoutDashboard size={16} />}
                      {user.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}
                    </Link>
                  )}

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

                  <button type="button" onClick={logout} className="dropdown-item danger">
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

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/doctors">Find a Doctor</Link></li>
          <li><Link to="/ayurveda">Ayurveda</Link></li>
          <li><Link to="/online-consultation">Online Consultation</Link></li>
          <li><Link to="/ayurvedic-guide">Guide / Articles</Link></li>
          <li><Link to="/shop">Shop</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/channeling">Book / Channel a Doctor</Link></li>
          <li><Link to="/specialties">Specialties</Link></li>
          <li><Link to="/faq">FAQ</Link></li>
          <li><Link to="/join-as-doctor">Join as Doctor</Link></li>
          <li className="mobile-nav-secondary"><Link to="/videos">Videos</Link></li>
          <li className="mobile-nav-secondary"><Link to="/astrology">Astrology</Link></li>
          {user && (
            <>
              <li>
                <Link to={getDashboardLink()}>
                  {user.role === 'admin'
                    ? 'Admin Panel'
                    : ['vendor', 'doctor', 'clinic', 'organization'].includes(user.role)
                      ? 'My Dashboard'
                      : 'My Account'}
                </Link>
              </li>
              {user.role === 'user' && (
                <>
                  <li><Link to="/my-orders">My Orders</Link></li>
                  <li><Link to="/my-appointments">My Appointments</Link></li>
                </>
              )}
              <li>
                <button type="button" onClick={logout} className="mobile-logout-btn">
                  Sign Out
                </button>
              </li>
            </>
          )}
          {!user && (
            <li>
              <Link to="/login" className="mobile-login-btn">
                Login / Sign Up
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
