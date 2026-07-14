import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  fetchFeaturedProducts,
  fetchFeaturedProviders,
  fetchHomeStats,
  productImage,
  type HomeStats,
  type Product,
  type Provider,
} from '../../lib/api';
import { useCart } from '../../context/CartContext';

export default function HomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { addToCart } = useCart();

  const [stats, setStats] = useState<HomeStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, p, pr] = await Promise.all([
        fetchHomeStats().catch(() => null),
        fetchFeaturedProducts().catch(() => []),
        fetchFeaturedProviders().catch(() => []),
      ]);
      if (s) setStats(s);
      setProducts(Array.isArray(p) ? p.slice(0, 4) : []);
      setProviders(Array.isArray(pr) ? pr.slice(0, 3) : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderHeroText = () => {
    if (t('hero_title').includes('Deergayu')) {
      return (
        <Text style={styles.heroTitle}>
          Discover Ancient Healing with <Text style={styles.gradientText}>Deergayu</Text>
        </Text>
      );
    }
    return (
      <Text style={styles.heroTitle}>
        <Text style={styles.gradientText}>දීර්ඝායු</Text> සමගින් පෞරාණික ආයුර්වේද සුවය අත්විඳින්න
      </Text>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      bounces
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4caf50" />}
    >
      <ImageBackground
        source={require('../../../assets/images/react-logo.png')}
        style={styles.heroContainer}
      >
        <LinearGradient
          colors={['rgba(10, 20, 16, 0.45)', 'rgba(10, 20, 16, 0.95)']}
          style={styles.overlay}
        />

        <View style={styles.heroContent}>
          {renderHeroText()}
          <Text style={styles.heroSubtitle}>{t('hero_subtitle')}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.navigate('/shop')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="local-pharmacy" size={20} color="#0a140f" />
              <Text style={styles.primaryButtonText}>{t('btn_shop')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.navigate('/channeling')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="event" size={20} color="#d4af37" />
              <Text style={styles.secondaryButtonText}>{t('btn_book')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Live stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.expertCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Experts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.productCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats?.appointmentCount ?? '—'}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Featured products from API */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <TouchableOpacity onPress={() => router.navigate('/shop')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading && !products.length ? (
          <ActivityIndicator color="#4caf50" style={{ marginVertical: 20 }} />
        ) : (
          products.map((item) => {
            const img = productImage(item);
            return (
              <BlurView key={item.id} intensity={20} tint="dark" style={styles.productCard}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <MaterialIcons name="image" size={28} color="rgba(212,175,55,0.4)" />
                  </View>
                )}
                <View style={styles.productBody}>
                  <Text style={styles.productCat}>{item.category || 'General'}</Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    Rs. {Number(item.price || 0).toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      addToCart(item).catch(() => {});
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add-shopping-cart" size={16} color="#0a140f" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            );
          })
        )}
      </View>

      {/* Featured providers */}
      {providers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Experts</Text>
            <TouchableOpacity onPress={() => router.navigate('/channeling')}>
              <Text style={styles.seeAll}>Book</Text>
            </TouchableOpacity>
          </View>
          {providers.map((p) => (
            <BlurView key={p.id} intensity={20} tint="dark" style={styles.providerCard}>
              <View style={styles.providerAvatar}>
                <MaterialIcons name="person" size={28} color="#d4af37" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{p.name}</Text>
                <Text style={styles.providerRole}>
                  {p.profileDetails?.specialty || p.role || 'Expert'}
                </Text>
              </View>
              <View style={styles.ratingPill}>
                <MaterialIcons name="star" size={14} color="#d4af37" />
                <Text style={styles.ratingText}>{Number(p.rating || 4.5).toFixed(1)}</Text>
              </View>
            </BlurView>
          ))}
        </View>
      )}

      {/* Services shortcuts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('services_title')}</Text>
        <View style={styles.titleUnderline} />

        <TouchableOpacity onPress={() => router.navigate('/shop')} activeOpacity={0.85}>
          <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
            <MaterialIcons name="shopping-bag" size={28} color="#d4af37" />
            <Text style={styles.cardTitle}>{t('srv_shop_title')}</Text>
            <Text style={styles.cardDesc}>{t('srv_shop_desc')}</Text>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.navigate('/channeling')} activeOpacity={0.85}>
          <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
            <MaterialIcons name="person" size={28} color="#d4af37" />
            <Text style={styles.cardTitle}>{t('srv_doc_title')}</Text>
            <Text style={styles.cardDesc}>{t('srv_doc_desc')}</Text>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.navigate('/symptom-checker')} activeOpacity={0.85}>
          <BlurView intensity={20} tint="dark" style={styles.serviceCard}>
            <MaterialIcons name="healing" size={28} color="#4caf50" />
            <Text style={styles.cardTitle}>AI Symptom Checker</Text>
            <Text style={styles.cardDesc}>Ayurvedic remedies based on your symptoms.</Text>
          </BlurView>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  heroContainer: { minHeight: 420, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFill },
  heroContent: { padding: 24, paddingBottom: 36, zIndex: 1 },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f5f7f4',
    marginBottom: 12,
  },
  gradientText: { color: '#7cb342' },
  heroSubtitle: {
    fontSize: 15,
    color: '#b8c4b8',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: { gap: 12 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7cb342',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: { color: '#0a140f', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#d4af37',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  secondaryButtonText: { color: '#d4af37', fontSize: 16, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -18,
    gap: 8,
    zIndex: 2,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#142018',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
  },
  statValue: { color: '#7cb342', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#9aaa9a', fontSize: 11, marginTop: 4, fontWeight: '600' },
  errorText: { color: '#ef5350', textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
  section: { padding: 20, paddingTop: 28 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#f5f7f4' },
  seeAll: { color: '#7cb342', fontWeight: '700', fontSize: 14 },
  titleUnderline: {
    width: 48,
    height: 3,
    backgroundColor: '#7cb342',
    marginTop: 6,
    marginBottom: 18,
    borderRadius: 2,
  },
  productCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
    backgroundColor: 'rgba(20,32,24,0.85)',
  },
  productImage: { width: 96, height: 110 },
  productImagePlaceholder: {
    width: 96,
    height: 110,
    backgroundColor: 'rgba(124,179,66,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: { flex: 1, padding: 12, justifyContent: 'center' },
  productCat: {
    fontSize: 10,
    color: '#d4af37',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productName: { color: '#f5f7f4', fontWeight: '700', fontSize: 15, marginTop: 4 },
  productPrice: { color: '#7cb342', fontWeight: '800', fontSize: 16, marginTop: 6 },
  addBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7cb342',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { color: '#0a140f', fontWeight: '700', fontSize: 13 },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
    backgroundColor: 'rgba(20,32,24,0.85)',
    overflow: 'hidden',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: { color: '#f5f7f4', fontWeight: '700', fontSize: 16 },
  providerRole: { color: '#9aaa9a', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingText: { color: '#d4af37', fontWeight: '700', fontSize: 12 },
  serviceCard: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    backgroundColor: 'rgba(20,32,24,0.7)',
    overflow: 'hidden',
    gap: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#f5f7f4' },
  cardDesc: { color: '#9aaa9a', textAlign: 'center', lineHeight: 20, fontSize: 14 },
});
