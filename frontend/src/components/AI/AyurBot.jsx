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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Real AI Response
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, lang })
      });
      
      const data = await response.json();
      
      if (response.ok && data.reply) {
        setMessages(prev => [...prev, { id: Date.now(), text: data.reply, sender: 'bot' }]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (err) {
      console.error("AI Chat Error:", err);
      const errorMsg = lang === 'si' ? "සමාවෙන්න, මට දැන් පිළිතුරු දීමට අපහසුයි." : lang === 'ta' ? "மன்னிக்கவும், நான் தற்போது பதிலளிக்க முடியவில்லை." : "Sorry, I am unable to respond right now.";
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
