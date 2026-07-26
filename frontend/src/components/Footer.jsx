import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import SocialLinks from './SocialLinks';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

const Footer = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <Leaf size={22} aria-hidden="true" />
            <span>Deergayu</span>
          </Link>
          <p>{t('footer_desc')}</p>
          <SocialLinks variant="footer" />
        </div>

        <nav className="footer-nav" aria-label={t('footer_aria')}>
          <div className="footer-col">
            <h4>{t('footer_care')}</h4>
            <Link to="/doctors">{t('nav_find_doctor')}</Link>
            <Link to="/channeling">{t('footer_book_channel')}</Link>
            <Link to="/ayurveda">{t('nav_ayurveda')}</Link>
            <Link to="/specialties">{t('spec_page_title')}</Link>
            <Link to="/online-consultation">{t('nav_online_consult')}</Link>
          </div>
          <div className="footer-col">
            <h4>{t('footer_explore')}</h4>
            <Link to="/shop">{t('footer_shop')}</Link>
            <Link to="/ayurvedic-guide">{t('footer_guide_articles')}</Link>
            <Link to="/videos">{t('nav_videos')}</Link>
            <Link to="/about">{t('nav_about')}</Link>
            <Link to="/join-as-doctor">{t('nav_join_doctor')}</Link>
          </div>
          <div className="footer-col">
            <h4>{t('footer_support')}</h4>
            <Link to="/contact">{t('nav_contact')}</Link>
            <Link to="/faq">{t('nav_faq')}</Link>
            <Link to="/privacy">{t('footer_privacy')}</Link>
            <Link to="/terms">{t('footer_terms')}</Link>
            <Link to="/refund-policy">{t('footer_refund')}</Link>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {year} Deergayu. {t('footer_rights')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
