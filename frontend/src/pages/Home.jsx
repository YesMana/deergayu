import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, UserCircle, MessageSquare, Star, ChevronRight, Activity, Calendar, Shield, Award, BookOpen, Package, Search, CheckCircle, Users, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import SocialLinks from '../components/SocialLinks';
import { displayHomeStats } from '../constants/homeStats';
import './Home.css';
import { API_URL } from '../config/api';


const Home = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ expertCount: 0, productCount: 0, orderCount: 0, appointmentCount: 0 });
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/home-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});

    fetch(`${API_URL}/api/featured-providers`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFeaturedProviders(Array.isArray(data) ? data.slice(0, 3) : []); })
      .catch(() => setFeaturedProviders([]))
      .finally(() => setLoadingProviders(false));

    fetch(`${API_URL}/api/featured-products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFeaturedProducts(Array.isArray(data) ? data.slice(0, 3) : []); })
      .catch(() => setFeaturedProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if(searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const shown = displayHomeStats(stats);
  const statItems = [
    { icon: Users, value: shown.expertCount, label: 'Expert Practitioners' },
    { icon: Package, value: shown.productCount, label: 'Herbal Products' },
    { icon: Calendar, value: shown.appointmentCount, label: 'Consultations Done' },
    { icon: Shield, value: '100%', label: 'Authentic & Natural' },
  ];

  const getRoleLabel = (role) => {
    const map = { doctor: 'Ayurvedic Doctor', clinic: 'Ayurvedic Clinic', organization: 'Medical Organisation' };
    return map[role] || 'Expert';
  };

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="home-page animate-fade-in">
      <SEO />
      {/* ── HERO SECTION ── */}
      <section className="hero-section">
        <div className="hero-bg-overlay" />
        <div className="hero-particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`hero-particle particle-${i + 1}`}>🌿</div>
          ))}
        </div>
        <div className="container hero-content">
          <motion.div 
            className="hero-text"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="hero-label">
              <Leaf size={14} /> Sri Lanka's #1 Ayurvedic Platform
            </div>
            <h1 className="hero-title">
              Discover Ancient Healing with{' '}
              <span className="hero-gradient">Deergayu</span>
            </h1>
            <p className="hero-subtitle">
              Connect with certified Ayurvedic doctors, shop authentic herbal remedies,
              and embrace holistic wellness — all in one place.
            </p>
            
            <form onSubmit={handleSearch} className="hero-search-bar">
              <div className="search-input-wrapper glass-panel">
                <Search size={22} className="search-icon text-muted" />
                <input 
                  type="text" 
                  placeholder="What are you looking for? (e.g. Back pain, Herbal Oil)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn btn-primary search-btn">
                  Search
                </button>
              </div>
            </form>

            <div className="hero-trust">
              <div className="trust-item"><CheckCircle size={14} className="text-primary-color" /> 100% Natural</div>
              <div className="trust-item"><CheckCircle size={14} className="text-primary-color" /> Certified Experts</div>
              <div className="trust-item"><CheckCircle size={14} className="text-primary-color" /> Islandwide Delivery</div>
            </div>
          </motion.div>

          <motion.div 
            className="hero-image-area"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <div className="hero-glow" />
            <div className="hero-card glass-panel animate-float">
              <img src="/logo.png" alt="Deergayu" className="hero-logo-img" />
              <div className="hero-card-text">
                <span className="hero-card-title">Deergayu Platform</span>
                <span className="hero-card-sub">Ayurvedic Excellence</span>
              </div>
            </div>
            <div className="hero-badge-1 glass-panel">
              <Star size={14} className="text-gold" fill="var(--secondary-color)" />
              <span>Trusted by thousands</span>
            </div>
            <div className="hero-badge-2 glass-panel">
              <Activity size={14} style={{ color: 'var(--primary-color)' }} />
              <span>AI-Powered Care</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <motion.section 
        className="stats-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <motion.div className="stats-grid" variants={staggerContainer}>
            {statItems.map(({ icon: Icon, value, label }, i) => (
              <motion.div key={i} className="stat-card glass-panel" variants={fadeUpVariant}>
                <div className="stat-icon-wrap">
                  <Icon size={24} />
                </div>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── SERVICES SECTION ── */}
      <motion.section 
        className="services-section section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <div className="section-label">What We Offer</div>
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle">
              Everything you need for your holistic health journey — from ancient wisdom to modern convenience.
            </p>
          </div>
          <motion.div className="services-grid" variants={staggerContainer}>
            <motion.div className="service-card glass-panel glass-panel-hover" variants={fadeUpVariant}>
              <div className="service-icon-wrapper"><Leaf size={32} /></div>
              <h3>Ayurvedic Shop</h3>
              <p>Authentic herbal medicines, oils, and wellness products from certified vendors — delivered with care.</p>
              <Link to="/shop" className="service-link">Browse Products <ChevronRight size={16} /></Link>
            </motion.div>

            <motion.div className="service-card glass-panel glass-panel-hover" variants={fadeUpVariant}>
              <div className="service-icon-wrapper"><Calendar size={32} /></div>
              <h3>Doctor Channeling</h3>
              <p>Book qualified Ayurvedic doctors and specialists for online or in-person consultations.</p>
              <Link to="/channeling" className="service-link">Book Now <ChevronRight size={16} /></Link>
            </motion.div>

            <motion.div className="service-card glass-panel glass-panel-hover" variants={fadeUpVariant}>
              <div className="service-icon-wrapper"><BookOpen size={32} /></div>
              <h3>Ayurvedic Guide</h3>
              <p>Traditional Sri Lankan remedies and daily routines — practical wisdom for everyday wellness.</p>
              <Link to="/ayurvedic-guide" className="service-link">Read Guide <ChevronRight size={16} /></Link>
            </motion.div>

            <motion.div className="service-card glass-panel glass-panel-hover" variants={fadeUpVariant}>
              <div className="service-icon-wrapper"><Star size={32} /></div>
              <h3>Astrology & Vastu</h3>
              <p>Guidance from experienced astrologers and Vastu experts for life direction and home harmony.</p>
              <Link to="/channeling?type=astrologer" className="service-link">Explore <ChevronRight size={16} /></Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── FEATURED DOCTORS ── */}
      {(loadingProviders || featuredProviders.length > 0) && (
        <motion.section 
          className="featured-section section" style={{ background: 'var(--surface-color)' }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariant}
        >
          <div className="container">
            <div className="section-header">
              <div className="section-label">Verified Experts</div>
              <h2 className="section-title">Meet Our Doctors</h2>
              <p className="section-subtitle">Certified Ayurvedic practitioners ready to guide your healing journey.</p>
            </div>
            <motion.div className="featured-grid" variants={staggerContainer}>
              {loadingProviders
                ? [1, 2, 3].map(i => (
                    <motion.div key={i} className="doctor-card glass-panel" variants={fadeUpVariant}>
                      <div className="skeleton doctor-avatar-skeleton" />
                      <div style={{ padding: '1rem' }}>
                        <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 36, width: '100%' }} />
                      </div>
                    </motion.div>
                  ))
                : featuredProviders.map(provider => {
                    const pic = provider.profileDetails?.profileImageUrl;
                    const initial = (provider.name || 'D')[0].toUpperCase();
                    return (
                      <motion.div key={provider.id} className="doctor-card glass-panel glass-panel-hover" variants={fadeUpVariant}>
                        <div className="doctor-avatar">
                          {pic ? <img src={pic} alt={provider.name} /> : <div className="doctor-avatar-placeholder">{initial}</div>}
                        </div>
                        <div className="doctor-info">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                            {provider.name} <CheckCircle size={16} color="var(--secondary-color)" fill="rgba(212, 175, 55, 0.15)" />
                          </h3>
                          <p className="doctor-role">{getRoleLabel(provider.role)}</p>
                          {provider.profileDetails?.specialty && (
                            <p className="doctor-specialty">{provider.profileDetails.specialty}</p>
                          )}
                          {provider.profileDetails?.address && (
                            <p className="doctor-location">
                              <MapPin size={12} /> {provider.profileDetails.address}
                            </p>
                          )}
                          <div className="doctor-rating">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={13} fill={i < Math.round(provider.rating || 4.5) ? 'var(--secondary-color)' : 'transparent'} stroke="var(--secondary-color)" />
                            ))}
                            <span>{(provider.rating || 4.5).toFixed(1)}</span>
                          </div>
                          <Link to="/channeling" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }}>
                            <Calendar size={14} /> Book Appointment
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })
              }
            </motion.div>
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <Link to="/channeling" className="btn btn-outline btn-lg">
                View All Doctors <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {(loadingProducts || featuredProducts.length > 0) && (
        <motion.section 
          className="featured-section section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUpVariant}
        >
          <div className="container">
            <div className="section-header">
              <div className="section-label">Popular Products</div>
              <h2 className="section-title">Trending Remedies</h2>
              <p className="section-subtitle">Authentic Ayurvedic products trusted by our community.</p>
            </div>
            <motion.div className="featured-grid" variants={staggerContainer}>
              {loadingProducts
                ? [1, 2, 3].map(i => (
                    <motion.div key={i} className="product-preview-card glass-panel" variants={fadeUpVariant}>
                      <div className="skeleton product-img-skeleton" />
                      <div style={{ padding: '1rem' }}>
                        <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 36, width: '100%' }} />
                      </div>
                    </motion.div>
                  ))
                : featuredProducts.map(product => (
                    <motion.div key={product.id} className="product-preview-card glass-panel glass-panel-hover" variants={fadeUpVariant}>
                      <div className="product-preview-img">
                        <img
                          src={product.imageUrl || product.image || 'https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=400&q=80'}
                          alt={product.name}
                        />
                        <div className="product-category-badge">{product.category}</div>
                      </div>
                      <div className="product-preview-info">
                        <h3>{product.name}</h3>
                        {product.description && <p>{product.description}</p>}
                        <div className="product-preview-footer">
                          <span className="product-preview-price">Rs. {Number(product.price).toLocaleString()}</span>
                          <Link to={`/product/${product.id}`} className="btn btn-primary btn-sm">
                            View →
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
              }
            </motion.div>
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <Link to="/shop" className="btn btn-outline btn-lg">
                Visit Full Shop <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── EXPERT CTA ── */}
      <motion.section 
        className="expert-cta-section section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="cta-card glass-panel">
            <div className="cta-content">
              <div className="section-label">Join Our Network</div>
              <h2>Are You a Doctor, Clinic, or Vendor?</h2>
              <p>
                Join the Deergayu platform to offer your services, manage appointments, 
                sell your authentic Ayurvedic products, and reach thousands of patients across Sri Lanka.
              </p>
              <div className="cta-buttons">
                <Link to="/login?mode=signup&role=doctor" className="btn btn-primary btn-lg">
                  Register as Doctor
                </Link>
                <Link to="/login?mode=signup&role=vendor" className="btn btn-secondary btn-lg">
                  Register as Vendor
                </Link>
              </div>
            </div>
            <div className="cta-visual">
              <div className="cta-icon-ring">
                <Users size={48} color="var(--primary-color)" />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── SOCIAL (admin-managed links) ── */}
      <motion.section
        className="social-home-section section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <SocialLinks variant="home" />
        </div>
      </motion.section>

    </div>
  );
};

export default Home;
