import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import './PublicPages.css';

const About = () => {
  const { t } = useLanguage();

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={t('about_seo_title')}
        description={t('about_lead')}
        url="https://deergayu.com/about"
        canonical="https://deergayu.com/about"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('about_title')}</h1>
          <p className="pub-lead">{t('about_lead')}</p>
        </div>
      </section>

      <section className="pub-section">
        <div className="container pub-grid-2">
          <div className="pub-card">
            <h3>{t('about_mission_title')}</h3>
            <p>{t('about_mission_body')}</p>
          </div>
          <div className="pub-card">
            <h3>{t('about_vision_title')}</h3>
            <p>{t('about_vision_body')}</p>
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div className="container">
          <h2>{t('about_why_title')}</h2>
          <div className="pub-grid-3" style={{ marginTop: '1.25rem' }}>
            <div className="pub-card">
              <h3>{t('about_card1_title')}</h3>
              <p>{t('about_card1_body')}</p>
            </div>
            <div className="pub-card">
              <h3>{t('about_card2_title')}</h3>
              <p>{t('about_card2_body')}</p>
            </div>
            <div className="pub-card">
              <h3>{t('about_card3_title')}</h3>
              <p>{t('about_card3_body')}</p>
            </div>
          </div>
          <div className="pub-actions" style={{ marginTop: '1.5rem' }}>
            <Link to="/doctors" className="btn btn-primary">
              {t('nav_find_doctor')}
            </Link>
            <Link to="/join-as-doctor" className="btn btn-outline">
              {t('nav_join_doctor')}
            </Link>
            <Link to="/contact" className="btn btn-outline">
              {t('contact_us')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
