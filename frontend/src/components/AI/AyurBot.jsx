import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './AyurBot.css';

const AyurBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { t, lang } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting
      const greeting = lang === 'si' 
        ? "ආයුබෝවන්! මම AyurBot. ඔබට තියෙන සෞඛ්‍ය ගැටළුව මට කියන්න, මම ගෙදරදීම කරන්න පුළුවන් අත් බෙහෙත් කියන්නම්." 
        : lang === 'ta'
        ? "வணக்கம்! நான் AyurBot. உங்கள் சுகாதாரப் பிரச்சினையை என்னிடம் கூறுங்கள், நான் சில வீட்டு வைத்தியங்களை பரிந்துரைக்கிறேன்."
        : "Ayubowan! I am AyurBot. Tell me your health issue, and I can suggest some Ayurvedic home remedies.";
      
      setMessages([{ id: 1, text: greeting, sender: 'bot' }]);
    }
  }, [isOpen, lang, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Mock AI Response
    setTimeout(() => {
      let botReply = '';
      const lowerInput = userMessage.text.toLowerCase();
      
      if (lowerInput.includes('headache') || lowerInput.includes('හිසරුදාව') || lowerInput.includes('ඔලුවෙ කැක්කුම') || lowerInput.includes('தலைவலி')) {
        botReply = lang === 'si' ? "හිසරුදාවට හොඳම දේ තමයි කොත්තමල්ලි ටිකක් තම්බලා බොන එක. ඒ වගේම 'සීතෝදක තෛලය' ටිකක් නළලේ ගාන්න." : lang === 'ta' ? "தலைவலிக்கு மல்லி விதைகளை கொதிக்க வைத்து அந்த நீரை குடிப்பது மிகவும் சிறந்தது. நெற்றியில் 'சீதோதக எண்ணெய்' தடவலாம்." : "For a headache, boiling coriander seeds and drinking the water is highly effective. You can also apply 'Seethodaka Oil' on your forehead.";
      } else if (lowerInput.includes('cold') || lowerInput.includes('හම්බිරිස්සාව') || lowerInput.includes('කැස්ස') || lowerInput.includes('சளி')) {
        botReply = lang === 'si' ? "සෙම්ප්‍රතිශ්‍යාවට පස්පංගුව තම්බලා බොන්න. ඉඟුරු, කොත්තමල්ලි ගොඩක් ගුණදායකයි. අපේ ඔසුසලෙන් 'පස්පංගුව' මිලදී ගන්න පුළුවන්." : lang === 'ta' ? "சளிக்கு 'பஸ்பங்குவ' கொதிக்க வைப்பது சிறந்த தீர்வாகும். இஞ்சி மற்றும் மல்லி மிகவும் பயனுள்ளதாக இருக்கும். 'பஸ்பங்குவ'வை நீங்கள் எங்கள் கடையில் வாங்கலாம்." : "For a cold, boiling 'Paspanguwa' is the best remedy. Ginger and Coriander are very beneficial. You can buy 'Paspanguwa' from our shop.";
      } else {
        botReply = lang === 'si' ? "මට ඒ ගැන හරියටම කියන්න අමාරුයි. ඒත් ඔබට පුළුවන් අපේ විශේෂඥ ආයුර්වේද වෛද්‍යවරයෙක්ව සම්බන්ධ කරගන්න. 'Channeling' පිටුවට යන්න." : lang === 'ta' ? "அது பற்றி எனக்கு சரியாகத் தெரியவில்லை. இருப்பினும், நீங்கள் எங்கள் நிபுணத்துவ ஆயுர்வேத மருத்துவர் ஒருவரைத் தொடர்புகொள்ளலாம். தயவுசெய்து 'சானலிங்' பக்கத்திற்குச் செல்லவும்." : "I am not exactly sure about that. However, you can consult one of our expert Ayurvedic physicians. Please visit the 'Channeling' page.";
      }

      setMessages(prev => [...prev, { id: Date.now(), text: botReply, sender: 'bot' }]);
      setIsTyping(false);
    }, 1500);
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
                <p>{msg.text}</p>
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
              placeholder={lang === 'si' ? "ඔබේ ගැටළුව ටයිප් කරන්න..." : lang === 'ta' ? "உங்கள் பிரச்சினையை தட்டச்சு செய்க..." : "Type your issue..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={!input.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AyurBot;
