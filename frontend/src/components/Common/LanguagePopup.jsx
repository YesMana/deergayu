import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';
import './LanguagePopup.css';

const LanguagePopup = () => {
  const { hasChosen, setLanguage, t } = useLanguage();

  if (hasChosen) return null;

  return (
    <div className="language-overlay animate-fade-in">
      <div className="language-modal glass-panel">
        <div className="language-modal-icon">
          <Globe size={48} color="var(--primary-color)" />
        </div>
        <h2>{t('lang_select_title')}</h2>
        <p>{t('lang_english')} / {t('lang_sinhala')} / {t('lang_tamil')}</p>
        
        <div className="language-options">
          <button 
            className="lang-btn" 
            onClick={() => setLanguage('si')}
          >
            <span className="lang-code">SI</span>
            <span className="lang-name">{t('lang_sinhala')}</span>
          </button>
          
          <button 
            className="lang-btn" 
            onClick={() => setLanguage('ta')}
          >
            <span className="lang-code">TA</span>
            <span className="lang-name">{t('lang_tamil')}</span>
          </button>
          
          <button 
            className="lang-btn" 
            onClick={() => setLanguage('en')}
          >
            <span className="lang-code">EN</span>
            <span className="lang-name">{t('lang_english')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguagePopup;
