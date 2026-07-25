import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './PublicPages.css';

const About = () => (
  <div className="pub-page animate-fade-in">
    <SEO
      title="About Deergayu"
      description="Deergayu is a Sri Lankan digital healthcare and Ayurveda platform connecting patients with healthcare providers and wellness services."
      url="https://deergayu.com/about"
      canonical="https://deergayu.com/about"
    />
    <section className="pub-hero">
      <div className="container">
        <h1>About Deergayu</h1>
        <p className="pub-lead">
          Deergayu is a Sri Lankan digital healthcare and Ayurveda platform connecting patients with
          healthcare providers and wellness services.
        </p>
      </div>
    </section>

    <section className="pub-section">
      <div className="container pub-grid-2">
        <div className="pub-card">
          <h3>Mission</h3>
          <p>
            Make it easier for people in Sri Lanka to find approved providers, book consultations,
            and access wellness products and educational content in one place.
          </p>
        </div>
        <div className="pub-card">
          <h3>Vision</h3>
          <p>
            A trusted digital path where modern booking technology and Ayurveda care can coexist —
            accessible, clear, and respectful of professional standards.
          </p>
        </div>
      </div>
    </section>

    <section className="pub-section">
      <div className="container">
        <h2>Why Deergayu</h2>
        <div className="pub-grid-3" style={{ marginTop: '1.25rem' }}>
          <div className="pub-card">
            <h3>Healthcare + Ayurveda</h3>
            <p>Discover providers and educational content alongside a wellness shop.</p>
          </div>
          <div className="pub-card">
            <h3>Accessibility</h3>
            <p>Mobile-friendly booking and account tools designed for everyday use.</p>
          </div>
          <div className="pub-card">
            <h3>Technology & trust</h3>
            <p>
              Providers are reviewed before approval. We avoid unsupported “#1” or “largest”
              claims.
            </p>
          </div>
        </div>
        <div className="pub-actions" style={{ marginTop: '1.5rem' }}>
          <Link to="/doctors" className="btn btn-primary">
            Find a Doctor
          </Link>
          <Link to="/join-as-doctor" className="btn btn-outline">
            Join as a doctor
          </Link>
          <Link to="/contact" className="btn btn-outline">
            Contact us
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default About;
