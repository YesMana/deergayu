import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  fetchWishlist,
  fetchProduct,
  toggleWishlist,
  productImage,
  type Product,
} from '../lib/api';

export default function WishlistScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { items = [] } = await fetchWishlist();
      if (!items.length) {
        setProducts([]);
        return;
      }
      const resolved = await Promise.all(
        items.map(async (id) => {
          try {
            return await fetchProduct(id);
          } catch {
            return null;
          }
        })
      );
      setProducts(resolved.filter(Boolean) as Product[]);
    } catch (e: any) {
      setError(e?.message || 'Could not load wishlist');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) {
        router.replace('/login');
        return;
      }
      load();
    }, [authLoading, user, router, load])
  );

  const remove = async (id: string) => {
    try {
      await toggleWishlist(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    }
  };

  if (authLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7cb342" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Wishlist</Text>
        <View style={{ width: 36 }} />
      </View>

      {error ? (
        <TouchableOpacity onPress={load} style={styles.errorWrap}>
          <Text style={styles.error}>{error} · Tap to retry</Text>
        </TouchableOpacity>
      ) : null}

      {loading && !products.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No saved items yet. Heart a product in Shop.</Text>
          }
          renderItem={({ item }) => {
            const img = productImage(item);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(`/product/${item.id}`)}
              >
                {img ? (
                  <Image source={{ uri: img }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]}>
                    <MaterialIcons name="spa" size={22} color="#6a7a6a" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.price}>
                    Rs. {Number(item.price || item.basePrice || 0).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => remove(item.id)} hitSlop={10}>
                  <MaterialIcons name="favorite" size={22} color="#ef5350" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  center: { flex: 1, backgroundColor: '#0a140f', alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
  },
  backBtn: { width: 36 },
  topTitle: { color: '#f5f7f4', fontWeight: '800', fontSize: 17 },
  errorWrap: { paddingHorizontal: 20, marginBottom: 8 },
  error: { color: '#ef5350', textAlign: 'center' },
  empty: { color: '#9aaa9a', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#142018',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbPh: { backgroundColor: 'rgba(124,179,66,0.08)', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#f5f7f4', fontWeight: '700', fontSize: 15 },
  price: { color: '#d4af37', marginTop: 4, fontWeight: '600' },
});
