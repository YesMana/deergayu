import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf,
  ChevronRight,
  Calendar,
  Shield,
  BookOpen,
  Package,
  Search,
  CheckCircle,
  Users,
  MapPin,
  Stethoscope,
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import SocialLinks from '../components/SocialLinks';
import { displayHomeStats } from '../constants/homeStats';
import {
  collectSpecialtiesFromProviders,
  getProviderSpecialties,
  getProviderTitle,
  isApprovedProvider,
} from '../utils/doctorUtils';
import './Home.css';
import { API_URL } from '../config/api';

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    expertCount: 0,
    productCount: 0,
    orderCount: 0,
    appointmentCount: 0,
  });
  const [providers, setProviders] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [consultType, setConsultType] = useState('all');

  useEffect(() => {
    fetch(`${API_URL}/api/home-stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    fetch(`${API_URL}/api/providers`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProviders(Array.isArray(data) ? data : []))
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));

    fetch(`${API_URL}/api/featured-products`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFeaturedProducts(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setFeaturedProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const specialties = useMemo(() => collectSpecialtiesFromProviders(providers), [providers]);
  const featuredProviders = useMemo(() => providers.slice(0, 6), [providers]);

  const handleDoctorSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (doctorName.trim()) params.set('q', doctorName.trim());
    if (specialty) params.set('specialty', specialty);
    if (consultType && consultType !== 'all') params.set('type', consultType);
    // Date filter deferred: homepage must not imply availability filtering until
    // public search can use real schedule APIs per doctor (P1-B).
    navigate(`/doctors?${params.toString()}`);
  };

  const shown = displayHomeStats(stats);
  const hasRealStats =
    shown.expertCount > 0 || shown.productCount > 0 || shown.appointmentCount > 0;

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  return (
    <div className="home-page animate-fade-in">
      <SEO
        title="Deergayu | Find Doctors & Ayurveda Care in Sri Lanka"
        description="Book approved doctors and Ayurveda consultations on Deergayu — Sri Lankan digital healthcare, guide content, and wellness shop."
        url="https://deergayu.com/"
        canonical="https://deergayu.com/"
      />

      {/* 1. Doctor search / channeling */}
      <section className="hero-section hero-doctor-first">
        <div className="hero-bg-overlay" />
        <div className="container hero-content hero-content-single">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            <p className="hero-brand-signal">
              <Leaf size={16} aria-hidden="true" /> Deergayu
            </p>
            <h1 className="hero-title">
              Your Health. Your Doctor. Your Time.
            </h1>
            <p className="hero-si" lang="si">
              ඔබේ සෞඛ්‍යයට, ඔබට පහසුම ඩිජිටල් මාර්ගය.
            </p>
            <p className="hero-subtitle">
              Find approved providers, book consultations, and explore Ayurveda care on one Sri
              Lankan healthcare platform.
            </p>

            <form onSubmit={handleDoctorSearch} className="hero-doctor-search" aria-label="Find a doctor">
              <div className="doctor-search-grid glass-panel">
                <div>
                  <label htmlFor="home-doctor-name" className="sr-only">
                    Doctor name
                  </label>
                  <div className="search-field">
                    <Search size={18} aria-hidden="true" />
                    <input
                      id="home-doctor-name"
                      type="search"
                      placeholder="Doctor name"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="home-specialty" className="sr-only">
                    Specialty
                  </label>
                  <select
                    id="home-specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  >
                    <option value="">Any specialty</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="home-consult-type" className="sr-only">
                    Consultation type
                  </label>
                  <select
                    id="home-consult-type"
                    value={consultType}
                    onChange={(e) => setConsultType(e.target.value)}
                  >
                    <option value="all">Any consultation type</option>
                    <option value="in_person">In person</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary search-btn">
                  Find a Doctor
                </button>
              </div>
            </form>

            <div className="hero-cta-row">
              <Link to="/channeling" className="btn btn-secondary">
                Book / Channel a Doctor
              </Link>
              <Link to="/ayurveda" className="btn btn-outline hero-outline-light">
                Explore Ayurveda
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-item">
                <CheckCircle size={14} className="text-primary-color" aria-hidden="true" /> Secure booking
              </div>
              <div className="trust-item">
                <Shield size={14} className="text-primary-color" aria-hidden="true" /> Approved providers only
              </div>
              <div className="trust-item">
                <Link to="/contact">Contact support</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real stats only — no artificial floors */}
      {hasRealStats && (
        <motion.section
          className="stats-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUpVariant}
        >
          <div className="container">
            <div className="stats-grid stats-grid-real">
              {shown.expertCount > 0 && (
                <div className="stat-card glass-panel">
                  <Users size={22} aria-hidden="true" />
                  <div className="stat-value">{shown.expertCount}</div>
                  <div className="stat-label">Listed providers</div>
                </div>
              )}
              {shown.appointmentCount > 0 && (
                <div className="stat-card glass-panel">
                  <Calendar size={22} aria-hidden="true" />
                  <div className="stat-value">{shown.appointmentCount}</div>
                  <div className="stat-label">Consultations recorded</div>
                </div>
              )}
              {shown.productCount > 0 && (
                <div className="stat-card glass-panel">
                  <Package size={22} aria-hidden="true" />
                  <div className="stat-value">{shown.productCount}</div>
                  <div className="stat-label">Shop products</div>
                </div>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* 2. Popular / available doctors */}
      <motion.section
        className="featured-section section"
        style={{ background: 'var(--surface-color)' }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <div className="section-label">Directory</div>
            <h2 className="section-title">Doctors on Deergayu</h2>
            <p className="section-subtitle">
              Approved providers from the live directory. Availability is confirmed when you book.
            </p>
          </div>
          {loadingProviders ? (
            <div className="featured-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="doctor-card glass-panel">
                  <div className="skeleton doctor-avatar-skeleton" />
                  <div style={{ padding: '1rem' }}>
                    <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProviders.length === 0 ? (
            <p className="section-subtitle" style={{ textAlign: 'center' }}>
              No approved doctors listed yet.{' '}
              <Link to="/join-as-doctor">Join as a doctor</Link> or{' '}
              <Link to="/contact">contact us</Link>.
            </p>
          ) : (
            <motion.div className="featured-grid" variants={staggerContainer}>
              {featuredProviders.map((provider) => {
                const pic = provider.profileDetails?.profileImageUrl;
                const initial = (provider.name || 'D')[0].toUpperCase();
                const specs = getProviderSpecialties(provider);
                return (
                  <motion.div
                    key={provider.id}
                    className="doctor-card glass-panel glass-panel-hover"
                    variants={fadeUpVariant}
                  >
                    <div className="doctor-avatar">
                      {pic ? (
                        <img src={pic} alt="" />
                      ) : (
                        <div className="doctor-avatar-placeholder">{initial}</div>
                      )}
                    </div>
                    <div className="doctor-info">
                      <h3>
                        {provider.name}{' '}
                        {isApprovedProvider(provider) && (
                          <CheckCircle
                            size={16}
                            color="var(--secondary-color)"
                            aria-label="Deergayu Approved"
                          />
                        )}
                      </h3>
                      <p className="doctor-role">{getProviderTitle(provider)}</p>
                      {specs.length > 0 && (
                        <p className="doctor-specialty">{specs.slice(0, 2).join(' · ')}</p>
                      )}
                      {provider.profileDetails?.address && (
                        <p className="doctor-location">
                          <MapPin size={12} aria-hidden="true" /> {provider.profileDetails.address}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <Link
                          to={`/doctors/${provider.id}`}
                          className="btn btn-outline btn-sm"
                          style={{ flex: 1, textAlign: 'center' }}
                        >
                          View profile
                        </Link>
                        <Link
                          to={`/channeling?book=${encodeURIComponent(provider.id)}`}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, textAlign: 'center' }}
                        >
                          Book
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/doctors" className="btn btn-outline btn-lg">
              View all doctors <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* 3. Specialties */}
      {specialties.length > 0 && (
        <motion.section
          className="section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUpVariant}
        >
          <div className="container">
            <div className="section-header">
              <div className="section-label">Care areas</div>
              <h2 className="section-title">Specialties</h2>
              <p className="section-subtitle">From specialties listed on current provider profiles.</p>
            </div>
            <div className="home-chip-row">
              {specialties.slice(0, 12).map((s) => (
                <Link key={s} to={`/doctors?specialty=${encodeURIComponent(s)}`} className="home-chip">
                  {s}
                </Link>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/specialties" className="btn btn-outline">
                All specialties
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* 4. Ayurveda */}
      <motion.section
        className="services-section section"
        style={{ background: 'var(--surface-color)' }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <div className="section-label">Differentiator</div>
            <h2 className="section-title">Ayurveda consultations</h2>
            <p className="section-subtitle">
              Connect with Ayurveda practitioners and educational content — without cure guarantees.
            </p>
          </div>
          <div className="home-feature-band glass-panel">
            <Stethoscope size={32} color="var(--primary-color)" aria-hidden="true" />
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Ayurveda on Deergayu</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Find practitioners, learn from the guide, and book through the same trusted flow.
              </p>
            </div>
            <Link to="/ayurveda" className="btn btn-primary">
              Explore Ayurveda
            </Link>
          </div>
        </div>
      </motion.section>

      {/* 5. How it works */}
      <motion.section
        className="section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How Deergayu works</h2>
            <p className="section-subtitle">Simple steps using the current booking system.</p>
          </div>
          <ol className="home-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Search</strong>
                <p>Find a doctor by name, specialty, or consultation type.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Choose a time</strong>
                <p>Pick an open slot from the provider&apos;s schedule.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Book &amp; track</strong>
                <p>Submit your request and follow status in My Appointments.</p>
              </div>
            </li>
          </ol>
        </div>
      </motion.section>

      {/* 6. Why choose */}
      <motion.section
        className="section"
        style={{ background: 'var(--surface-color)' }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why choose Deergayu</h2>
          </div>
          <div className="services-grid">
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Shield size={28} />
              </div>
              <h3>Approved providers</h3>
              <p>Public listings show providers after admin approval — not unreviewed profiles.</p>
            </div>
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Leaf size={28} />
              </div>
              <h3>Healthcare + Ayurveda</h3>
              <p>Modern booking alongside Ayurveda care and educational guide content.</p>
            </div>
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Users size={28} />
              </div>
              <h3>Built for Sri Lanka</h3>
              <p>Local focus, Sinhala-friendly messaging, and islandwide digital access.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 7. Online consultation */}
      <motion.section
        className="section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="home-feature-band glass-panel">
            <Calendar size={32} color="var(--primary-color)" aria-hidden="true" />
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Online consultation</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                Book video or remote consultation types when a provider offers them. Deergayu
                records the booking; a built-in live video studio is not required for the current
                flow.
              </p>
            </div>
            <Link to="/online-consultation" className="btn btn-outline">
              Learn more
            </Link>
          </div>
        </div>
      </motion.section>

      {/* 8–9. Guide + services */}
      <motion.section
        className="services-section section"
        style={{ background: 'var(--surface-color)' }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Health content &amp; wellness</h2>
          </div>
          <div className="services-grid">
            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <BookOpen size={32} />
              </div>
              <h3>Guide / Articles</h3>
              <p>Practical Ayurvedic routines and educational content from the Deergayu guide.</p>
              <Link to="/ayurvedic-guide" className="service-link">
                Read guide <ChevronRight size={16} />
              </Link>
            </div>
            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <Package size={32} />
              </div>
              <h3>Wellness shop</h3>
              <p>Browse herbal and wellness products from approved vendors.</p>
              <Link to="/shop" className="service-link">
                Visit shop <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 10. Shop products */}
      {(loadingProducts || featuredProducts.length > 0) && (
        <motion.section
          className="featured-section section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUpVariant}
        >
          <div className="container">
            <div className="section-header">
              <div className="section-label">Shop</div>
              <h2 className="section-title">Featured products</h2>
              <p className="section-subtitle">From the live storefront — only real listed items.</p>
            </div>
            <motion.div className="featured-grid" variants={staggerContainer}>
              {loadingProducts
                ? [1, 2, 3].map((i) => (
                    <div key={i} className="product-preview-card glass-panel">
                      <div className="skeleton product-img-skeleton" />
                    </div>
                  ))
                : featuredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      className="product-preview-card glass-panel glass-panel-hover"
                      variants={fadeUpVariant}
                    >
                      <div className="product-preview-img">
                        {(product.imageUrl || product.image) && (
                          <img src={product.imageUrl || product.image} alt={product.name || 'Product'} />
                        )}
                        {product.category && (
                          <div className="product-category-badge">{product.category}</div>
                        )}
                      </div>
                      <div className="product-preview-info">
                        <h3>{product.name}</h3>
                        <div className="product-preview-footer">
                          <span className="product-preview-price">
                            Rs. {Number(product.price || 0).toLocaleString()}
                          </span>
                          <Link to={`/product/${product.id}`} className="btn btn-primary btn-sm">
                            View
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
            </motion.div>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link to="/shop" className="btn btn-outline btn-lg">
                Visit full shop <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* 11. Support / join CTA */}
      <motion.section
        className="expert-cta-section section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="cta-card glass-panel">
            <div className="cta-content">
              <div className="section-label">Support &amp; partners</div>
              <h2>Need help, or joining as a provider?</h2>
              <p>
                Contact Deergayu support, or register as a doctor or clinic. Provider profiles go
                live only after verification.
              </p>
              <div className="cta-buttons">
                <Link to="/contact" className="btn btn-primary btn-lg">
                  Contact support
                </Link>
                <Link to="/join-as-doctor" className="btn btn-secondary btn-lg">
                  Join as doctor
                </Link>
                <Link to="/faq" className="btn btn-outline btn-lg">
                  FAQ
                </Link>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                <Link to="/privacy">Privacy</Link>
                {' · '}
                <Link to="/terms">Terms</Link>
                {' · '}
                <Link to="/refund-policy">Refund policy</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="social-home-section section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
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
