import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import './PublicPages.css';

const OnlineConsultation = () => {
  const { t } = useLanguage();

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={`${t('oc_title')} | Deergayu`}
        description={t('oc_subtitle')}
        url="https://deergayu.com/online-consultation"
        canonical="https://deergayu.com/online-consultation"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('oc_title')}</h1>
          <p className="pub-lead">{t('oc_subtitle')}</p>
          <div className="pub-actions">
            <Link to="/doctors?type=video" className="btn btn-primary">
              {t('oc_cta')}
            </Link>
            <Link to="/faq" className="btn btn-outline">
              {t('oc_cta_secondary')}
            </Link>
          </div>
        </div>
      </section>

    <section className="pub-section">
      <div className="container">
        <h2>How it works</h2>
        <ol className="pub-steps">
          <li>
            <span className="num">1</span>
            <div>
              <strong>Create an account</strong>
              <p>Sign up as a patient on Deergayu.</p>
            </div>
          </li>
          <li>
            <span className="num">2</span>
            <div>
              <strong>Select a doctor</strong>
              <p>Use Find a Doctor or Channeling to choose an approved provider.</p>
            </div>
          </li>
          <li>
            <span className="num">3</span>
            <div>
              <strong>Choose consultation type & time</strong>
              <p>Pick an available slot and note whether the visit is in person or video.</p>
            </div>
          </li>
          <li>
            <span className="num">4</span>
            <div>
              <strong>Booking & confirmation</strong>
              <p>
                Submit the request. You receive updates when the provider accepts or declines. Online
                payment for appointments may be introduced later; current bookings follow the live
                Deergayu booking flow.
              </p>
            </div>
          </li>
          <li>
            <span className="num">5</span>
            <div>
              <strong>Consultation & follow-up</strong>
              <p>Attend as confirmed. Manage appointments from your patient account.</p>
            </div>
          </li>
        </ol>
        <p className="pub-note" style={{ marginTop: '1.5rem' }}>
          Payment for consultations: when online appointment payments are enabled in a future
          release, you will pay through Deergayu&apos;s secure payment flow. Until then, follow the
          instructions shown at booking time.
        </p>
      </div>
    </section>
  </div>
  );
};

export default OnlineConsultation;
