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
  Sparkles,
  Star,
  Heart,
  MoonStar,
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import SocialLinks from '../components/SocialLinks';
import { useLanguage } from '../context/LanguageContext';
import { localizeConsultationType, localizeSpecialty } from '../i18n/catalogLabels';
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
  const { t, lang } = useLanguage();
  const [providers, setProviders] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [consultType, setConsultType] = useState('all');

  useEffect(() => {
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
        title={t('home_seo_title')}
        description={t('home_seo_desc')}
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
            <h1 className="hero-title">{t('home_hero_title')}</h1>
            {lang === 'si' && (
              <p className="hero-si" lang="si">
                ඔබේ සෞඛ්‍යයට, ඔබට පහසුම ඩිජිටල් මාර්ගය.
              </p>
            )}
            <p className="hero-subtitle">{t('home_hero_subtitle')}</p>

            <form onSubmit={handleDoctorSearch} className="hero-doctor-search" aria-label={t('home_aria_find_doctor')}>
              <div className="doctor-search-grid glass-panel">
                <div>
                  <label htmlFor="home-doctor-name" className="sr-only">
                    {t('home_doctor_name')}
                  </label>
                  <div className="search-field">
                    <Search size={18} aria-hidden="true" />
                    <input
                      id="home-doctor-name"
                      type="search"
                      placeholder={t('home_doctor_name')}
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="home-specialty" className="sr-only">
                    {t('home_specialty')}
                  </label>
                  <select
                    id="home-specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  >
                    <option value="">{t('home_any_specialty')}</option>
                    {specialties.map((s) => (
                      <option key={s} value={s}>
                        {localizeSpecialty(s, t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="home-consult-type" className="sr-only">
                    {t('home_consult_type')}
                  </label>
                  <select
                    id="home-consult-type"
                    value={consultType}
                    onChange={(e) => setConsultType(e.target.value)}
                  >
                    <option value="all">{t('home_any_consult')}</option>
                    <option value="in_person">{localizeConsultationType('in_person', t)}</option>
                    <option value="video">{localizeConsultationType('video', t)}</option>
                    <option value="audio">{localizeConsultationType('audio', t)}</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary search-btn">
                  {t('home_find_doctor')}
                </button>
              </div>
            </form>

            <div className="hero-cta-row">
              <Link to="/channeling" className="btn btn-secondary">
                {t('home_book_channel')}
              </Link>
              <Link to="/ayurveda" className="btn btn-outline hero-outline-light">
                {t('home_explore_ayurveda')}
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-item">
                <CheckCircle size={14} className="text-primary-color" aria-hidden="true" /> {t('home_secure_booking')}
              </div>
              <div className="trust-item">
                <Shield size={14} className="text-primary-color" aria-hidden="true" /> {t('home_approved_only')}
              </div>
              <div className="trust-item">
                <Link to="/contact">{t('home_contact_support')}</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Honest trust signals — no floored / inflated platform-scale numbers */}
      <motion.section
        className="stats-section home-trust-section"
        aria-label={t('home_trust_aria')}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <ul className="stats-grid stats-grid-real home-trust-grid">
            <li className="stat-card glass-panel home-trust-card">
              <Users size={22} aria-hidden="true" />
              <div className="stat-label home-trust-label">{t('home_trust_approved')}</div>
            </li>
            <li className="stat-card glass-panel home-trust-card">
              <Shield size={22} aria-hidden="true" />
              <div className="stat-label home-trust-label">{t('home_trust_secure')}</div>
            </li>
            <li className="stat-card glass-panel home-trust-card">
              <Package size={22} aria-hidden="true" />
              <div className="stat-label home-trust-label">{t('home_trust_products')}</div>
            </li>
          </ul>
        </div>
      </motion.section>

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
            <div className="section-label">{t('home_directory')}</div>
            <h2 className="section-title">{t('home_doctors_title')}</h2>
            <p className="section-subtitle">{t('home_doctors_sub')}</p>
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
              {t('home_no_doctors')}{' '}
              <Link to="/join-as-doctor">{t('nav_join_doctor')}</Link>
              {' · '}
              <Link to="/contact">{t('home_contact_support')}</Link>.
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
                            aria-label={t('badge_deergayu_approved')}
                          />
                        )}
                      </h3>
                      <p className="doctor-role">{getProviderTitle(provider)}</p>
                      {specs.length > 0 && (
                        <p className="doctor-specialty">
                          {specs.slice(0, 2).map((s) => localizeSpecialty(s, t)).join(' · ')}
                        </p>
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
                          {t('home_view_profile')}
                        </Link>
                        <Link
                          to={`/channeling?book=${encodeURIComponent(provider.id)}`}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, textAlign: 'center' }}
                        >
                          {t('dp_book')}
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
              {t('common_view_all')} {t('dp_crumb_doctors')} <ChevronRight size={18} />
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
              <div className="section-label">{t('home_specialty')}</div>
              <h2 className="section-title">{t('home_specialties_title')}</h2>
              <p className="section-subtitle">{t('home_specialties_sub')}</p>
            </div>
            <div className="home-chip-row">
              {specialties.slice(0, 12).map((s) => (
                <Link key={s} to={`/doctors?specialty=${encodeURIComponent(s)}`} className="home-chip">
                  {localizeSpecialty(s, t)}
                </Link>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/specialties" className="btn btn-outline">
                {t('doc_all_specialties')}
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
            <div className="section-label">{t('nav_ayurveda')}</div>
            <h2 className="section-title">{t('ay_title')}</h2>
            <p className="section-subtitle">{t('ay_subtitle')}</p>
          </div>
          <div className="home-feature-band glass-panel">
            <Stethoscope size={32} color="var(--primary-color)" aria-hidden="true" />
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>{t('ay_title')}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('ay_subtitle')}</p>
            </div>
            <Link to="/ayurveda" className="btn btn-primary">
              {t('home_explore_ayurveda')}
            </Link>
          </div>
        </div>
      </motion.section>

      {/* 5. Astrology discovery — secondary to Find a Doctor / healthcare */}
      <motion.section
        className="home-astrology-section section"
        aria-labelledby="home-astrology-heading"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="home-astrology-motif" aria-hidden="true" />
        <div className="container home-astrology-inner">
          <div className="section-header">
            <div className="section-label home-astrology-eyebrow">{t('nav_astrology')}</div>
            <h2 id="home-astrology-heading" className="section-title">
              {t('home_astrology_title')}
            </h2>
            <p className="section-subtitle">{t('home_astrology_sub')}</p>
          </div>

          <ul className="home-astrology-cards">
            <li className="home-astrology-card glass-panel">
              <div className="home-astrology-card-icon" aria-hidden="true">
                <Star size={22} />
              </div>
              <h3>{t('home_birth_chart')}</h3>
              <p>{t('home_birth_chart_desc')}</p>
            </li>
            <li className="home-astrology-card glass-panel">
              <div className="home-astrology-card-icon" aria-hidden="true">
                <Heart size={22} />
              </div>
              <h3>{t('home_compatibility')}</h3>
              <p>{t('home_compatibility_desc')}</p>
            </li>
            <li className="home-astrology-card glass-panel">
              <div className="home-astrology-card-icon" aria-hidden="true">
                <MoonStar size={22} />
              </div>
              <h3>{t('home_auspicious_times')}</h3>
              <p>{t('home_auspicious_desc')}</p>
            </li>
          </ul>

          <div className="home-astrology-cta">
            <Link to="/astrology" className="btn btn-outline home-astrology-cta-btn">
              <Sparkles size={16} aria-hidden="true" />
              {t('home_explore_astrology')}
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* 6. How it works */}
      <motion.section
        className="section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={fadeUpVariant}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home_how_title')}</h2>
            <p className="section-subtitle">{t('home_how_sub')}</p>
          </div>
          <ol className="home-steps">
            <li>
              <span>1</span>
              <div>
                <strong>{t('home_how_1_title')}</strong>
                <p>{t('home_how_1_desc')}</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>{t('home_how_2_title')}</strong>
                <p>{t('home_how_2_desc')}</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>{t('home_how_3_title')}</strong>
                <p>{t('home_how_3_desc')}</p>
              </div>
            </li>
          </ol>
        </div>
      </motion.section>

      {/* 7. Why choose */}
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
            <h2 className="section-title">{t('home_why_title')}</h2>
            <p className="section-subtitle">{t('home_why_sub')}</p>
          </div>
          <div className="services-grid">
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Shield size={28} />
              </div>
              <h3>{t('home_trust_approved')}</h3>
              <p>{t('home_approved_only')}</p>
            </div>
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Leaf size={28} />
              </div>
              <h3>{t('home_trust_secure')}</h3>
              <p>{t('home_secure_booking')}</p>
            </div>
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Users size={28} />
              </div>
              <h3>{t('home_trust_products')}</h3>
              <p>{t('home_shop_sub')}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 8. Online consultation */}
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
              <h3 style={{ margin: '0 0 0.5rem' }}>{t('oc_title')}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('oc_subtitle')}</p>
            </div>
            <Link to="/online-consultation" className="btn btn-outline">
              {t('oc_cta')}
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
            <h2 className="section-title">{t('home_shop_title')}</h2>
            <p className="section-subtitle">{t('home_shop_sub')}</p>
          </div>
          <div className="services-grid">
            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <BookOpen size={32} />
              </div>
              <h3>{t('nav_guide')}</h3>
              <p>{t('ay_subtitle')}</p>
              <Link to="/ayurvedic-guide" className="service-link">
                {t('nav_guide')} <ChevronRight size={16} />
              </Link>
            </div>
            <div className="service-card glass-panel glass-panel-hover">
              <div className="service-icon-wrapper">
                <Package size={32} />
              </div>
              <h3>{t('home_shop_title')}</h3>
              <p>{t('home_shop_sub')}</p>
              <Link to="/shop" className="service-link">
                {t('home_view_shop')} <ChevronRight size={16} />
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
              <div className="section-label">{t('nav_shop')}</div>
              <h2 className="section-title">{t('home_shop_title')}</h2>
              <p className="section-subtitle">{t('home_shop_sub')}</p>
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
                            {t('common_view_all')}
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
            </motion.div>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link to="/shop" className="btn btn-outline btn-lg">
                {t('home_view_shop')} <ChevronRight size={18} />
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
              <div className="section-label">{t('home_contact_support')}</div>
              <h2>{t('home_why_title')}</h2>
              <p>{t('home_why_sub')}</p>
              <div className="cta-buttons">
                <Link to="/contact" className="btn btn-primary btn-lg">
                  {t('home_contact_support')}
                </Link>
                <Link to="/join-as-doctor" className="btn btn-secondary btn-lg">
                  {t('nav_join_doctor')}
                </Link>
                <Link to="/faq" className="btn btn-outline btn-lg">
                  {t('nav_faq')}
                </Link>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                <Link to="/privacy">{t('footer_privacy')}</Link>
                {' · '}
                <Link to="/terms">{t('footer_terms')}</Link>
                {' · '}
                <Link to="/refund-policy">{t('footer_refund')}</Link>
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
