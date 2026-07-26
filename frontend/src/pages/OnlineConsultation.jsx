import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import './PublicPages.css';

const OnlineConsultation = () => {
  const { t } = useLanguage();

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={`${t('oc_title')} | Deergayu`}
        description={t('oc_subtitle')}
        url="https://deergayu.com/online-consultation"
        canonical="https://deergayu.com/online-consultation"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('oc_title')}</h1>
          <p className="pub-lead">{t('oc_subtitle')}</p>
          <div className="pub-actions">
            <Link to="/doctors?type=video" className="btn btn-primary">
              {t('oc_cta')}
            </Link>
            <Link to="/faq" className="btn btn-outline">
              {t('oc_cta_secondary')}
            </Link>
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div className="container">
          <h2>{t('oc_how_title')}</h2>
          <ol className="pub-steps">
            <li>
              <span className="num">1</span>
              <div>
                <strong>{t('oc_step1_title')}</strong>
                <p>{t('oc_step1_body')}</p>
              </div>
            </li>
            <li>
              <span className="num">2</span>
              <div>
                <strong>{t('oc_step2_title')}</strong>
                <p>{t('oc_step2_body')}</p>
              </div>
            </li>
            <li>
              <span className="num">3</span>
              <div>
                <strong>{t('oc_step3_title')}</strong>
                <p>{t('oc_step3_body')}</p>
              </div>
            </li>
            <li>
              <span className="num">4</span>
              <div>
                <strong>{t('oc_step4_title')}</strong>
                <p>{t('oc_step4_body')}</p>
              </div>
            </li>
            <li>
              <span className="num">5</span>
              <div>
                <strong>{t('oc_step5_title')}</strong>
                <p>{t('oc_step5_body')}</p>
              </div>
            </li>
          </ol>
          <p className="pub-note" style={{ marginTop: '1.5rem' }}>
            {t('oc_payment_note')}
          </p>
        </div>
      </section>
    </div>
  );
};

export default OnlineConsultation;
