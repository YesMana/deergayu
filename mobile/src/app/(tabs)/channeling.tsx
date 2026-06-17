import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import BookingModal from '../../components/BookingModal';

const mockDoctors = [
  { id: '1', name: 'Dr. Anura Dissanayake', specialty: 'General Ayurvedic Physician', experience: '15 Years', rating: 4.9 },
  { id: '2', name: 'Dr. Saman Kumara', specialty: 'Panchakarma Specialist', experience: '12 Years', rating: 4.7 },
  { id: '3', name: 'Dr. Nimali Perera', specialty: 'Skin & Beauty', experience: '8 Years', rating: 4.8 },
  { id: '4', name: 'Dr. Rohan Silva', specialty: 'Bone & Joint Specialist', experience: '20 Years', rating: 4.9 },
];

export default function ChannelingScreen() {
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProf, setSelectedProf] = useState('');

  const handleBook = (name: string) => {
    setSelectedProf(name);
    setModalVisible(true);
  };

  const renderDoctor = ({ item }: { item: typeof mockDoctors[0] }) => (
    <BlurView intensity={20} tint="dark" style={styles.card}>
      <View style={styles.imagePlaceholder}>
        <MaterialIcons name="person" size={40} color="rgba(212, 175, 55, 0.4)" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.doctorName}>{item.name}</Text>
        <Text style={styles.specialty}>{item.specialty}</Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialIcons name="work" size={16} color="#d4af37" />
            <Text style={styles.detailText}>{item.experience}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialIcons name="star" size={16} color="#d4af37" />
            <Text style={styles.detailText}>{item.rating}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bookButton} activeOpacity={0.8} onPress={() => handleBook(item.name)}>
          <Text style={styles.bookButtonText}>{t('btn_book')}</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>{t('srv_doc_title')}</Text>
        <Text style={styles.subtitle}>{t('srv_doc_desc')}</Text>
      </View>

      <FlatList
        data={mockDoctors}
        keyExtractor={(item) => item.id}
        renderItem={renderDoctor}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <BookingModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        professionalName={selectedProf} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c1e16',
  },
  headerArea: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4caf50',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#d7ccc8',
    marginBottom: 10,
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    marginBottom: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(62, 39, 35, 0.4)',
  },
  imagePlaceholder: {
    width: 100,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fdfbf7',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: {
    color: '#d4af37',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1.5,
    borderColor: '#d4af37',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#d4af37',
    fontWeight: '700',
    fontSize: 15,
  },
});
