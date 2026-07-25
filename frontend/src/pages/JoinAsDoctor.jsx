import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './PublicPages.css';

const JoinAsDoctor = () => (
  <div className="pub-page animate-fade-in">
    <SEO
      title="Join as a Doctor | Deergayu"
      description="Register as a healthcare provider on Deergayu. Free registration at launch, no monthly subscription — commercial terms agreed per provider."
      url="https://deergayu.com/join-as-doctor"
      canonical="https://deergayu.com/join-as-doctor"
    />
    <section className="pub-hero">
      <div className="container">
        <h1>Join Deergayu as a doctor</h1>
        <p className="pub-si">නොමිලේ ලියාපදිංචිය — දියුණුවට එක්වන්න</p>
        <p className="pub-lead">
          Free registration. No monthly subscription at launch. Deergayu earns when successful
          consultations and bookings occur. Consultation pricing and provider payout are agreed and
          configured per provider — not a single universal contract for everyone.
        </p>
        <div className="pub-actions">
          <Link to="/login?mode=signup&role=doctor" className="btn btn-primary">
            Create provider account
          </Link>
          <Link to="/contact" className="btn btn-outline">
            Ask a question
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

export default JoinAsDoctor;
