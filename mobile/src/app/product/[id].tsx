import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  fetchProduct,
  fetchProductReviews,
  fetchWishlist,
  postReview,
  productImage,
  toggleWishlist,
  type Product,
  type Review,
} from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWishlist, setInWishlist] = useState(false);
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        fetchProduct(id),
        fetchProductReviews(id).catch(() => []),
      ]);
      setProduct(p);
      setReviews(Array.isArray(r) ? r : []);
      if (user) {
        const wl = await fetchWishlist().catch(() => ({ items: [] }));
        setInWishlist((wl.items || []).includes(id));
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load product');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const onWishlist = async () => {
    if (!user) {
      Alert.alert('Sign in', 'Sign in to save wishlist items.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/login') },
      ]);
      return;
    }
    try {
      const res = await toggleWishlist(id!);
      setInWishlist(Boolean(res.added));
    } catch (e: any) {
      Alert.alert('Wishlist', e?.message || 'Failed');
    }
  };

  const onAdd = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product);
      Alert.alert('Cart', 'Added to cart', [
        { text: 'OK' },
        { text: 'View cart', onPress: () => router.push('/cart') },
      ]);
    } catch {
      /* handled */
    } finally {
      setAdding(false);
    }
  };

  const onReview = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      await postReview({
        targetType: 'product',
        targetId: id!,
        rating,
        comment: comment.trim(),
      });
      setComment('');
      const r = await fetchProductReviews(id!);
      setReviews(Array.isArray(r) ? r : []);
      Alert.alert('Thanks', 'Review submitted');
    } catch (e: any) {
      Alert.alert('Review', e?.message || 'Failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7cb342" size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'Not found'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const img = productImage(product);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Product
        </Text>
        <TouchableOpacity onPress={onWishlist} style={styles.iconBtn}>
          <MaterialIcons
            name={inWishlist ? 'favorite' : 'favorite-border'}
            size={24}
            color={inWishlist ? '#ef5350' : '#d4af37'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {img ? (
          <Image source={{ uri: img }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroEmpty]}>
            <MaterialIcons name="image" size={48} color="#3a4a3a" />
          </View>
        )}

        <Text style={styles.category}>{product.category || 'General'}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>Rs. {Number(product.price || 0).toLocaleString()}</Text>
          {product.rating ? (
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={16} color="#d4af37" />
              <Text style={styles.ratingText}>
                {Number(product.rating).toFixed(1)}
                {product.reviewCount ? ` (${product.reviewCount})` : ''}
              </Text>
            </View>
          ) : null}
        </View>
        {product.vendorName ? (
          <Text style={styles.vendor}>Sold by {product.vendorName}</Text>
        ) : null}
        {product.description ? (
          <Text style={styles.desc}>{product.description}</Text>
        ) : (
          <Text style={styles.descMuted}>No description yet.</Text>
        )}

        <TouchableOpacity
          style={[styles.addBtn, adding && { opacity: 0.7 }]}
          onPress={onAdd}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="#0a140f" />
          ) : (
            <>
              <MaterialIcons name="add-shopping-cart" size={20} color="#0a140f" />
              <Text style={styles.addBtnText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.section}>Reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.descMuted}>No reviews yet.</Text>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.metaRow}>
                <Text style={styles.reviewName}>{r.userName || 'Customer'}</Text>
                <Text style={styles.ratingText}>★ {r.rating}</Text>
              </View>
              {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
            </View>
          ))
        )}

        <Text style={styles.section}>Write a review</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <MaterialIcons
                name={n <= rating ? 'star' : 'star-border'}
                size={28}
                color="#d4af37"
              />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Your comment"
          placeholderTextColor="#6a7a6a"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.reviewBtn, submittingReview && { opacity: 0.7 }]}
          onPress={onReview}
          disabled={submittingReview}
        >
          <Text style={styles.reviewBtnText}>
            {user ? 'Submit review' : 'Sign in to review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  center: { flex: 1, backgroundColor: '#0a140f', alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ef5350', marginBottom: 12 },
  link: { color: '#d4af37', fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,179,66,0.15)',
  },
  iconBtn: { width: 40, alignItems: 'center' },
  headerTitle: { color: '#f5f7f4', fontWeight: '700', fontSize: 17, flex: 1, textAlign: 'center' },
  scroll: { paddingBottom: 40 },
  hero: { width: '100%', height: 280, backgroundColor: '#142018' },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  category: {
    color: '#9aaa9a',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  name: {
    color: '#f5f7f4',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  price: { color: '#7cb342', fontSize: 20, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#d4af37', fontWeight: '700' },
  vendor: { color: '#9aaa9a', paddingHorizontal: 16, marginTop: 6 },
  desc: { color: '#c5d0c5', lineHeight: 22, paddingHorizontal: 16, marginTop: 14 },
  descMuted: { color: '#6a7a6a', paddingHorizontal: 16, marginTop: 14 },
  addBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#7cb342',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: { color: '#0a140f', fontWeight: '800', fontSize: 16 },
  section: {
    color: '#f5f7f4',
    fontWeight: '800',
    fontSize: 17,
    marginTop: 28,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  reviewCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
  },
  reviewName: { color: '#f5f7f4', fontWeight: '700' },
  reviewBody: { color: '#9aaa9a', marginTop: 6, lineHeight: 20 },
  stars: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 10 },
  input: {
    marginHorizontal: 16,
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
    borderRadius: 12,
    padding: 12,
    color: '#f5f7f4',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewBtnText: { color: '#d4af37', fontWeight: '700' },
});
