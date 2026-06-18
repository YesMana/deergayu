import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Calendar, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="home-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              {t('hero_title').includes('Deergayu') ? (
                <>Discover Ancient Healing with <span className="hero-gradient">Deergayu</span></>
              ) : (
                <><span className="hero-gradient">දීර්ඝායු</span> සමගින් පෞරාණික ආයුර්වේද සුවය අත්විඳින්න</>
              )}
            </h1>
            <p className="hero-subtitle">
              {t('hero_subtitle')}
            </p>
            <div className="hero-buttons">
              <Link to="/shop" className="btn btn-primary">
                <Leaf size={20} /> {t('btn_shop')}
              </Link>
              <Link to="/channeling" className="btn btn-secondary">
                <Calendar size={20} /> {t('btn_book')}
              </Link>
            </div>
          </div>
          <div className="hero-image-container">
            <div className="hero-shape"></div>
            {/* Added logo inside the placeholder box as requested */}
            <div className="hero-image-placeholder glass-panel">
              <img src="/logo.png" alt="Deergayu" style={{maxWidth: '80%', maxHeight: '80%', objectFit: 'contain'}} />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section section">
        <div className="container">
          <h2 className="section-title">{t('services_title')}</h2>
          <div className="services-grid">
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Leaf size={32} />
              </div>
              <h3>{t('srv_shop_title')}</h3>
              <p>{t('srv_shop_desc')}</p>
              <Link to="/shop" className="service-link">{t('srv_shop_link')} &rarr;</Link>
            </div>
            
            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Calendar size={32} />
              </div>
              <h3>{t('srv_doc_title')}</h3>
              <p>{t('srv_doc_desc')}</p>
              <Link to="/channeling" className="service-link">{t('srv_doc_link')} &rarr;</Link>
            </div>

            <div className="service-card glass-panel">
              <div className="service-icon-wrapper">
                <Star size={32} />
              </div>
              <h3>{t('srv_astro_title')}</h3>
              <p>{t('srv_astro_desc')}</p>
              <Link to="/channeling?type=astrologer" className="service-link">{t('srv_astro_link')} &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Expert CTA Section */}
      <section className="expert-cta-section section" style={{background: 'var(--surface-color)', marginTop: '2rem'}}>
        <div className="container" style={{textAlign: 'center', maxWidth: '800px', margin: '0 auto', padding: '3rem 1rem'}}>
          <h2 className="section-title" style={{marginBottom: '1rem', color: 'var(--primary-color)'}}>Are you a Doctor or Medical Clinic?</h2>
          <p style={{marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--text-secondary)'}}>
            Join the Deergayu platform to offer your services, manage channelings, and sell your traditional medical products directly to our community.
          </p>
          <Link 
            to="/login?mode=signup&role=doctor" 
            className="btn btn-primary"
            style={{padding: '0.8rem 2rem', fontSize: '1.1rem'}}
          >
            Register as an Expert
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
