import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import './PublicPages.css';

const Ayurveda = () => {
  const { t } = useLanguage();

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={`${t('ay_title')} | Deergayu`}
        description={t('ay_subtitle')}
        url="https://deergayu.com/ayurveda"
        canonical="https://deergayu.com/ayurveda"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('ay_title')}</h1>
          <p className="pub-lead">{t('ay_subtitle')}</p>
          <div className="pub-actions">
            <Link to="/doctors" className="btn btn-primary">
              {t('ay_cta_doctor')}
            </Link>
            <Link to="/online-consultation" className="btn btn-outline">
              {t('ay_cta_online')}
            </Link>
          </div>
        </div>
      </section>

    <section className="pub-section">
      <div className="container">
        <h2>How booking works</h2>
        <p className="pub-sub">Simple steps using the existing Deergayu booking flow.</p>
        <ol className="pub-steps">
          <li>
            <span className="num">1</span>
            <div>
              <strong>Choose a provider</strong>
              <p>Browse approved doctors and specialties.</p>
            </div>
          </li>
          <li>
            <span className="num">2</span>
            <div>
              <strong>Pick a session</strong>
              <p>Select an available date and time from the provider schedule.</p>
            </div>
          </li>
          <li>
            <span className="num">3</span>
            <div>
              <strong>Request your appointment</strong>
              <p>Submit a booking request. The provider confirms or responds through Deergayu.</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section className="pub-section">
      <div className="container pub-grid-3">
        <div className="pub-card">
          <h3>Find a doctor</h3>
          <p>Search approved providers and open a profile before you book.</p>
          <Link to="/doctors">Browse doctors →</Link>
        </div>
        <div className="pub-card">
          <h3>Educational guide</h3>
          <p>Read published remedies and routines from the Deergayu guide.</p>
          <Link to="/ayurvedic-guide">Open guide →</Link>
        </div>
        <div className="pub-card">
          <h3>Shop herbal products</h3>
          <p>Browse approved store products when you need wellness supplies.</p>
          <Link to="/shop">Visit shop →</Link>
        </div>
      </div>
    </section>

    <section className="pub-section">
      <div className="container">
        <div className="pub-note">
          <strong>Safety note:</strong> Ayurveda content on Deergayu is educational and booking
          support only. It is not a substitute for emergency care. For urgent symptoms, seek
          immediate medical help.
        </div>
      </div>
    </section>
  </div>
  );
};

export default Ayurveda;
