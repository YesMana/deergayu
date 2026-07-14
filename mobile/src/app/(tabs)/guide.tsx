import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { fetchGuideRemedies, type GuideItem } from '../../lib/api';
import { mediaUrl } from '../../constants/api';
import { BlurView } from 'expo-blur';

export default function GuideScreen() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGuideRemedies();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const label = (item: GuideItem) => {
    const loc = (item as any)[lang] || item.en || item.si || {};
    return loc.name || loc.title || item.category || 'Remedy';
  };

  const body = (item: GuideItem) => {
    const loc = (item as any)[lang] || item.en || item.si || {};
    return loc.uses || loc.preparation || loc.ingredients || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ayurvedic Guide</Text>
        <Text style={styles.sub}>Same remedies as deergayu.com</Text>
      </View>
      {loading && !items.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>No remedies yet</Text>}
          renderItem={({ item }) => {
            const img = mediaUrl(item.image);
            return (
              <BlurView intensity={20} tint="dark" style={styles.card}>
                {img ? <Image source={{ uri: img }} style={styles.image} /> : null}
                <View style={styles.body}>
                  <Text style={styles.cat}>{item.category || 'General'}</Text>
                  <Text style={styles.name}>{label(item)}</Text>
                  <Text style={styles.desc} numberOfLines={4}>
                    {body(item)}
                  </Text>
                </View>
              </BlurView>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  header: { padding: 20, paddingTop: 24 },
  title: { color: '#7cb342', fontSize: 26, fontWeight: '800' },
  sub: { color: '#9aaa9a', marginTop: 6 },
  empty: { color: '#9aaa9a', textAlign: 'center', marginTop: 40 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
    backgroundColor: 'rgba(20,32,24,0.9)',
  },
  image: { width: '100%', height: 140 },
  body: { padding: 14 },
  cat: { color: '#d4af37', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  name: { color: '#f5f7f4', fontWeight: '700', fontSize: 17, marginTop: 4 },
  desc: { color: '#9aaa9a', marginTop: 8, lineHeight: 20 },
});
