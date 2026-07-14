import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { bookAppointment, fetchAvailableSlots, type Provider } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

type BookingModalProps = {
  visible: boolean;
  onClose: () => void;
  provider: Provider | null;
};

function nextDays(count: number) {
  const out: { label: string; value: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label =
      i === 0 ? `Today ${value.slice(5)}` : i === 1 ? `Tomorrow ${value.slice(5)}` : value;
    out.push({ label, value });
  }
  return out;
}

export default function BookingModal({ visible, onClose, provider }: BookingModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const dates = nextDays(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(dates[0]?.value || null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [booked, setBooked] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !provider || !selectedDate) return;
    setSelectedTime(null);
    setLoadingSlots(true);
    fetchAvailableSlots(provider.id, selectedDate)
      .then((data) => {
        setSlots(data.allSlots || []);
        setBooked(data.bookedSlots || []);
      })
      .catch(() => {
        setSlots([]);
        setBooked([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [visible, provider, selectedDate]);

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Login required', 'Sign in with the same account as the website.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => { onClose(); router.push('/login'); } },
      ]);
      return;
    }
    if (!provider || !selectedDate || !selectedTime) {
      Alert.alert('Incomplete', 'Select a date and time.');
      return;
    }
    setSubmitting(true);
    try {
      await bookAppointment({
        providerId: provider.id,
        providerName: provider.name || '',
        date: selectedDate,
        time: selectedTime,
        phone,
        notes,
        consultationType: 'in_person',
      });
      Alert.alert('Booked', 'Appointment saved — same as on the website.', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (e: any) {
      Alert.alert('Booking failed', e?.message || 'Try another slot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Book Appointment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color="#d7ccc8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.subText}>Booking with:</Text>
            <Text style={styles.profName}>{provider?.name}</Text>

            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.row}>
              {dates.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.chip, selectedDate === d.value && styles.chipSelected]}
                  onPress={() => setSelectedDate(d.value)}
                >
                  <Text style={[styles.chipText, selectedDate === d.value && styles.chipTextSelected]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Select Time</Text>
            {loadingSlots ? (
              <ActivityIndicator color="#7cb342" />
            ) : (
              <View style={styles.row}>
                {slots.length === 0 ? (
                  <Text style={styles.subText}>No slots for this day</Text>
                ) : (
                  slots.map((t) => {
                    const isBooked = booked.includes(t);
                    return (
                      <TouchableOpacity
                        key={t}
                        disabled={isBooked}
                        style={[
                          styles.chip,
                          selectedTime === t && styles.chipSelected,
                          isBooked && styles.chipDisabled,
                        ]}
                        onPress={() => setSelectedTime(t)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedTime === t && styles.chipTextSelected,
                            isBooked && styles.chipTextDisabled,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="07xxxxxxxx"
              placeholderTextColor="#6a7a6a"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              placeholder="Optional notes"
              placeholderTextColor="#6a7a6a"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#0a140f" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#142018',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,179,66,0.15)',
  },
  headerTitle: { color: '#d4af37', fontSize: 20, fontWeight: '800' },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  body: { padding: 20 },
  subText: { color: '#9aaa9a', fontSize: 14 },
  profName: { color: '#f5f7f4', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#7cb342', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    backgroundColor: 'rgba(20,32,24,0.6)',
  },
  chipSelected: { backgroundColor: '#d4af37', borderColor: '#b8860b' },
  chipDisabled: { opacity: 0.35 },
  chipText: { color: '#d7ccc8', fontWeight: '600' },
  chipTextSelected: { color: '#0a140f', fontWeight: '800' },
  chipTextDisabled: { textDecorationLine: 'line-through' },
  input: {
    backgroundColor: '#0a140f',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
    borderRadius: 12,
    padding: 12,
    color: '#f5f7f4',
    marginBottom: 16,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#7cb342',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: { color: '#0a140f', fontSize: 16, fontWeight: '800' },
});
