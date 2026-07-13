import React, { useState, useEffect } from 'react';
import { Search, Play, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const Videos = () => {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/videos`);
        if (res.ok) {
          const data = await res.json();
          setVideos(data);
        }
      } catch (err) {
        console.error('Failed to fetch videos', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  // Multi-lingual content for page headings
  const pageContent = {
    en: {
      title: "Ayurvedic Video Library",
      subtitle: "Learn ancient wisdom, wellness guides, and lifestyle tips from our experts.",
      searchPlaceholder: "Search videos...",
      noResults: "No videos found matching your search.",
      categories: ["All", "Daily Routines", "Nutrition", "Herbs", "Yoga & Mind"]
    },
    si: {
      title: "ආයුර්වේද වීඩියෝ පුස්තකාලය",
      subtitle: "අපගේ ප්‍රවීණයන්ගෙන් පෞරාණික හෙළ වෙදකම, සුවතා උපදෙස් සහ ජීවන රටාවන් ඉගෙන ගන්න.",
      searchPlaceholder: "වීඩියෝ සොයන්න...",
      noResults: "ඔබ සෙවූ වීඩියෝ දර්ශන සොයාගත නොහැක.",
      categories: ["සියල්ල", "දෛනික චර්යාවන්", "පෝෂණය", "ඖෂධ පැළෑටි", "යෝගා සහ මනස"]
    },
    ta: {
      title: "ஆயுர்வேத காணொளி நூலகம்",
      subtitle: "எங்கள் நிபுணர்களிடமிருந்து பண்டைய ஞானம், ஆரோக்கிய வழிகாட்டிகள் மற்றும் வாழ்க்கை முறை குறிப்புகளைக் கற்றுக்கொள்ளுங்கள்.",
      searchPlaceholder: "காணொளிகளைத் தேடுங்கள்...",
      noResults: "காணொளிகள் எதுவும் கிடைக்கவில்லை.",
      categories: ["அனைத்தும்", "தினசரி வழக்கங்கள்", "ஊட்டச்சத்து", "மூலிகைகள்", "யோகா மற்றும் மனம்"]
    }
  };

  const text = pageContent[lang] || pageContent.en;

  // Initial YouTube videos list
  const initialVideos = [
    {
      id: "1",
      youtubeId: "JmD8sF4GisQ", // Placeholder popular ayurveda introduction video
      title: {
        en: "Introduction to Ayurvedic Daily Routines (Dinacharya)",
        si: "ආයුර්වේද දෛනික චර්යාවන් හඳුන්වාදීම (දිනචර්යාව)",
        ta: "ஆயுர்வேத தினசரி வழக்கங்கள் அறிமுகம் (தினச்சரியம்)"
      },
      description: {
        en: "Learn how to align your daily schedule with nature's rhythm to boost energy, improve focus, and enhance longevity.",
        si: "සුවපත් දිවියක් සඳහා දෛනික කාලසටහන සොබාදහමට අනුකූලව සකසා ගන්නේ කෙසේදැයි ඉගෙන ගන්න.",
        ta: "ஆற்றலை அதிகரிக்கவும், கவனத்தை மேம்படுத்தவும் உங்கள் தினசரி அட்டவணையை இயற்கையோடு எவ்வாறு சீரமைப்பது என்பதைக் கற்றுக்கொள்ளுங்கள்."
      },
      category: "Daily Routines",
      duration: "12:45"
    },
    {
      id: "2",
      youtubeId: "GV_B9J6ZJkM",
      title: {
        en: "Understanding Your Dosha: Vata, Pitta, and Kapha",
        si: "ඔබේ දෝෂය හඳුනාගන්න: වාත, පිත සහ කප",
        ta: "உங்கள் தோஷத்தைப் புரிந்துகொள்வது: வாத, பித்த, கப"
      },
      description: {
        en: "Explore the three body humors (Doshas) in Ayurveda and discover how to find balance tailored to your unique body constitution.",
        si: "ශරීරයේ පවතින වාත, පිත, කප ත්‍රිදෝෂයන් සහ ඒවා සමබරව තබාගෙන නිරෝගී වන ආකාරය තේරුම් ගන්න.",
        ta: "ஆயுர்வேதத்தில் உள்ள மூன்று உடல் தோஷங்களை ஆராய்ந்து, உங்கள் தனித்துவமான உடலமைப்பிற்கு ஏற்ப எவ்வாறு சமநிலையைக் கண்டறிவது என்பதைக் கண்டறியவும்."
      },
      category: "Daily Routines",
      duration: "15:20"
    },
    {
      id: "3",
      youtubeId: "PZg-67B_84w",
      title: {
        en: "Top 5 Ayurvedic Herbs for Immune Health",
        si: "ප්‍රතිශක්තිය වඩවන ප්‍රධාන ආයුර්වේද ඖෂධ පැළෑටි 5ක්",
        ta: "நோய் எதிர்ப்புச் சக்திக்கு தேவையான 5 சிறந்த ஆயுர்வேத மூலிகைகள்"
      },
      description: {
        en: "Boost your natural defense system using power herbs like Ashwagandha, Turmeric, Amalaki, Giloy, and Ginger.",
        si: "අශ්වගන්ධ, කහ, නෙල්ලි වැනි ප්‍රතිශක්තිකරණය වඩවන ප්‍රමුඛ දේශීය ඖෂධ පැළෑටි සහ ඒවායේ ගුණ පිළිබඳව දැනුවත් වන්න.",
        ta: "அஸ்வகந்தா, மஞ்சள், நெல்லிக்காய் போன்ற மூலிகைகளைப் பயன்படுத்தி உங்கள் இயற்கையான நோய் எதிர்ப்பு அமைப்பை மேம்படுத்துங்கள்."
      },
      category: "Herbs",
      duration: "08:15"
    },
    {
      id: "4",
      youtubeId: "K9sZ-tY_W3k",
      title: {
        en: "Ayurvedic Diet Tips for a Healthy Digestion",
        si: "නිරෝගී ජීර්ණ පද්ධතියක් සඳහා ආයුර්වේද ආහාර උපදෙස්",
        ta: "ஆரோக்கியமான செரிமானத்திற்கான ஆயுர்வேத உணவு குறிப்புகள்"
      },
      description: {
        en: "According to Ayurveda, health starts in the gut. Learn how to ignite your digestive fire (Agni) with the right food habits.",
        si: "ආයුර්වේදයට අනුව නිරෝගී බවේ රහස ආහාර ජීර්ණයයි. නිවැරදි ආහාර පුරුදු මඟින් ඔබේ ජඨරාග්නිය වර්ධනය කරගන්නා ආකාරය ඉගෙන ගන්න.",
        ta: "ஆயுர்வேதத்தின்படி, ஆரோக்கியம் வயிற்றில் தொடங்குகிறது. சரியான உணவுப் பழக்கவழக்கங்கள் மூலம் உங்கள் செரிமானத்தை எவ்வாறு மேம்படுத்துவது என்று தெரிந்துகொள்ளுங்கள்."
      },
      category: "Nutrition",
      duration: "10:30"
    },
    {
      id: "5",
      youtubeId: "xRveC0yG0aM",
      title: {
        en: "Ayurvedic Morning Yoga Flow & Meditation",
        si: "උදෑසන ආයුර්වේද යෝගා සහ භාවනා පුහුණුව",
        ta: "ஆயுர்வேத காலை யோகா மற்றும் தியான பயிற்சி"
      },
      description: {
        en: "Start your day with a gentle Ayurvedic-aligned yoga flow to wake up the body, stimulate organs, and clear the mind.",
        si: "ශරීරය අවදි කිරීමට, ඉන්ද්‍රියයන් උත්තේජනය කිරීමට සහ මනස සන්සුන් කිරීමට උදෑසන යෝගා ව්‍යායාම මාලාවක්.",
        ta: "உடலை எழுப்பவும், உறுப்புகளைத் தூண்டவும், மனதைத் தெளிவுபடுத்தவும் மென்மையான காலை யோகா பயிற்சியுடன் உங்கள் நாளைத் தொடங்குங்கள்."
      },
      category: "Yoga & Mind",
      duration: "18:40"
    }
  ];

  // Helper mapping category values for filtering
  const categoryMap = {
    "All": "All",
    "සියල්ල": "All",
    "அனைத்தும்": "All",
    "Daily Routines": "Daily Routines",
    "දෛනික චර්යාවන්": "Daily Routines",
    "தினசரி வழக்கங்கள்": "Daily Routines",
    "Nutrition": "Nutrition",
    "පෝෂණය": "Nutrition",
    "ஊட்டச்சத்து": "Nutrition",
    "Herbs": "Herbs",
    "ඖෂධ පැළෑටි": "Herbs",
    "மூலிகைகள்": "Herbs",
    "Yoga & Mind": "Yoga & Mind",
    "යෝගා සහ මනස": "Yoga & Mind",
    "யோகா மற்றும் மனம்": "Yoga & Mind"
  };

  const filteredVideos = initialVideos.filter(v => {
    const matchSearch = searchQuery.trim() === '' || 
      (v.title[lang] || v.title.en).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description[lang] || v.description.en).toLowerCase().includes(searchQuery.toLowerCase());
    
    const targetCat = categoryMap[activeCategory] || 'All';
    const matchCat = targetCat === 'All' || v.category === targetCat;

    return matchSearch && matchCat;
  });

  return (
    <div className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem', minHeight: '80vh' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary-color)', marginBottom: '0.75rem' }}>
          {text.title}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          {text.subtitle}
        </p>
      </div>

      {/* Toolbar / Search & Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {text.categories.map(cat => (
              <button
                key={cat}
                className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: activeCategory === cat ? 'var(--secondary-color)' : 'rgba(255,255,255,0.03)',
                  color: activeCategory === cat ? 'white' : 'var(--text-primary)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="search-box" style={{ minWidth: '260px' }}>
            <Search size={16} />
            <input
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

        </div>
      </div>

      {/* Videos Grid */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#aaa' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Loading videos...</p>
        </div>
      )}
      {!loading && filteredVideos.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
          <h4>{text.noResults}</h4>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {!loading && filteredVideos.map(v => (
            <div
              key={v.id}
              className="glass-panel glass-panel-hover"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(212,175,55,0.15)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              {/* YouTube Embed */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
                <iframe
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 0
                  }}
                  src={`https://www.youtube.com/embed/${v.youtubeId}`}
                  title={getTitle(v)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{
                      background: 'rgba(212,175,55,0.1)',
                      color: 'var(--secondary-color)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {v.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ⏱️ {v.duration}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                    {getTitle(v)}
                  </h3>
                  
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                    {getDescription(v)}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a
                    href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.78rem',
                      color: 'var(--secondary-color)',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    <YoutubeIcon /> Watch on YouTube <ExternalLink size={11} style={{ marginLeft: '2px' }} />
                  </a>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Videos;
