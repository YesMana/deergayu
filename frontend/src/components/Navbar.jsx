import { Link, useLocation } from 'react-router-dom';
import { Leaf, UserCircle, ShoppingBag, Globe, Mic, Sun, Moon, Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleVoiceSearch = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      alert(lang === 'si' ? "කටහඬ හඳුනාගැනීම සාර්ථකයි. (Mock)" : "Voice recognized successfully. (Mock)");
    }, 2000);
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
            <Link to="/shop/cart" className="icon-btn">
              <ShoppingBag size={20} />
            </Link>
            <Link to="/login" className="btn btn-primary">
              <UserCircle size={20} />
              {t('nav_login')}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
