import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';
import './LanguagePopup.css';

const LanguagePopup = () => {
  const { hasChosen, setLanguage } = useLanguage();

  if (hasChosen) return null;

  return (
    <div className="language-overlay animate-fade-in">
      <div className="language-modal glass-panel">
        <div className="language-modal-icon">
          <Globe size={48} color="var(--primary-color)" />
        </div>
        <h2>Select Your Language</h2>
        <p>කරුණාකර ඔබගේ භාෂාව තෝරන්න / தயவுசெய்து உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்</p>
        
        <div className="language-options">
          <button 
            className="lang-btn" 
            onClick={() => setLanguage('si')}
          >
            <span className="lang-code">SI</span>
            <span className="lang-name">සිංහල</span>
          </button>
          
          <button 
            className="lang-btn" 
            onClick={() => setLanguage('ta')}
          >
            <span className="lang-code">TA</span>
            <span className="lang-name">தமிழ்</span>
          </button>
          
          <button 
            className="lang-btn" 
            onClick={() => setLanguage('en')}
          >
            <span className="lang-code">EN</span>
            <span className="lang-name">English</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguagePopup;
