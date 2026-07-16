import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';
import './LegalPages.css';

const API_URL = import.meta.env.VITE_API_URL || '';

/** Public customer contact channels */
const CONTACTS = {
  whatsapp: {
    label: '071 990 9299',
    display: '0719909299',
    e164: '94719909299',
  },
  phone: {
    label: '076 220 9299',
    display: '0762209299',
  },
  emails: [
    { label: 'info@deergayu.com', href: 'mailto:info@deergayu.com' },
    { label: 'support@deergayu.com', href: 'mailto:support@deergayu.com' },
  ],
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

  const waHref = `https://wa.me/${CONTACTS.whatsapp.e164}?text=${encodeURIComponent(WA_PRESET)}`;

  return (
    <div className="legal-page animate-fade-in">
      <SEO
        title="Contact Us | Deergayu"
        description="Contact Deergayu — WhatsApp, phone, email, or send an inquiry. We help with shop, channeling, and partnerships."
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
              Chat on WhatsApp for the fastest reply, call us, or email. You can also send a written inquiry —
              our team reviews every message in the admin desk.
            </p>

            <a className="contact-wa-btn" href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} />
              WhatsApp {CONTACTS.whatsapp.label}
            </a>

            <div className="contact-detail">
              <span>
                <Phone size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                Phone
              </span>
              <a href={`tel:${CONTACTS.phone.display}`}>{CONTACTS.phone.label}</a>
            </div>

            <div className="contact-detail">
              <span>
                <Mail size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                Email
              </span>
              {CONTACTS.emails.map((e) => (
                <a key={e.href} href={e.href} className="contact-email-line">
                  {e.label}
                </a>
              ))}
            </div>

            <div className="contact-detail">
              <span>
                <MapPin size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
                Location
              </span>
              <strong>Sri Lanka</strong>
            </div>
          </aside>

          <form className="contact-form glass-panel" onSubmit={handleSubmit}>
            <h2 className="contact-form-title">Send an inquiry</h2>
            <p className="contact-form-sub">Subject + message go straight to the Deergayu team.</p>

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
