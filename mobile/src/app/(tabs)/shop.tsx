import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { fetchProducts, productImage, type Product } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ShopScreen() {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.q === 'string') setQuery(params.q);
  }, [params.q]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchProducts(80);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Could not load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const handleAdd = async (item: Product) => {
    try {
      await addToCart(item);
      setAddedId(item.id);
      setTimeout(() => setAddedId(null), 1200);
    } catch {
      /* alert handled in cart context when logged-in server fails */
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const img = productImage(item);
    return (
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <TouchableOpacity
          style={styles.cardPress}
          activeOpacity={0.9}
          onPress={() => router.push(`/product/${item.id}`)}
        >
          {img ? (
            <Image source={{ uri: img }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="image" size={40} color="rgba(212, 175, 55, 0.4)" />
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.productCategory}>{item.category || 'General'}</Text>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.row}>
              <Text style={styles.productPrice}>
                Rs. {Number(item.price || 0).toLocaleString()}
              </Text>
              {item.rating ? (
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={16} color="#d4af37" />
                  <Text style={styles.ratingText}>{Number(item.rating).toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.addButton, addedId === item.id && styles.addButtonDone]}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation?.();
                handleAdd(item);
              }}
            >
              <MaterialIcons
                name={addedId === item.id ? 'check' : 'add-shopping-cart'}
                size={18}
                color="#0a140f"
              />
              <Text style={styles.addButtonText}>
                {addedId === item.id ? 'Added' : 'Add to Cart'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>{t('srv_shop_title')}</Text>
        <Text style={styles.subtitle}>{t('srv_shop_desc')}</Text>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#9aaa9a" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#6a7a6a"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#7cb342"
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No products found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  headerArea: { padding: 20, paddingTop: 24, paddingBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7cb342',
    marginBottom: 8,
  },
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
  searchInput: {
    flex: 1,
    color: '#f5f7f4',
    paddingVertical: 12,
    fontSize: 15,
  },
  listContainer: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,32,24,0.9)',
  },
  cardPress: {
    flexDirection: 'row',
  },
  image: { width: 120, height: '100%', minHeight: 140 },
  imagePlaceholder: {
    width: 120,
    backgroundColor: 'rgba(124,179,66,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1, padding: 14 },
  productCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f5f7f4',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: { fontSize: 17, fontWeight: '800', color: '#7cb342' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: { color: '#d4af37', marginLeft: 4, fontSize: 13, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#7cb342',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonDone: { backgroundColor: '#d4af37' },
  addButtonText: { color: '#0a140f', fontWeight: '700', fontSize: 14 },
  center: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  errorText: { color: '#ef5350', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#7cb342',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#0a140f', fontWeight: '700' },
  empty: { color: '#9aaa9a', textAlign: 'center', marginTop: 40 },
});
