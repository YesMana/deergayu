import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Calendar, Star, Users, Package, Activity, Shield, ChevronRight, MapPin, Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Home = () => {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState({ expertCount: 0, productCount: 0, orderCount: 0, appointmentCount: 0 });
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    // Fetch stats
    fetch(`${API_URL}/api/home-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});

    // Fetch featured providers
    fetch(`${API_URL}/api/featured-providers`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFeaturedProviders(Array.isArray(data) ? data.slice(0, 3) : []); })
      .catch(() => setFeaturedProviders([]))
      .finally(() => setLoadingProviders(false));

    // Fetch featured products
    fetch(`${API_URL}/api/featured-products`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFeaturedProducts(Array.isArray(data) ? data.slice(0, 3) : []); })
      .catch(() => setFeaturedProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const statItems = [
    { icon: Users, value: stats.expertCount || '50+', label: 'Expert Practitioners' },
    { icon: Package, value: stats.productCount || '100+', label: 'Herbal Products' },
    { icon: Calendar, value: stats.appointmentCount || '1K+', label: 'Consultations Done' },
    { icon: Shield, value: '100%', label: 'Authentic & Natural' },
  ];

  const getRoleLabel = (role) => {
    const map = { doctor: 'Ayurvedic Doctor', clinic: 'Ayurvedic Clinic', organization: 'Medical Organisation' };
    return map[role] || 'Expert';
  };

  return (
    <div className="home-page animate-fade-in">

      {/* ── HERO SECTION ── */}
      <section className="hero-section">
        <div className="hero-bg-overlay" />
        <div className="hero-particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`hero-particle particle-${i + 1}`}>🌿</div>
          ))}
        </div>
        <div className="container hero-content">
          <div className="hero-text animate-fade-in">
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
            <div className="hero-buttons">
              <Link to="/shop" className="btn btn-primary btn-lg">
                <Leaf size={20} /> Explore Shop
              </Link>
              <Link to="/channeling" className="btn btn-outline-gold btn-lg">
                <Calendar size={20} /> Book a Doctor
              </Link>
            </div>
            <div className="hero-trust">
              <div className="trust-item"><span>✓</span> 100% Natural</div>
              <div className="trust-item"><span>✓</span> Certified Experts</div>
              <div className="trust-item"><span>✓</span> Islandwide Delivery</div>
            </div>
          </div>
          <div className="hero-image-area">
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
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {statItems.map(({ icon: Icon, value, label }, i) => (
              <div key={i} className="stat-card glass-panel">
                <div className="stat-icon-wrap">
                  <Icon size={24} />
                </div>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES SECTION ── */}
      <section className="services-section section">
        <div className="container">
          <div className="section-header">
            <div className="section-label">What We Offer</div>
            <h2 className="section-title">Our Services</h2>
            <p className="section-subtitle">
              Everything you need for your holistic health journey — from ancient wisdom to modern convenience.
            </p>
          </div>
          <div className="services-grid">
            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <Leaf size={32} />
              </div>
              <h3>Ayurvedic Shop</h3>
              <p>Browse hundreds of authentic herbal medicines, oils, and wellness products directly from certified vendors.</p>
              <Link to="/shop" className="service-link">
                Browse Products <ChevronRight size={16} />
              </Link>
            </div>

            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <Calendar size={32} />
              </div>
              <h3>Doctor Channeling</h3>
              <p>Book appointments with qualified Ayurvedic doctors and specialists. Online and in-person sessions available.</p>
              <Link to="/channeling" className="service-link">
                Book Now <ChevronRight size={16} />
              </Link>
            </div>

            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <Activity size={32} />
              </div>
              <h3>AI Symptom Checker</h3>
              <p>Describe your symptoms and get AI-powered Ayurvedic recommendations plus real doctor and product matches.</p>
              <Link to="/symptom-checker" className="service-link">
                Check Symptoms <ChevronRight size={16} />
              </Link>
            </div>

            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <Star size={32} />
              </div>
              <h3>Astrology & Vastu</h3>
              <p>Consult with experienced astrologers and Vastu experts for life guidance and home harmony.</p>
              <Link to="/channeling?type=astrologer" className="service-link">
                Explore <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED DOCTORS ── */}
      {(loadingProviders || featuredProviders.length > 0) && (
        <section className="featured-section section" style={{ background: 'var(--surface-color)' }}>
          <div className="container">
            <div className="section-header">
              <div className="section-label">Verified Experts</div>
              <h2 className="section-title">Meet Our Doctors</h2>
              <p className="section-subtitle">Certified Ayurvedic practitioners ready to guide your healing journey.</p>
            </div>
            <div className="featured-grid">
              {loadingProviders
                ? [1, 2, 3].map(i => (
                    <div key={i} className="doctor-card glass-panel">
                      <div className="skeleton doctor-avatar-skeleton" />
                      <div style={{ padding: '1rem' }}>
                        <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 36, width: '100%' }} />
                      </div>
                    </div>
                  ))
                : featuredProviders.map(provider => {
                    const pic = provider.profileDetails?.profileImageUrl;
                    const initial = (provider.name || 'D')[0].toUpperCase();
                    return (
                      <div key={provider.id} className="doctor-card glass-panel glass-panel-hover">
                        <div className="doctor-avatar">
                          {pic
                            ? <img src={pic} alt={provider.name} />
                            : <div className="doctor-avatar-placeholder">{initial}</div>
                          }
                        </div>
                        <div className="doctor-info">
                          <h3>{provider.name}</h3>
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
                      </div>
                    );
                  })
              }
            </div>
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <Link to="/channeling" className="btn btn-outline btn-lg">
                View All Doctors <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {(loadingProducts || featuredProducts.length > 0) && (
        <section className="featured-section section">
          <div className="container">
            <div className="section-header">
              <div className="section-label">Popular Products</div>
              <h2 className="section-title">Trending Remedies</h2>
              <p className="section-subtitle">Authentic Ayurvedic products trusted by our community.</p>
            </div>
            <div className="featured-grid">
              {loadingProducts
                ? [1, 2, 3].map(i => (
                    <div key={i} className="product-preview-card glass-panel">
                      <div className="skeleton product-img-skeleton" />
                      <div style={{ padding: '1rem' }}>
                        <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 36, width: '100%' }} />
                      </div>
                    </div>
                  ))
                : featuredProducts.map(product => (
                    <div key={product.id} className="product-preview-card glass-panel glass-panel-hover">
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
                    </div>
                  ))
              }
            </div>
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <Link to="/shop" className="btn btn-outline btn-lg">
                Visit Full Shop <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── EXPERT CTA ── */}
      <section className="expert-cta-section section">
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
      </section>

    </div>
  );
};

export default Home;
