import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'expo-router';

const symptomsList = [
  { id: 's1', label: 'Headache', icon: 'sentiment-very-dissatisfied' },
  { id: 's2', label: 'Fever', icon: 'thermostat' },
  { id: 's3', label: 'Cough', icon: 'sick' },
  { id: 's4', label: 'Stomach Ache', icon: 'restaurant' },
  { id: 's5', label: 'Joint Pain', icon: 'directions-walk' },
  { id: 's6', label: 'Fatigue', icon: 'battery-alert' },
];

export default function SymptomCheckerScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCheck = () => {
    if (selectedSymptoms.length === 0) return;

    let res = '';
    if (selectedSymptoms.includes('s1')) {
      res = lang === 'si' ? "කොත්තමල්ලි තම්බලා බොන්න. සුවඳ විලවුන් හෝ ලෙමන් ඉව කරන්න." 
        : lang === 'ta' ? "மல்லி விதைகளை கொதிக்க வைத்து குடிக்கவும்." 
        : "Drink boiled coriander water. Inhale lemon or mild essential oils.";
    } else if (selectedSymptoms.includes('s3') || selectedSymptoms.includes('s2')) {
      res = lang === 'si' ? "පස්පංගුව තම්බලා බොන්න. උණු වතුරෙන් ස්නානය කරන්න." 
        : lang === 'ta' ? "பஸ்பங்குவ கொதிக்க வைக்கவும். வெந்நீரில் குளிக்கவும்." 
        : "Drink boiled Paspanguwa. Take a warm bath and rest.";
    } else {
      res = lang === 'si' ? "කරුණාකර වෛද්‍යවරයෙක් හමුවන්න." 
        : lang === 'ta' ? "தயவுசெய்து ஒரு மருத்துவரை அணுகவும்." 
        : "Please consult an Ayurvedic doctor for a proper diagnosis.";
    }
    setResult(res);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Symptom Checker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BlurView intensity={20} tint="dark" style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color="#4caf50" />
          <Text style={styles.infoText}>
            Select your symptoms below, and our AI will suggest traditional Ayurvedic home remedies.
          </Text>
        </BlurView>

        <Text style={styles.sectionTitle}>Common Symptoms</Text>
        <View style={styles.grid}>
          {symptomsList.map(sym => {
            const isSelected = selectedSymptoms.includes(sym.id);
            return (
              <TouchableOpacity 
                key={sym.id} 
                style={[styles.symptomCard, isSelected && styles.symptomCardSelected]}
                onPress={() => toggleSymptom(sym.id)}
                activeOpacity={0.8}
              >
                <MaterialIcons name={sym.icon as any} size={32} color={isSelected ? '#2c1e16' : '#d4af37'} />
                <Text style={[styles.symptomLabel, isSelected && styles.symptomLabelSelected]}>{sym.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.checkBtn, selectedSymptoms.length === 0 && styles.checkBtnDisabled]} 
          onPress={handleCheck}
          disabled={selectedSymptoms.length === 0}
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={selectedSymptoms.length > 0 ? ['#4caf50', '#2e7d32'] : ['rgba(76, 175, 80, 0.3)', 'rgba(46, 125, 50, 0.3)']} 
            style={styles.gradientBtn}
          >
            <Text style={styles.checkBtnText}>Analyze Symptoms</Text>
          </LinearGradient>
        </TouchableOpacity>

        {result && (
          <BlurView intensity={30} tint="dark" style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <MaterialIcons name="healing" size={24} color="#d4af37" />
              <Text style={styles.resultTitle}>Suggested Remedy</Text>
            </View>
            <Text style={styles.resultText}>{result}</Text>
            
            <TouchableOpacity style={styles.bookBtn} onPress={() => router.navigate('/channeling')} activeOpacity={0.8}>
              <Text style={styles.bookBtnText}>Book a Doctor Instead</Text>
            </TouchableOpacity>
          </BlurView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c1e16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(44, 30, 22, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#d4af37',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#d7ccc8',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fdfbf7',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  symptomCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    gap: 12,
  },
  symptomCardSelected: {
    backgroundColor: '#d4af37',
    borderColor: '#b8860b',
  },
  symptomLabel: {
    color: '#fdfbf7',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  symptomLabelSelected: {
    color: '#2c1e16',
    fontWeight: '800',
  },
  checkBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  checkBtnDisabled: {
    opacity: 0.7,
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(62, 39, 35, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d4af37',
  },
  resultText: {
    color: '#fdfbf7',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  bookBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1.5,
    borderColor: '#d4af37',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#d4af37',
    fontWeight: '700',
    fontSize: 15,
  },
});
