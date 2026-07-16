import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Star, Moon, Sun, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import './Astrology.css';

const Astrology = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const texts = {
    en: {
      title: "Traditional Astrology & Rituals",
      subtitle: "Discover ancient wisdom, find auspicious times, and protect your energy with authentic Sri Lankan Yanthra and Manthra services.",
      servicesTitle: "Our Sacred Services",
      horoscope: "Horoscope Reading",
      horoscopeDesc: "Deep analysis of your birth chart for life patterns, career paths, and relationship compatibility.",
      yanthra: "Yanthra Preparation",
      yanthraDesc: "Protective talismans energized with ancient mantras for personal and spiritual protection.",
      nekath: "Auspicious Times (Nekath)",
      nekathDesc: "Favorable planetary timings for weddings, new businesses, and house warming ceremonies.",
      vasthu: "Vasthu Vidya",
      vasthuDesc: "Architectural guidance for harmony, prosperity, and positive energy in home or business.",
      formTitle: "Request a Consultation",
      formSubtitle: "Provide your details below and our expert astrologers will contact you shortly.",
      name: "Full Name",
      phone: "Phone Number",
      service: "Select Service",
      dob: "Date of Birth",
      tob: "Time of Birth",
      pob: "Place of Birth",
      msg: "Additional Notes or Questions",
      submit: "Submit Request"
    },
    si: {
      title: "පාරම්පරික ජ්‍යොතිෂය සහ යන්ත්‍ර මන්ත්‍ර",
      subtitle: "පෞරාණික හෙළ වෙදකම සහ ගුප්ත විද්‍යාව හරහා ඔබේ ජීවිතයට ආරක්ෂාව සහ සෞභාග්‍යය උදා කරගන්න.",
      servicesTitle: "අපගේ සේවාවන්",
      horoscope: "කේන්දර පරීක්ෂාව",
      horoscopeDesc: "ජන්ම පත්‍රය ගැඹුරින් පරීක්ෂා කර ජීවිත මාර්ගය, රැකියාව සහ විවාහය පිළිබඳ මඟ පෙන්වීම.",
      yanthra: "යන්ත්‍ර පැළඳවීම",
      yanthraDesc: "ග්‍රහ අපල දුරු කිරීමට සහ ආරක්ෂාවට මන්ත්‍ර ජපිත පෞරාණික යන්ත්‍ර.",
      nekath: "නැකැත් සෑදීම",
      nekathDesc: "විවාහය, ව්‍යාපාර ආරම්භය සහ නිවාස සඳහා සුබ නැකැත් ගණනය කිරීම.",
      vasthu: "වාස්තු විද්‍යාව",
      vasthuDesc: "නිවසට සහ ව්‍යාපාරයට සෞභාග්‍යය ගෙන දෙන වාස්තු උපදෙස්.",
      formTitle: "උපදේශනයක් සඳහා ඉල්ලුම් කරන්න",
      formSubtitle: "පහත තොරතුරු ලබා දෙන්න. අපගේ ප්‍රවීණ ජ්‍යොතිර්වේදීන් ඔබව ඉක්මනින් සම්බන්ධ කරගනු ඇත.",
      name: "සම්පූර්ණ නම",
      phone: "දුරකථන අංකය",
      service: "සේවාව තෝරන්න",
      dob: "උපන් දිනය",
      tob: "උපන් වේලාව",
      pob: "උපන් ස්ථානය",
      msg: "අමතර විස්තර හෝ ප්‍රශ්න",
      submit: "ඉල්ලුම් කරන්න"
    },
    ta: {
      title: "பாரம்பரிய ஜோதிடம் & சடங்குகள்",
      subtitle: "பண்டைய ஞானத்தைக் கண்டறியவும், மங்களகரமான நேரங்களைக் கண்டறியவும் மற்றும் உண்மையான இலங்கை சேவைகளுடன் உங்கள் ஆற்றலைப் பாதுகாக்கவும்.",
      servicesTitle: "எங்கள் சேவைகள்",
      horoscope: "ஜாதகம் பார்த்தல்",
      horoscopeDesc: "வாழ்க்கைப் பாதை மற்றும் திருமணப் பொருத்தத்திற்கான பிறப்பு விளக்கப்பட ஆய்வு.",
      yanthra: "யந்திரம் தயாரித்தல்",
      yanthraDesc: "பாதுகாப்பிற்காக மந்திரங்களால் ஆற்றல் பெற்ற தனிப்பயன் தாயத்துக்கள்.",
      nekath: "நல்ல நேரங்கள்",
      nekathDesc: "திருமணம் மற்றும் வணிகத் தொடக்கத்திற்கான சாதகமான நேரக் கணக்கீடு.",
      vasthu: "வாஸ்து சாஸ்திரம்",
      vasthuDesc: "வீடு அல்லது வியாபாரத்தில் நல்லிணக்கத்திற்கான வாஸ்து ஆலோசனை.",
      formTitle: "ஆலோசனைக்கு கோரவும்",
      formSubtitle: "உங்கள் விவரங்களை கீழே வழங்கவும், எங்கள் நிபுணர்கள் உங்களை விரைவில் தொடர்புகொள்வார்கள்.",
      name: "முழு பெயர்",
      phone: "தொலைபேசி",
      service: "சேவையைத் தேர்ந்தெடுக்கவும்",
      dob: "பிறந்த தேதி",
      tob: "பிறந்த நேரம்",
      pob: "பிறந்த இடம்",
      msg: "கூடுதல் குறிப்புகள்",
      submit: "கோரிக்கையை சமர்ப்பிக்கவும்"
    }
  };

  const t = texts[lang] || texts.en;

  const handleTileClick = (serviceName) => {
    navigate(`/channeling?tab=astrologer&service=${encodeURIComponent(serviceName)}`);
  };

  const tiles = [
    {
      key: 'horoscope',
      title: t.horoscope,
      desc: t.horoscopeDesc,
      service: 'Horoscope Reading',
      icon: <Star size={36} style={{ color: 'var(--secondary-light)' }} />,
    },
    {
      key: 'yanthra',
      title: t.yanthra,
      desc: t.yanthraDesc,
      service: 'Yanthra Preparation',
      icon: <Sun size={36} style={{ color: 'var(--accent-color)' }} />,
    },
    {
      key: 'nekath',
      title: t.nekath,
      desc: t.nekathDesc,
      service: 'Auspicious Times',
      icon: <Moon size={36} style={{ color: 'var(--primary-light)' }} />,
    },
    {
      key: 'vasthu',
      title: t.vasthu,
      desc: t.vasthuDesc,
      service: 'Vasthu Vidya',
      icon: (
        <div className="astrology-vasthu-mark" aria-hidden>
          <span />
        </div>
      ),
    },
  ];

  return (
    <div className="astrology-page">
      <SEO
        title="Traditional Astrology & Rituals | Deergayu"
        description="Horoscope reading, yanthra, nekath, and vasthu services from authentic Sri Lankan Vedic astrologers on Deergayu."
        url="https://deergayu.com/astrology"
        canonical="https://deergayu.com/astrology"
      />

      <section className="astrology-hero">
        <Sparkles size={48} className="astrology-hero-icon" />
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>

      <div className="container">
        <section className="astrology-services">
          <h2>{t.servicesTitle}</h2>
          <div className="astrology-tiles">
            {tiles.map((tile) => (
              <div
                key={tile.key}
                className="astrology-tile glass-panel glass-panel-hover"
                onClick={() => handleTileClick(tile.service)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleTileClick(tile.service);
                }}
              >
                <div className="astrology-tile-icon">{tile.icon}</div>
                <h3>{tile.title}</h3>
                <p>{tile.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Astrology;
