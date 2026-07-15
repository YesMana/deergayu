import React, { createContext, useState, useContext, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const translations: Record<string, Record<string, string>> = {
  en: {
    nav_home: "Home",
    nav_shop: "Ayurvedic Shop",
    nav_channeling: "Channeling",
    nav_videos: "Videos",
    nav_guide: "Guide",
    nav_symptoms: "Symptom Checker",
    nav_admin: "Admin Dashboard",
    nav_login: "Login",
    nav_more: "More",
    nav_wishlist: "Wishlist",
    hero_title: "Discover Ancient Healing with Deergayu",
    hero_subtitle: "Your trusted platform for authentic Ayurvedic medicines, expert doctor channeling, and profound astrological guidance.",
    btn_shop: "Shop Medicines",
    btn_book: "Book Appointment",
    btn_watch: "Watch",
    services_title: "Our Services",
    srv_shop_title: "Ayurvedic Shop",
    srv_shop_desc: "Authentic and verified Ayurvedic medicines delivered to your doorstep.",
    srv_doc_title: "Doctor Channeling",
    srv_doc_desc: "Consult with Sri Lanka's top Ayurvedic physicians online or in-person.",
    srv_astro_title: "Astrology & Vastu",
    srv_astro_desc: "Consult experienced astrologers and Vastu experts for life guidance.",
    guide_sub: "Same remedies as deergayu.com",
    videos_sub: "Same library as the website",
    empty_guide: "No remedies yet",
    empty_videos: "No videos yet",
    empty_astro: "No astrologers found",
    offline_title: "You're offline",
    offline_sub: "Tap to retry · some actions need a connection",
  },
  si: {
    nav_home: "මුල් පිටුව",
    nav_shop: "ආයුර්වේද ඔසුසල",
    nav_channeling: "චැනලින් සේවා",
    nav_videos: "වීඩියෝ",
    nav_guide: "මාර්ගෝපදේශය",
    nav_symptoms: "රෝග ලක්ෂණ පරීක්ෂාව",
    nav_admin: "පරිපාලන පැනලය",
    nav_login: "ඇතුල් වන්න",
    nav_more: "තවත්",
    nav_wishlist: "ප්‍රියතම ලැයිස්තුව",
    hero_title: "දීර්ඝායු සමගින් පෞරාණික ආයුර්වේද සුවය අත්විඳින්න",
    hero_subtitle: "විශ්වාසවන්ත ආයුර්වේද ඖෂධ, ප්‍රවීණ වෛද්‍යවරුන් චැනල් කිරීම සහ ජ්‍යොතිෂ්‍ය සේවා සඳහා ඔබේ විශ්වාසවන්ත වේදිකාව.",
    btn_shop: "ඖෂධ මිලදී ගන්න",
    btn_book: "වෙලාවක් වෙන්කරගන්න",
    btn_watch: "නරඹන්න",
    services_title: "අපගේ සේවාවන්",
    srv_shop_title: "ආයුර්වේද ඔසුසල",
    srv_shop_desc: "උසස්ම තත්ත්වයේ, පිරිසිදු ආයුර්වේද ඖෂධ නිවසටම ගෙන්වා ගන්න.",
    srv_doc_title: "වෛද්‍ය චැනලින්",
    srv_doc_desc: "ශ්‍රී ලංකාවේ ප්‍රවීණතම ආයුර්වේද වෛද්‍යවරුන් මාර්ගගතව හෝ ඍජුවම හමුවන්න.",
    srv_astro_title: "ජ්‍යොතිෂ්‍ය සහ වාස්තු",
    srv_astro_desc: "ජීවිත මාර්ගෝපදේශනය සඳහා ප්‍රවීණ ජ්‍යොතිෂ්‍ය හා වාස්තු විද්‍යාඥයන් හමුවන්න.",
    guide_sub: "deergayu.com හි එකම පිළියම්",
    videos_sub: "වෙබ් අඩවියේම වීඩියෝ ලැයිස්තුව",
    empty_guide: "තවම පිළියම් නැත",
    empty_videos: "තවම වීඩියෝ නැත",
    empty_astro: "ජ්‍යොතිෂ්‍යවරුන් හමු නොවීය",
    offline_title: "ඔබ ඕෆ්ලයින්",
    offline_sub: "නැවත උත්සාහ කිරීමට තට්ටු කරන්න",
  },
  ta: {
    nav_home: "முகப்பு",
    nav_shop: "ஆயுர்வேத கடை",
    nav_channeling: "மருத்துவர் ஆலோசனை",
    nav_videos: "வீடியோக்கள்",
    nav_guide: "வழிகாட்டி",
    nav_symptoms: "அறிகுறி சோதனையாளர்",
    nav_admin: "நிர்வாக குழு",
    nav_login: "உள்நுழைக",
    nav_more: "மேலும்",
    nav_wishlist: "விருப்பப்பட்டவை",
    hero_title: "பண்டைய குணப்படுத்தும் முறையை கண்டறியுங்கள்",
    hero_subtitle: "உண்மையான ஆயுர்வேத மருந்துகள், சிறந்த மருத்துவர் ஆலோசனை மற்றும் ஜோதிட வழிகாட்டுதலுக்கான உங்கள் நம்பகமான தளம்.",
    btn_shop: "மருந்துகள் வாங்குங்கள்",
    btn_book: "நேரத்தை பதிவு செய்யுங்கள்",
    btn_watch: "பார்க்க",
    services_title: "எங்கள் சேவைகள்",
    srv_shop_title: "ஆயுர்வேத கடை",
    srv_shop_desc: "உயர்தர மற்றும் உண்மையான ஆயுர்வேத மருந்துகள் உங்கள் வீட்டு வாசலில்.",
    srv_doc_title: "மருத்துவர் ஆலோசனை",
    srv_doc_desc: "இலங்கையின் சிறந்த ஆயுர்வேத மருத்துவர்களுடன் ஆன்லைனில் அல்லது நேரில் ஆலோசனை பெறுங்கள்.",
    srv_astro_title: "ஜோதிடம் & வாஸ்து",
    srv_astro_desc: "வாழ்க்கை வழிகாட்டுதலுக்காக அனுபவமிக்க ஜோதிடர்களை அணுகுங்கள்.",
    guide_sub: "deergayu.com இல் உள்ள அதே வைத்தியங்கள்",
    videos_sub: "வலைத்தளத்தின் அதே நூலகம்",
    empty_guide: "இன்னும் வைத்தியங்கள் இல்லை",
    empty_videos: "இன்னும் வீடியோக்கள் இல்லை",
    empty_astro: "ஜோதிடர்கள் கிடைக்கவில்லை",
    offline_title: "நீங்கள் ஆஃப்லைன்",
    offline_sub: "மீண்டும் முயல தட்டவும்",
  }
};

type LanguageContextType = {
  lang: string;
  setLanguage: (lang: string) => void;
  toggleLanguage: () => void;
  hasChosen: boolean;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  hasChosen: false,
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState('en');
  const [hasChosen, setHasChosen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLang = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('appLang');
        if (storedLang) {
          setLangState(storedLang);
          setHasChosen(true);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadLang();
  }, []);

  const setLanguage = async (selectedLang: string) => {
    setLangState(selectedLang);
    setHasChosen(true);
    try {
      await AsyncStorage.setItem('appLang', selectedLang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const toggleLanguage = () => {
    const sequence = ['en', 'si', 'ta'];
    const nextIndex = (sequence.indexOf(lang) + 1) % sequence.length;
    setLanguage(sequence[nextIndex]);
  };

  const t = (key: string) => translations[lang]?.[key] || translations['en']?.[key] || key;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a140f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#7cb342" />
      </View>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage, hasChosen, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
