import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import SEO from '../components/SEO';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
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

const SUBJECTS = [
  { value: 'General Inquiry', labelKey: 'contact_subject_general' },
  { value: 'Order / Shop Support', labelKey: 'contact_subject_order' },
  { value: 'Doctor Channeling', labelKey: 'contact_subject_channeling' },
  { value: 'Astrology / Yantra', labelKey: 'contact_subject_astrology' },
  { value: 'Vendor / Partnership', labelKey: 'contact_subject_vendor' },
  { value: 'Other', labelKey: 'contact_subject_other' },
];

const Contact = () => {
  const { success, error } = useToast();
  const { t } = useLanguage();
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
      error(t('contact_required_error'));
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
      if (!res.ok) throw new Error(data.error || data.message || t('contact_send_error'));
      success(t('contact_success'));
      setForm({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      error(err.message || t('contact_send_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const waHref = `https://wa.me/${PUBLIC_CHANNELS.whatsapp.e164}?text=${encodeURIComponent(t('contact_whatsapp_preset'))}`;

  return (
    <div className="legal-page animate-fade-in">
      <SEO
        title={t('contact_seo_title')}
        description={t('contact_seo_desc')}
        url="https://deergayu.com/contact"
        canonical="https://deergayu.com/contact"
      />
      <div className="container">
        <div className="legal-hero">
          <h1>{t('contact_title')}</h1>
          <p>{t('contact_intro')}</p>
        </div>

        <div className="contact-layout">
          <aside className="contact-info glass-panel">
            <h2>{t('contact_get_in_touch')}</h2>
            <p>{t('contact_get_in_touch_body')}</p>

            <a className="contact-wa-btn" href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp {PUBLIC_CHANNELS.whatsapp.label}
            </a>

            <div className="contact-detail">
              <span>
                <Phone size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                {t('contact_phone')}
              </span>
              <a href={`tel:${PUBLIC_CHANNELS.phone.display}`}>{PUBLIC_CHANNELS.phone.label}</a>
            </div>

            <div className="contact-detail">
              <span>
                <Mail size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                {t('contact_email')}
              </span>
              {settingsLoaded && contactEmail ? (
                <a href={`mailto:${contactEmail}`} className="contact-email-line">
                  {contactEmail}
                </a>
              ) : settingsLoaded ? (
                <strong>{t('contact_email_unavailable')}</strong>
              ) : (
                <span>{t('common_loading')}</span>
              )}
            </div>

            <div className="contact-detail">
              <span>
                <MapPin size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} aria-hidden="true" />
                {t('contact_location')}
              </span>
              <strong>{t('contact_sri_lanka')}</strong>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              <Link to="/faq">{t('nav_faq')}</Link>
              {' · '}
              <Link to="/privacy">{t('footer_privacy')}</Link>
              {' · '}
              <Link to="/refund-policy">{t('contact_refunds')}</Link>
            </p>
          </aside>

          <form className="contact-form glass-panel" onSubmit={handleSubmit}>
            <h2 className="contact-form-title">{t('contact_form_title')}</h2>
            <p className="contact-form-sub">{t('contact_form_subtitle')}</p>

            <div className="form-group">
              <label htmlFor="contact-name">{t('contact_name')} *</label>
              <input
                id="contact-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder={t('contact_name_ph')}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact-email">{t('contact_email')} *</label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder={t('contact_email_ph')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-phone">{t('contact_phone')}</label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder={t('contact_phone_ph')}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="contact-subject">{t('contact_subject')} *</label>
              <select
                id="contact-subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">{t('contact_message')} *</label>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={5}
                placeholder={t('contact_message_ph')}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('contact_sending') : t('contact_submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
