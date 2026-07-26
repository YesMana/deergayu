import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import './PublicPages.css';

const JoinAsDoctor = () => {
  const { t } = useLanguage();

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={`${t('jad_title')} | Deergayu`}
        description={t('jad_subtitle')}
        url="https://deergayu.com/join-as-doctor"
        canonical="https://deergayu.com/join-as-doctor"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('jad_title')}</h1>
          <p className="pub-lead">{t('jad_subtitle')}</p>
          <div className="pub-actions">
            <Link to="/login?mode=signup&role=doctor" className="btn btn-primary">
              {t('jad_cta_register')}
            </Link>
            <Link to="/contact" className="btn btn-outline">
              {t('jad_cta_question')}
            </Link>
          </div>
        </div>
      </section>

    <section className="pub-section">
      <div className="container">
        <h2>Onboarding steps</h2>
        <p className="pub-sub">Approval is required before you appear in the public directory.</p>
        <ol className="pub-steps">
          <li>
            <span className="num">1</span>
            <div>
              <strong>Create account</strong>
              <p>Sign up with the doctor (or related provider) role.</p>
            </div>
          </li>
          <li>
            <span className="num">2</span>
            <div>
              <strong>Submit professional details</strong>
              <p>Profile, specialties, qualifications, and contact information for verification.</p>
            </div>
          </li>
          <li>
            <span className="num">3</span>
            <div>
              <strong>Verification</strong>
              <p>An admin reviews your submission. Pending providers are not listed publicly.</p>
            </div>
          </li>
          <li>
            <span className="num">4</span>
            <div>
              <strong>Configure availability</strong>
              <p>Set working days and slot duration in your provider dashboard.</p>
            </div>
          </li>
          <li>
            <span className="num">5</span>
            <div>
              <strong>Commercial terms agreed</strong>
              <p>
                Patient fee, provider payout, and platform share are configured explicitly per
                consultation type. Suggested templates are never applied silently.
              </p>
            </div>
          </li>
          <li>
            <span className="num">6</span>
            <div>
              <strong>Profile approved</strong>
              <p>Once approved, your public profile can receive bookings.</p>
            </div>
          </li>
          <li>
            <span className="num">7</span>
            <div>
              <strong>Receive bookings</strong>
              <p>Manage appointment requests from your dashboard.</p>
            </div>
          </li>
        </ol>
        <p className="pub-note" style={{ marginTop: '1.5rem' }}>
          Clinics and organisations can also register via the same signup flow, or send an enquiry
          on <Link to="/join-as-clinic">Join as a clinic</Link>.
        </p>
      </div>
    </section>
  </div>
  );
};

export default JoinAsDoctor;
