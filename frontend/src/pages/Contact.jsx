import React, { useState } from 'react';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';
import './LegalPages.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Contact = () => {
  const { success, error } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      error('Please fill in name, email, and message.');
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
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      success('Message sent successfully! We will get back to you soon.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      error(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="legal-page animate-fade-in">
      <SEO
        title="Contact Us | Deergayu"
        description="Contact Deergayu Ayurvedic platform in Sri Lanka. Phone 0762209299 · info@deergayu.com"
        url="https://deergayu.com/contact"
        canonical="https://deergayu.com/contact"
      />
      <div className="container">
        <div className="legal-hero">
          <h1>Contact Us</h1>
          <p>Questions about products, bookings, or your account? We are here to help.</p>
        </div>

        <div className="contact-layout">
          <aside className="contact-info glass-panel">
            <h2>Get in touch</h2>
            <p>
              Reach the Deergayu team for shop orders, channeling support, partnerships, or general inquiries.
            </p>
            <div className="contact-detail">
              <span>Phone</span>
              <a href="tel:0762209299">0762209299</a>
            </div>
            <div className="contact-detail">
              <span>Email</span>
              <a href="mailto:info@deergayu.com">info@deergayu.com</a>
            </div>
            <div className="contact-detail">
              <span>Location</span>
              <strong>Sri Lanka</strong>
            </div>
          </aside>

          <form className="contact-form glass-panel" onSubmit={handleSubmit}>
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
            <div className="form-group">
              <label htmlFor="contact-subject">Subject</label>
              <input
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                placeholder="How can we help?"
              />
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
                placeholder="Write your message..."
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
