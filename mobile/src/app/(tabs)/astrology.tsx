import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import BookingModal from '../../components/BookingModal';
import { fetchProviders, type Provider } from '../../lib/api';
import { useFocusEffect } from 'expo-router';

function isAstrologer(p: Provider) {
  const type = (p.profileDetails?.doctorType || p.role || '').toLowerCase();
  const specialty = p.profileDetails?.specialty;
  const spec = Array.isArray(specialty) ? specialty.join(' ') : specialty || '';
  return (
    type.includes('astro') ||
    spec.toLowerCase().includes('astro') ||
    (p.profileDetails?.astrologyServices?.length || 0) > 0
  );
}

export default function AstrologyScreen() {
  const { t } = useLanguage();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<Provider | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProviders();
      const list = Array.isArray(data) ? data.filter(isAstrologer) : [];
      setProviders(list.length ? list : Array.isArray(data) ? data : []);
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

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>{t('srv_astro_title')}</Text>
        <Text style={styles.subtitle}>{t('srv_astro_desc')}</Text>
      </View>

      {loading && !providers.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.empty}>No astrologers found</Text>}
          renderItem={({ item }) => {
            const specialty = item.profileDetails?.specialty;
            const specialtyText = Array.isArray(specialty)
              ? specialty.join(', ')
              : specialty || 'Astrology';
            return (
              <BlurView intensity={20} tint="dark" style={styles.card}>
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="auto-fix-high" size={40} color="rgba(212, 175, 55, 0.4)" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.astrologerName}>{item.name}</Text>
                  <Text style={styles.specialty}>{specialtyText}</Text>
                  <TouchableOpacity
                    style={styles.bookButton}
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
          }}
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
  headerArea: { padding: 20, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#7cb342', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#9aaa9a', marginBottom: 10, lineHeight: 22 },
  listContainer: { padding: 20, paddingTop: 10, paddingBottom: 40 },
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
  astrologerName: { fontSize: 17, fontWeight: '700', color: '#f5f7f4' },
  specialty: { color: '#d4af37', marginTop: 4, fontSize: 13, marginBottom: 12 },
  bookButton: {
    backgroundColor: '#7cb342',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: { color: '#0a140f', fontWeight: '800' },
  empty: { color: '#9aaa9a', textAlign: 'center', marginTop: 40 },
});
