import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { postChat } from '../../lib/api';

export default function AyurBotMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: number; text: string; sender: 'user' | 'bot' }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { lang } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);

  const openBot = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      const greeting =
        lang === 'si'
          ? 'ආයුබෝවන්! මම AyurBot. ඔබට තියෙන සෞඛ්‍ය ගැටළුව මට කියන්න.'
          : lang === 'ta'
            ? 'வணக்கம்! நான் AyurBot. உங்கள் சுகாதாரப் பிரச்சினையை என்னிடம் கூறுங்கள்.'
            : 'Ayubowan! I am AyurBot. Tell me your health issue.';
      setMessages([{ id: 1, text: greeting, sender: 'bot' }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    const userMessage = { id: Date.now(), text, sender: 'user' as const };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    try {
      const data = await postChat(text, lang);
      const reply = data.reply || data.message || 'Please try again.';
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: reply, sender: 'bot' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text:
            lang === 'si'
              ? 'සම්බන්ධ වීමට නොහැකි විය. පසුව උත්සාහ කරන්න.'
              : 'Could not reach AyurBot. Try again later.',
          sender: 'bot',
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
      {!isOpen && (
        <TouchableOpacity style={styles.floatingButton} onPress={openBot} activeOpacity={0.8}>
          <LinearGradient colors={['#d4af37', '#b8860b']} style={styles.gradientBg}>
            <MaterialIcons name="auto-awesome" size={28} color="#0a140f" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <BlurView intensity={40} tint="dark" style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>AyurBot</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <MaterialIcons name="close" size={22} color="#d7ccc8" />
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messages}
              contentContainerStyle={{ padding: 16, gap: 10 }}
            >
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[styles.bubble, m.sender === 'user' ? styles.userBubble : styles.botBubble]}
                >
                  <Text style={styles.bubbleText}>{m.text}</Text>
                </View>
              ))}
              {isTyping ? <ActivityIndicator color="#7cb342" /> : null}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask AyurBot..."
                placeholderTextColor="#6a7a6a"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity style={styles.send} onPress={handleSend}>
                <MaterialIcons name="send" size={20} color="#0a140f" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 18,
    bottom: 90,
    zIndex: 50,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientBg: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    height: '72%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#142018',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,179,66,0.2)',
  },
  headerTitle: { color: '#d4af37', fontWeight: '800', fontSize: 18 },
  messages: { flex: 1 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7cb342' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#0a140f' },
  bubbleText: { color: '#f5f7f4', lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,179,66,0.2)',
  },
  input: {
    flex: 1,
    backgroundColor: '#0a140f',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#f5f7f4',
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7cb342',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
