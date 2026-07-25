import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './PublicPages.css';

const FAQS = [
  {
    q: 'How do I book a doctor?',
    a: 'Create a patient account, open Find a Doctor or Channeling, choose a provider and available time, then submit a booking request. The provider confirms through Deergayu.',
  },
  {
    q: 'How do I create an account?',
    a: 'Use Login / Sign Up, choose the patient role for booking, and complete registration. Providers register separately and require approval.',
  },
  {
    q: 'Can I cancel an appointment?',
    a: 'Yes — open My Appointments and cancel if the appointment is not already completed. Provider and admin status updates may also apply.',
  },
  {
    q: 'How will I receive confirmation?',
    a: 'You can track status in My Appointments. Email notifications may be sent when the system is configured to notify you of status changes.',
  },
  {
    q: 'What is an online consultation?',
    a: 'When booking, you may select a consultation type such as in person or video. Deergayu records the booking; a built-in live video studio inside the app is not required for the current booking flow.',
  },
  {
    q: 'How do I contact Deergayu?',
    a: 'Use the Contact page for the form and any public phone, email, or WhatsApp links published in storefront settings.',
  },
  {
    q: 'How are doctors and providers approved?',
    a: 'Provider accounts submit professional details and remain pending until an admin reviews and approves them. Only approved providers appear in the public directory.',
  },
  {
    q: 'How do refunds work?',
    a: 'Shop and service refunds follow the Refund Policy. Online appointment payments may be introduced later; until then, follow the policy page and contact support for help with a specific order or booking.',
  },
];

const FAQ = () => (
  <div className="pub-page animate-fade-in">
    <SEO
      title="FAQ | Deergayu"
      description="Frequently asked questions about booking doctors, accounts, and support on Deergayu."
      url="https://deergayu.com/faq"
      canonical="https://deergayu.com/faq"
    />
    <section className="pub-hero">
      <div className="container">
        <h1>Frequently asked questions</h1>
        <p className="pub-lead">Answers reflect current Deergayu functionality and policies.</p>
      </div>
    </section>
    <section className="pub-section">
      <div className="container faq-list">
        {FAQS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
        <p className="pub-note" style={{ marginTop: '1.25rem' }}>
          Still need help? <Link to="/contact">Contact support</Link> ·{' '}
          <Link to="/refund-policy">Refund policy</Link>
        </p>
      </div>
    </section>
  </div>
);

export default FAQ;
