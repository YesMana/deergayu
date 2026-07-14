import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import BookingModal from '../../components/BookingModal';
import { fetchProviders, type Provider } from '../../lib/api';
import { useFocusEffect } from 'expo-router';

export default function ChannelingScreen() {
  const { t } = useLanguage();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Provider | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProviders();
      setProviders(Array.isArray(data) ? data : []);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = providers.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const spec = p.profileDetails?.specialty;
    const specStr = Array.isArray(spec) ? spec.join(' ') : spec || '';
    return (
      (p.name || '').toLowerCase().includes(q) ||
      specStr.toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  });

  const renderDoctor = ({ item }: { item: Provider }) => {
    const specialty = item.profileDetails?.specialty;
    const specialtyText = Array.isArray(specialty)
      ? specialty.join(', ')
      : specialty || item.role || 'Expert';
    return (
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <View style={styles.imagePlaceholder}>
          <MaterialIcons name="person" size={40} color="rgba(212, 175, 55, 0.4)" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.doctorName}>{item.name}</Text>
          <Text style={styles.specialty}>{specialtyText}</Text>
          <View style={styles.detailsRow}>
            {item.profileDetails?.experience ? (
              <View style={styles.detailItem}>
                <MaterialIcons name="work" size={16} color="#d4af37" />
                <Text style={styles.detailText}>{item.profileDetails.experience}</Text>
              </View>
            ) : null}
            <View style={styles.detailItem}>
              <MaterialIcons name="star" size={16} color="#d4af37" />
              <Text style={styles.detailText}>{Number(item.rating || 0).toFixed(1)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bookButton}
            activeOpacity={0.8}
            onPress={() => {
              setSelected(item);
              setModalVisible(true);
            }}
          >
            <Text style={styles.bookButtonText}>{t('btn_book')}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>{t('srv_doc_title')}</Text>
        <Text style={styles.subtitle}>{t('srv_doc_desc')}</Text>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#9aaa9a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
            placeholderTextColor="#6a7a6a"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading && !providers.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderDoctor}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
          ListEmptyComponent={<Text style={styles.empty}>No providers found</Text>}
        />
      )}

      <BookingModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        provider={selected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  headerArea: { padding: 20, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#7cb342', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9aaa9a', marginBottom: 14, lineHeight: 22 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#142018',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
  },
  searchInput: { flex: 1, color: '#f5f7f4', paddingVertical: 12, fontSize: 15 },
  listContainer: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(20,32,24,0.9)',
  },
  imagePlaceholder: {
    width: 100,
    backgroundColor: 'rgba(212,175,55,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1, padding: 14 },
  doctorName: { fontSize: 17, fontWeight: '700', color: '#f5f7f4' },
  specialty: { color: '#d4af37', marginTop: 4, fontSize: 13 },
  detailsRow: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { color: '#9aaa9a', fontSize: 12 },
  bookButton: {
    backgroundColor: '#7cb342',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: { color: '#0a140f', fontWeight: '800' },
  empty: { color: '#9aaa9a', textAlign: 'center', marginTop: 40 },
});
