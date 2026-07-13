import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Star, Moon, Sun, Sparkles, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const Astrology = () => {
  const { lang } = useLanguage();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceType: 'Horoscope Reading',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const texts = {
    en: {
      title: "Traditional Astrology & Rituals",
      subtitle: "Discover ancient wisdom, find auspicious times, and protect your energy with authentic Sri Lankan Yanthra and Manthra services.",
      servicesTitle: "Our Sacred Services",
      horoscope: "Horoscope Reading",
      horoscopeDesc: "Deep analysis of your birth chart to uncover life patterns, career paths, and relationship compatibility.",
      yanthra: "Yanthra Preparation",
      yanthraDesc: "Custom-made protective talismans energized with ancient mantras for personal and spiritual protection.",
      nekath: "Auspicious Times (Nekath)",
      nekathDesc: "Calculating the most favorable planetary alignments for weddings, starting businesses, and house warming.",
      vasthu: "Vasthu Vidya",
      vasthuDesc: "Traditional architectural alignment to ensure harmony, prosperity, and positive energy in your home or business.",
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
      horoscopeDesc: "ඔබේ ජන්ම පත්‍රය ගැඹුරින් පරීක්ෂා කර ජීවිතයේ ඉදිරි ගමන්මග, රැකියාව සහ විවාහය ගැන නිවැරදි පුරෝකථන.",
      yanthra: "යන්ත්‍ර පැළඳවීම",
      yanthraDesc: "ග්‍රහ අපල දුරු කිරීමට සහ ජීවිත ආරක්ෂාවට බලගතු මන්ත්‍ර මගින් ජප කරන ලද පෞරාණික යන්ත්‍ර.",
      nekath: "නැකැත් සෑදීම",
      nekathDesc: "විවාහයට, නව ව්‍යාපාර ආරම්භයට, නිවාස සෑදීමට සහ සියලුම සුබ කටයුතු සඳහා බලගතු නැකැත් සෑදීම.",
      vasthu: "වාස්තු විද්‍යාව",
      vasthuDesc: "ඔබේ නිවසට සහ ව්‍යාපාරයට සෞභාග්‍යය ළඟා කරදෙන නිවැරදි වාස්තු විද්‍යාත්මක උපදෙස්.",
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
      horoscopeDesc: "உங்கள் வாழ்க்கைப் பாதைகள் மற்றும் திருமணப் பொருத்தத்தை கண்டறிய உங்கள் பிறப்பு விளக்கப்படத்தின் ஆழமான பகுப்பாய்வு.",
      yanthra: "யந்திரம் தயாரித்தல்",
      yanthraDesc: "தனிப்பட்ட மற்றும் ஆன்மீக பாதுகாப்பிற்காக பழங்கால மந்திரங்களால் ஆற்றல் பெற்ற தனிப்பயனாக்கப்பட்ட தாயத்துக்கள்.",
      nekath: "நல்ல நேரங்கள்",
      nekathDesc: "திருமணங்கள், வணிகங்களைத் தொடங்குதல் போன்றவற்றுக்கான மிகவும் சாதகமான நேரங்களைக் கணக்கிடுதல்.",
      vasthu: "வாஸ்து சாஸ்திரம்",
      vasthuDesc: "உங்கள் வீடு அல்லது வியாபாரத்தில் நல்லிணக்கம், செழிப்பு மற்றும் நேர்மறை ஆற்றலை உறுதி செய்வதற்கான வாஸ்து ஆலோசனைகள்.",
      formTitle: "ஆலோசனைக்கு கோரவும்",
      formSubtitle: "உங்கள் விவரங்களை கீழே வழங்கவும், எங்கள் நிபுணர்கள் உங்களை விரைவில் தொடர்புகொள்வார்கள்.",
      name: "முழு பெயர்",
      phone: "தொலைபேசி எண்",
      service: "சேவையைத் தேர்ந்தெடுக்கவும்",
      dob: "பிறந்த தேதி",
      tob: "பிறந்த நேரம்",
      pob: "பிறந்த இடம்",
      msg: "கூடுதல் குறிப்புகள் அல்லது கேள்விகள்",
      submit: "கோரிக்கையை சமர்ப்பிக்கவும்"
    }
  };

  const t = texts[lang] || texts.en;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/astrology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        success(lang === 'si' ? "ඔබේ ඉල්ලීම සාර්ථකව යොමු කරන ලදී!" : "Your request has been submitted successfully!");
        setFormData({ name: '', phone: '', serviceType: 'Horoscope Reading', birthDate: '', birthTime: '', birthPlace: '', message: '' });
      } else {
        error("Failed to submit request. Please try again.");
      }
    } catch (err) {
      console.error(err);
      error("An error occurred. Please try again later.");
    }
    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="astrology-page" style={{ paddingTop: '5rem', minHeight: '100vh', paddingBottom: '4rem' }}>
      
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '4rem 1.5rem', background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, transparent 70%)' }}>
        <Sparkles size={48} style={{ color: 'var(--secondary-color)', margin: '0 auto 1.5rem' }} />
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--secondary-color)', textShadow: '0 2px 10px rgba(212,175,55,0.2)' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t.subtitle}
        </p>
      </section>

      <div className="container">
        {/* Services Grid */}
        <section style={{ marginBottom: '5rem' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '3rem', color: '#fff' }}>{t.servicesTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            
            <div className="glass-panel glass-panel-hover" style={{ padding: '2rem', textAlign: 'center' }}>
              <Star size={40} style={{ color: 'var(--secondary-light)', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>{t.horoscope}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t.horoscopeDesc}</p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '2rem', textAlign: 'center' }}>
              <Sun size={40} style={{ color: 'var(--accent-color)', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>{t.yanthra}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t.yanthraDesc}</p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '2rem', textAlign: 'center' }}>
              <Moon size={40} style={{ color: 'var(--primary-light)', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>{t.nekath}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t.nekathDesc}</p>
            </div>

            <div className="glass-panel glass-panel-hover" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', margin: '0 auto 1rem', border: '2px solid var(--info-color)', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '15px', height: '15px', background: 'var(--info-color)' }}></div>
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>{t.vasthu}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t.vasthuDesc}</p>
            </div>

          </div>
        </section>

        {/* Consultation Form */}
        <section style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--secondary-color)', marginBottom: '0.5rem' }}>{t.formTitle}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{t.formSubtitle}</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.name} *</label>
                  <input required type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.phone} *</label>
                  <input required type="tel" name="phone" className="form-control" value={formData.phone} onChange={handleChange} placeholder="+94 77 123 4567" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.service} *</label>
                <select name="serviceType" className="form-control" value={formData.serviceType} onChange={handleChange}>
                  <option value="Horoscope Reading">{t.horoscope}</option>
                  <option value="Yanthra Preparation">{t.yanthra}</option>
                  <option value="Auspicious Times">{t.nekath}</option>
                  <option value="Vasthu Vidya">{t.vasthu}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.dob}</label>
                  <input type="date" name="birthDate" className="form-control" value={formData.birthDate} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.tob}</label>
                  <input type="time" name="birthTime" className="form-control" value={formData.birthTime} onChange={handleChange} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.pob}</label>
                  <input type="text" name="birthPlace" className="form-control" value={formData.birthPlace} onChange={handleChange} placeholder="e.g. Colombo" />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.msg}</label>
                <textarea name="message" className="form-control" rows="4" value={formData.message} onChange={handleChange} placeholder="Tell us more about your requirements..."></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '1.1rem' }} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>{t.submit} <Send size={18} /></span>}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Astrology;
