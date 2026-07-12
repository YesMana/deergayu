import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import './AyurBot.css';

const AyurBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial language selection prompt
      setMessages([
        {
          id: 'welcome',
          text: "Ayubowan! Welcome to Deergayu AyurBot. Please select your language to continue. \n\nකරුණාකර ඉදිරියට යාමට ඔබේ භාෂාව තෝරන්න. \n\nதொடர உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்.",
          sender: 'bot',
          isLangSelect: true
        }
      ]);
    }
  }, [isOpen, messages.length]);

  const selectLanguage = (langCode) => {
    setSelectedLang(langCode);
    const langLabel = langCode === 'si' ? "සිංහල" : langCode === 'ta' ? "தமிழ்" : "English";
    
    // Add user's selection
    const userMsg = { id: Date.now(), text: langLabel, sender: 'user' };
    
    // Welcome message and quick help options in selected language
    const botGreetings = {
      en: "How can I assist you today? Please choose one of the quick options below, or type your query in the chat bar.",
      si: "අද මම ඔබට සහය වන්නේ කෙසේද? කරුණාකර පහත දැක්වෙන විකල්ප වලින් එකක් තෝරන්න, නැතහොත් ඔබේ ගැටළුව පහතින් ටයිප් කරන්න.",
      ta: "இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்? கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும், அல்லது உங்கள் கேள்வியைத் தட்டச்சு செய்யவும்."
    };

    const botOptions = {
      en: [
        { label: "🌿 Ayurvedic Home Remedies", id: "remedies" },
        { label: "👨‍⚕️ Book a Doctor (Channeling)", id: "channel" },
        { label: "🛒 Buy Ayurvedic Medicine (Shop)", id: "shop" },
        { label: "📞 Contact Support", id: "contact" }
      ],
      si: [
        { label: "🌿 දේශීය අත් බෙහෙත් ක්‍රම", id: "remedies" },
        { label: "👨‍⚕️ වෛද්‍යවරයකු චැනල් කිරීම", id: "channel" },
        { label: "🛒 ආයුර්වේද බෙහෙත් මිලදී ගැනීම", id: "shop" },
        { label: "📞 දීර්ඝායු සහය සේවාව", id: "contact" }
      ],
      ta: [
        { label: "🌿 ஆயுர்வேத வீட்டு வைத்தியம்", id: "remedies" },
        { label: "👨‍⚕️ மருத்துவரை அணுகுதல் (முன்பதிவு)", id: "channel" },
        { label: "🛒 ஆயுர்வேத மருந்து வாங்குதல்", id: "shop" },
        { label: "📞 எங்களை தொடர்பு கொள்ள", id: "contact" }
      ]
    };

    const botMsg = {
      id: Date.now() + 1,
      text: botGreetings[langCode],
      sender: 'bot',
      options: botOptions[langCode]
    };

    setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), userMsg, botMsg]);
  };

  const handleOptionClick = (optionId, optionLabel) => {
    const userMsg = { id: Date.now(), text: optionLabel, sender: 'user' };
    
    let botReply = {};
    const lang = selectedLang || 'en';

    if (optionId === 'remedies') {
      botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: lang === 'si'
          ? "නිවැරදි දේශීය අත් බෙහෙත් ක්‍රම සෙවීම සඳහා, කැස්ස (cough), උණ (fever), හෝ හිසරදය (headache) වැනි ඔබේ රෝග ලක්ෂණ පහතින් ටයිප් කරන්න."
          : lang === 'ta'
          ? "வீட்டு வைத்தியங்களைக் கண்டறிய, இருமல் (cough), காய்ச்சல் (fever) அல்லது தலைவலி (headache) போன்ற உங்கள் அறிகுறிகளை கீழே தட்டச்சு செய்யவும்."
          : "To suggest natural home remedies, please type your symptoms (like 'cough', 'fever', or 'headache') in the chat bar below."
      };
    } else if (optionId === 'channel') {
      botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: lang === 'si'
          ? "දීර්ඝායු සේවාව හරහා ලියාපදිංචි වෛද්‍යවරුන් චැනල් කිරීම සඳහා පහත සබැඳිය (link) භාවිතයෙන් චැනල් කිරීමේ පිටුවට පිවිසෙන්න:"
          : lang === 'ta'
          ? "மருத்துவர் முன்பதிவு செய்ய கீழே உள்ள பக்கத்திற்குச் செல்லவும்:"
          : "You can easily book certified Ayurvedic doctors. Click below to go to our Channeling section:",
        navLink: "/channeling",
        navLabel: lang === 'si' ? "🗓️ චැනල් කිරීමේ පිටුවට යන්න" : lang === 'ta' ? "🗓️ முன்பதிவு பக்கத்திற்குச் செல்க" : "🗓️ Go to Channeling"
      };
    } else if (optionId === 'shop') {
      botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: lang === 'si'
          ? "දේශීය සහ ස්වභාවික ආයුර්වේද ඖෂධ වර්ග මිලදී ගැනීමට පහත සබැඳිය (link) භාවිතයෙන් අපගේ සාප්පුව වෙත පිවිසෙන්න:"
          : lang === 'ta'
          ? "ஆயுர்வேத மருந்துகளை வாங்க கீழே உள்ள பக்கத்திற்குச் செல்லவும்:"
          : "Browse organic herbs and Ayurvedic medicine in our Online Shop. Click below to view products:",
        navLink: "/shop",
        navLabel: lang === 'si' ? "🛒 ඖෂධ සාප්පුවට යන්න" : lang === 'ta' ? "🛒 மருந்து கடைக்குச் செல்க" : "🛒 Go to Shop"
      };
    } else if (optionId === 'contact') {
      botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: lang === 'si'
          ? "දීර්ඝායු පාරිභෝගික සහය සේවාව සම්බන්ධ කරගැනීම සඳහා support@deergayu.com වෙත ඊමේල් පණිවිඩයක් එවන්න, නැතහොත් 0762209299 අමතන්න."
          : lang === 'ta'
          ? "எங்கள் ஆதரவு குழுவை தொடர்பு கொள்ள support@deergayu.com என்ற மின்னஞ்சல் அல்லது 0762209299 என்ற எண்ணை அழைக்கவும்."
          : "For personal support, please contact our Deergayu helpline at support@deergayu.com or call us at 0762209299."
      };
    }

    setMessages(prev => [...prev, userMsg, botReply]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, lang: selectedLang || 'en' })
      });
      
      const data = await response.json();
      
      if (response.ok && data.reply) {
        setMessages(prev => [...prev, { id: Date.now(), text: data.reply, sender: 'bot' }]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      const errorMsg = selectedLang === 'si' 
        ? "සමාවෙන්න, මට දැන් පිළිතුරු දීමට අපහසුයි." 
        : selectedLang === 'ta' 
        ? "மன்னிக்கவும், நான் தற்போது பதிலளிக்க முடியவில்லை." 
        : "Sorry, I am unable to respond right now.";
      setMessages(prev => [...prev, { id: Date.now(), text: errorMsg, sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        className={`ayurbot-toggle ${isOpen ? 'hidden' : ''}`} 
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="sparkle-icon" size={16} />
        <MessageCircle size={28} />
      </button>

      {isOpen && (
        <div className="ayurbot-container animate-fade-in">
          <div className="ayurbot-header">
            <div className="ayurbot-title">
              <Sparkles size={18} color="var(--primary-color)" />
              <div>
                <h3>AyurBot</h3>
                <span className="online-status">Online - AI Assistant</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="ayurbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                
                {/* Language Select buttons */}
                {msg.isLangSelect && (
                  <div className="ayurbot-lang-container">
                    <button className="ayurbot-lang-btn" onClick={() => selectLanguage('en')}>English</button>
                    <button className="ayurbot-lang-btn" onClick={() => selectLanguage('si')}>සිංහල</button>
                    <button className="ayurbot-lang-btn" onClick={() => selectLanguage('ta')}>தமிழ்</button>
                  </div>
                )}

                {/* Option Chips buttons */}
                {msg.options && (
                  <div className="ayurbot-options-container">
                    {msg.options.map((opt) => (
                      <button 
                        key={opt.id} 
                        className="ayurbot-option-chip"
                        onClick={() => handleOptionClick(opt.id, opt.label)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Styled navigation card with router link */}
                {msg.navLink && (
                  <div className="ayurbot-nav-card">
                    <Link to={msg.navLink} className="ayurbot-nav-link" onClick={() => setIsOpen(false)}>
                      {msg.navLabel}
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="message-bubble bot typing">
                <span>.</span><span>.</span><span>.</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ayurbot-input">
            <input 
              type="text" 
              placeholder={
                selectedLang === 'si' 
                  ? "ඔබේ ගැටළුව ටයිප් කරන්න..." 
                  : selectedLang === 'ta' 
                  ? "உங்கள் பிரச்சினையை தட்டச்சு செய்க..." 
                  : "Type your issue..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={!selectedLang}
            />
            <button onClick={handleSend} disabled={!input.trim() || !selectedLang}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AyurBot;
