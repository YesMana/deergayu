import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/api';
import './PublicPages.css';

/**
 * Clinic directory / multi-doctor management is not first-class yet.
 * This page offers signup (clinic role) + an enquiry form via /api/contact.
 */
const JoinAsClinic = () => {
  const { success, error } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

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
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: 'Clinic / Partnership Interest',
          message: form.message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to send');
      success('Interest submitted. Our team will review and follow up.');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      error(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title="Join as a Clinic | Deergayu"
        description="Register clinic interest with Deergayu. Full multi-location clinic management is expanding — start with clinic role signup or an enquiry."
        url="https://deergayu.com/join-as-clinic"
        canonical="https://deergayu.com/join-as-clinic"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>Clinic &amp; partnership interest</h1>
          <p className="pub-lead">
            Deergayu supports clinic-role accounts for providers. A full public hospital/clinic
            directory and multi-doctor facility management are not complete yet — we do not list
            fake clinics. You can create a clinic account for review, or send an interest enquiry.
          </p>
          <div className="pub-actions">
            <Link to="/login?mode=signup&role=clinic" className="btn btn-primary">
              Register clinic account
            </Link>
            <Link to="/join-as-doctor" className="btn btn-outline">
              Join as a doctor
            </Link>
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div className="container" style={{ maxWidth: 560 }}>
          <h2>Send an enquiry</h2>
          <p className="pub-sub">Uses the same contact desk as the public Contact page.</p>
          <form onSubmit={handleSubmit} className="pub-card" style={{ display: 'grid', gap: '0.85rem' }}>
            <div>
              <label htmlFor="clinic-name">Clinic / organisation name</label>
              <input
                id="clinic-name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                style={{ width: '100%', minHeight: 44, marginTop: 4, padding: '0.65rem' }}
              />
            </div>
            <div>
              <label htmlFor="clinic-email">Email</label>
              <input
                id="clinic-email"
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                style={{ width: '100%', minHeight: 44, marginTop: 4, padding: '0.65rem' }}
              />
            </div>
            <div>
              <label htmlFor="clinic-phone">Phone (optional)</label>
              <input
                id="clinic-phone"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                style={{ width: '100%', minHeight: 44, marginTop: 4, padding: '0.65rem' }}
              />
            </div>
            <div>
              <label htmlFor="clinic-message">How would you like to partner?</label>
              <textarea
                id="clinic-message"
                name="message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                required
                style={{ width: '100%', marginTop: 4, padding: '0.65rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit interest'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default JoinAsClinic;
