import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';
import './LegalPages.css';
import { API_URL } from '../config/api';

/** Public customer channels already published on deergayu.com (not private admin inboxes). */
const PUBLIC_CHANNELS = {
  whatsapp: {
    label: '071 990 9299',
    display: '0719909299',
    e164: '94719909299',
  },
  phone: {
    label: '076 220 9299',
    display: '0762209299',
  },
};

const WA_PRESET = 'Hi Deergayu — I have an inquiry from the Contact page.';

const SUBJECTS = [
  'General Inquiry',
  'Order / Shop Support',
  'Doctor Channeling',
  'Astrology / Yantra',
  'Vendor / Partnership',
  'Other',
];

const Contact = () => {
  const { success, error } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront-settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.contactEmail) setContactEmail(String(data.contactEmail).trim());
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      error('Please fill in name, email, subject, and message.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send message');
      success('Inquiry sent! We will get back to you soon.');
      setForm({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      error(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  const waHref = `https://wa.me/${PUBLIC_CHANNELS.whatsapp.e164}?text=${encodeURIComponent(WA_PRESET)}`;

  return (
    <div className="legal-page animate-fade-in">
      <SEO
        title="Contact Us | Deergayu"
        description="Contact Deergayu — WhatsApp, phone, email from storefront settings, or send an inquiry about bookings and shop support."
        url="https://deergayu.com/contact"
        canonical="https://deergayu.com/contact"
      />
      <div className="container">
        <div className="legal-hero">
          <h1>Contact Us</h1>
          <p>Questions about products, bookings, or your account? Reach us directly or send an inquiry.</p>
        </div>

        <div className="contact-layout">
          <aside className="contact-info glass-panel">
            <h2>Get in touch</h2>
            <p>
              Chat on WhatsApp for a quick reply, call us, or use the email published in storefront
              settings. You can also send a written inquiry.
            </p>

            <a className="contact-wa-btn" href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp {PUBLIC_CHANNELS.whatsapp.label}
            </a>

            <div className="contact-detail">
              <span>
                <Phone size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                Phone
              </span>
              <a href={`tel:${PUBLIC_CHANNELS.phone.display}`}>{PUBLIC_CHANNELS.phone.label}</a>
            </div>

            <div className="contact-detail">
              <span>
                <Mail size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                Email
              </span>
              {settingsLoaded && contactEmail ? (
                <a href={`mailto:${contactEmail}`} className="contact-email-line">
                  {contactEmail}
                </a>
              ) : settingsLoaded ? (
                <strong>Use the inquiry form — public email not configured in storefront settings.</strong>
              ) : (
                <span>Loading…</span>
              )}
            </div>

            <div className="contact-detail">
              <span>
                <MapPin size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                Location
              </span>
              <strong>Sri Lanka</strong>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              <Link to="/faq">FAQ</Link>
              {' · '}
              <Link to="/privacy">Privacy</Link>
              {' · '}
              <Link to="/refund-policy">Refunds</Link>
            </p>
          </aside>

          <form className="contact-form glass-panel" onSubmit={handleSubmit}>
            <h2 className="contact-form-title">Send an inquiry</h2>
            <p className="contact-form-sub">Subject + message go to the Deergayu contact desk.</p>

            <div className="form-group">
              <label htmlFor="contact-name">Name *</label>
              <input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your full name"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact-email">Email *</label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-phone">Phone</label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="e.g. 077 123 4567"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="contact-subject">Subject *</label>
              <select
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">Message *</label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Write your inquiry..."
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Inquiry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
