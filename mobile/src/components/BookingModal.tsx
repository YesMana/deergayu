import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type BookingModalProps = {
  visible: boolean;
  onClose: () => void;
  professionalName: string;
};

export default function BookingModal({ visible, onClose, professionalName }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const dates = ['Today, 14th', 'Tomorrow, 15th', 'Mon, 16th'];
  const times = ['09:00 AM', '11:30 AM', '04:00 PM', '06:30 PM'];

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Incomplete', 'Please select both a date and a time to book your appointment.');
      return;
    }
    Alert.alert('Booking Confirmed!', `Your appointment with ${professionalName} is set for ${selectedDate} at ${selectedTime}.`, [
      { text: 'OK', onPress: onClose }
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Book Appointment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color="#d7ccc8" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.body}>
            <Text style={styles.subText}>Booking with:</Text>
            <Text style={styles.profName}>{professionalName}</Text>

            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.row}>
              {dates.map((d, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.chip, selectedDate === d && styles.chipSelected]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text style={[styles.chipText, selectedDate === d && styles.chipTextSelected]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.row}>
              {times.map((t, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.chip, selectedTime === t && styles.chipSelected]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.chipText, selectedTime === t && styles.chipTextSelected]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <LinearGradient colors={['#4caf50', '#2e7d32']} style={styles.gradientBtn}>
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#3e2723',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.15)',
  },
  headerTitle: {
    color: '#d4af37',
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  body: {
    padding: 20,
  },
  subText: {
    color: '#d7ccc8',
    fontSize: 14,
  },
  profName: {
    color: '#fdfbf7',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
  },
  chipSelected: {
    backgroundColor: '#d4af37',
    borderColor: '#b8860b',
  },
  chipText: {
    color: '#d7ccc8',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#2c1e16',
    fontWeight: '800',
  },
  confirmBtn: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  gradientBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
