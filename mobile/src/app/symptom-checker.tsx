import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'expo-router';
import { postSymptomCheck } from '../lib/api';

const symptomsList = [
  { id: 'Headache', label: 'Headache', icon: 'sentiment-very-dissatisfied' },
  { id: 'Fever', label: 'Fever', icon: 'thermostat' },
  { id: 'Cough', label: 'Cough', icon: 'sick' },
  { id: 'Stomach Ache', label: 'Stomach Ache', icon: 'restaurant' },
  { id: 'Joint Pain', label: 'Joint Pain', icon: 'directions-walk' },
  { id: 'Fatigue', label: 'Fatigue', icon: 'battery-alert' },
];

export default function SymptomCheckerScreen() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCheck = async () => {
    if (selectedSymptoms.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await postSymptomCheck(selectedSymptoms.join(', '), lang);
      if (data.analysis || data.remedies) {
        const remedies = Array.isArray(data.remedies) ? data.remedies.map((r: string) => `• ${r}`).join('\n') : '';
        setResult([data.analysis, remedies].filter(Boolean).join('\n\n'));
      } else {
        const text =
          data.remedy ||
          data.advice ||
          data.reply ||
          data.message ||
          data.result ||
          (typeof data === 'string' ? data : JSON.stringify(data));
        setResult(String(text));
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Symptom check failed');
    } finally {
      setLoading(false);
    }
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
          <MaterialIcons name="info-outline" size={24} color="#7cb342" />
          <Text style={styles.infoText}>Uses the same AI endpoint as the website.</Text>
        </BlurView>

        <Text style={styles.sectionTitle}>Common Symptoms</Text>
        <View style={styles.grid}>
          {symptomsList.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym.id);
            return (
              <TouchableOpacity
                key={sym.id}
                style={[styles.symptomCard, isSelected && styles.symptomCardSelected]}
                onPress={() => toggleSymptom(sym.id)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={sym.icon as any}
                  size={32}
                  color={isSelected ? '#0a140f' : '#d4af37'}
                />
                <Text style={[styles.symptomLabel, isSelected && styles.symptomLabelSelected]}>
                  {sym.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.checkBtn, selectedSymptoms.length === 0 && { opacity: 0.5 }]}
          onPress={handleCheck}
          disabled={selectedSymptoms.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a140f" />
          ) : (
            <Text style={styles.checkBtnText}>Get Remedy</Text>
          )}
        </TouchableOpacity>

        {result ? (
          <BlurView intensity={20} tint="dark" style={styles.resultCard}>
            <Text style={styles.resultTitle}>Suggestion</Text>
            <Text style={styles.resultText}>{result}</Text>
          </BlurView>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40 },
  headerTitle: { color: '#f5f7f4', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
    backgroundColor: 'rgba(20,32,24,0.9)',
  },
  infoText: { flex: 1, color: '#9aaa9a', lineHeight: 20 },
  sectionTitle: { color: '#7cb342', fontWeight: '700', marginBottom: 12, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symptomCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#142018',
  },
  symptomCardSelected: { backgroundColor: '#d4af37', borderColor: '#b8860b' },
  symptomLabel: { color: '#f5f7f4', fontWeight: '600' },
  symptomLabelSelected: { color: '#0a140f' },
  checkBtn: {
    marginTop: 20,
    backgroundColor: '#7cb342',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  checkBtnText: { color: '#0a140f', fontWeight: '800', fontSize: 16 },
  resultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
    backgroundColor: 'rgba(20,32,24,0.9)',
  },
  resultTitle: { color: '#d4af37', fontWeight: '800', marginBottom: 8 },
  resultText: { color: '#f5f7f4', lineHeight: 22 },
});
