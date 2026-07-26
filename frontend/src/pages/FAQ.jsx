import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import './PublicPages.css';

const FAQS = [
  { q: 'faq_q1', a: 'faq_a1' },
  { q: 'faq_q2', a: 'faq_a2' },
  { q: 'faq_q3', a: 'faq_a3' },
  { q: 'faq_q4', a: 'faq_a4' },
  { q: 'faq_q5', a: 'faq_a5' },
  { q: 'faq_q6', a: 'faq_a6' },
  { q: 'faq_q7', a: 'faq_a7' },
  { q: 'faq_q8', a: 'faq_a8' },
];

const FAQ = () => {
  const { t } = useLanguage();

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={t('faq_seo_title')}
        description={t('faq_seo_desc')}
        url="https://deergayu.com/faq"
        canonical="https://deergayu.com/faq"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('faq_title')}</h1>
          <p className="pub-lead">{t('faq_subtitle')}</p>
        </div>
      </section>
      <section className="pub-section">
        <div className="container faq-list">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{t(item.q)}</summary>
              <p>{t(item.a)}</p>
            </details>
          ))}
          <p className="pub-note" style={{ marginTop: '1.25rem' }}>
            {t('faq_still_need_help')}{' '}
            <Link to="/contact">{t('home_contact_support')}</Link> ·{' '}
            <Link to="/refund-policy">{t('footer_refund')}</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
