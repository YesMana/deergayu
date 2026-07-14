import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchVideos, type VideoItem } from '../../lib/api';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';

export default function VideosScreen() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVideos();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Videos</Text>
        <Text style={styles.sub}>Same library as the website</Text>
      </View>
      {loading && !items.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>No videos yet</Text>}
          renderItem={({ item }) => (
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.name}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
              {item.url ? (
                <TouchableOpacity style={styles.open} onPress={() => Linking.openURL(item.url!)}>
                  <MaterialIcons name="play-circle-filled" size={22} color="#0a140f" />
                  <Text style={styles.openText}>Watch</Text>
                </TouchableOpacity>
              ) : null}
            </BlurView>
          )}
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
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
    backgroundColor: 'rgba(20,32,24,0.9)',
    overflow: 'hidden',
  },
  name: { color: '#f5f7f4', fontWeight: '700', fontSize: 17 },
  desc: { color: '#9aaa9a', marginTop: 8, lineHeight: 20 },
  open: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7cb342',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  openText: { color: '#0a140f', fontWeight: '800' },
});
