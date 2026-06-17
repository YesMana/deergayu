import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function AyurBotMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user'|'bot'}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { lang } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);

  const openBot = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      const greeting = lang === 'si' 
        ? "ආයුබෝවන්! මම AyurBot. ඔබට තියෙන සෞඛ්‍ය ගැටළුව මට කියන්න." 
        : lang === 'ta'
        ? "வணக்கம்! நான் AyurBot. உங்கள் சுகாதாரப் பிரச்சினையை என்னிடம் கூறுங்கள்."
        : "Ayubowan! I am AyurBot. Tell me your health issue.";
      setMessages([{ id: 1, text: greeting, sender: 'bot' }]);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let botReply = '';
      const lowerInput = userMessage.text.toLowerCase();
      
      if (lowerInput.includes('headache') || lowerInput.includes('හිසරුදාව') || lowerInput.includes('தலைவலி')) {
        botReply = lang === 'si' ? "හිසරුදාවට කොත්තමල්ලි තම්බලා බොන්න." : lang === 'ta' ? "தலைவலிக்கு மல்லி விதைகளை கொதிக்க வைத்து குடிக்கவும்." : "For a headache, drink boiled coriander water.";
      } else if (lowerInput.includes('cold') || lowerInput.includes('කැස්ස') || lowerInput.includes('சளி')) {
        botReply = lang === 'si' ? "සෙම්ප්‍රතිශ්‍යාවට පස්පංගුව තම්බලා බොන්න." : lang === 'ta' ? "சளிக்கு 'பஸ்பங்குவ' கொதிக்க வைக்கவும்." : "For a cold, drink boiled 'Paspanguwa'.";
      } else {
        botReply = lang === 'si' ? "කරුණාකර වෛද්‍යවරයෙක් හමුවන්න." : lang === 'ta' ? "தயவுசெய்து ஒரு மருத்துவரை அணுகவும்." : "Please consult a doctor.";
      }

      setMessages(prev => [...prev, { id: Date.now(), text: botReply, sender: 'bot' as const }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      {!isOpen && (
        <TouchableOpacity style={styles.floatingButton} onPress={openBot} activeOpacity={0.8}>
          <LinearGradient colors={['#d4af37', '#b8860b']} style={styles.gradientBg}>
            <MaterialIcons name="auto-awesome" size={28} color="#2c1e16" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} animationType="slide" transparent={true}>
        <BlurView intensity={30} tint="dark" style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <View style={styles.botIconWrapper}>
                  <MaterialIcons name="auto-awesome" size={20} color="#2c1e16" />
                </View>
                <Text style={styles.headerText}>AyurBot AI</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#d7ccc8" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.chatArea}
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map(msg => (
                <View key={msg.id} style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                  <Text style={[styles.msgText, msg.sender === 'user' ? styles.userMsgText : styles.botMsgText]}>{msg.text}</Text>
                </View>
              ))}
              {isTyping && (
                <View style={[styles.bubble, styles.botBubble]}>
                  <Text style={styles.botMsgText}>...</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                placeholder={lang === 'si' ? "මෙහි ටයිප් කරන්න..." : lang === 'ta' ? "இங்கு தட்டச்சு செய்யவும்..." : "Type here..."}
                placeholderTextColor="#a1887f"
                value={input}
                onChangeText={setInput}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
                <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.gradientBtn}>
                  <MaterialIcons name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  gradientBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#3e2723',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    flexDirection: 'column',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(44, 30, 22, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIconWrapper: {
    backgroundColor: '#d4af37',
    padding: 6,
    borderRadius: 12,
  },
  headerText: {
    color: '#d4af37',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  chatArea: {
    flex: 1,
    padding: 20,
    backgroundColor: '#2c1e16',
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#4caf50',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: 'rgba(62, 39, 35, 0.8)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMsgText: {
    color: '#fdfbf7',
    fontWeight: '500',
  },
  botMsgText: {
    color: '#d7ccc8',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: 'rgba(44, 30, 22, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fdfbf7',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
