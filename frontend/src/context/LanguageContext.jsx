import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

/**
 * Safe translator: requested lang → English → key string.
 * Never returns undefined/null/[object Object].
 */
export function translate(lang, key) {
  if (key == null || key === '') return '';
  const k = String(key);
  const fromLang = translations[lang]?.[k];
  if (fromLang != null && fromLang !== '') return fromLang;
  const fromEn = translations.en?.[k];
  if (fromEn != null && fromEn !== '') return fromEn;
  return k;
}

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(localStorage.getItem('appLang') || 'en');
  const [hasChosen, setHasChosen] = useState(!!localStorage.getItem('appLang'));

  useEffect(() => {
    document.documentElement.lang = lang;
    document.body.classList.remove('lang-en', 'lang-si', 'lang-ta');
    document.body.classList.add(`lang-${lang}`);
  }, [lang]);

  const setLanguage = useCallback((selectedLang) => {
    const next = ['en', 'si', 'ta'].includes(selectedLang) ? selectedLang : 'en';
    setLangState(next);
    setHasChosen(true);
    localStorage.setItem('appLang', next);
  }, []);

  const toggleLanguage = useCallback(() => {
    const sequence = ['en', 'si', 'ta'];
    const nextIndex = (sequence.indexOf(lang) + 1) % sequence.length;
    setLanguage(sequence[nextIndex]);
  }, [lang, setLanguage]);

  const t = useCallback((key) => translate(lang, key), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage, hasChosen, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};
