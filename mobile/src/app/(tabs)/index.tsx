import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  fetchFeaturedProducts,
  fetchFeaturedProviders,
  fetchHomeStats,
  productImage,
  type HomeStats,
  type Product,
  type Provider,
} from '../../lib/api';
import { mediaUrl } from '../../constants/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const SERVICES = [
  {
    key: 'shop',
    icon: 'shopping-bag' as const,
    title: 'Ayurvedic Shop',
    desc: 'Authentic herbal medicines, oils & wellness products.',
    route: '/shop',
  },
  {
    key: 'channeling',
    icon: 'event' as const,
    title: 'Doctor Channeling',
    desc: 'Book certified Ayurvedic doctors — online or in person.',
    route: '/channeling',
  },
  {
    key: 'astrology',
    icon: 'auto-awesome' as const,
    title: 'Astrology & Vastu',
    desc: 'Life guidance from experienced astrologers.',
    route: '/astrology',
  },
  {
    key: 'guide',
    icon: 'menu-book' as const,
    title: 'Ayurvedic Guide',
    desc: 'Herbal remedies & daily routines from Sri Lankan tradition.',
    route: '/guide',
  },
];

function roleLabel(role?: string) {
  const map: Record<string, string> = {
    doctor: 'Ayurvedic Doctor',
    clinic: 'Ayurvedic Clinic',
    organization: 'Medical Organisation',
  };
  return map[role || ''] || 'Expert';
}

export default function HomeScreen() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState<HomeStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, p, pr] = await Promise.all([
        fetchHomeStats().catch(() => null),
        fetchFeaturedProducts().catch(() => []),
        fetchFeaturedProviders().catch(() => []),
      ]);
      if (s) setStats(s);
      setProducts(Array.isArray(p) ? p.slice(0, 6) : []);
      setProviders(Array.isArray(pr) ? pr.slice(0, 4) : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [load, fade, slide]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onSearch = () => {
    const q = query.trim();
    if (q) router.push({ pathname: '/shop', params: { q } });
    else router.navigate('/shop');
  };

  const isSi = lang === 'si' || (typeof t('hero_title') === 'string' && !t('hero_title').includes('Deergayu'));

  return (
    <ScrollView
      style={styles.container}
      bounces
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7cb342" />}
    >
      {/* ── HERO (matches web weda-gedara full-bleed) ── */}
      <ImageBackground
        source={require('../../../assets/images/weda-gedara.png')}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <LinearGradient
          colors={[
            'rgba(10, 20, 16, 0.55)',
            'rgba(10, 20, 16, 0.82)',
            'rgba(10, 20, 16, 0.96)',
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.heroInner,
            { opacity: fade, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.brandRow}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Deergayu</Text>
          </View>

          <View style={styles.heroLabel}>
            <MaterialIcons name="eco" size={14} color="#f3d568" />
            <Text style={styles.heroLabelText}>Sri Lanka's #1 Ayurvedic Platform</Text>
          </View>

          {isSi ? (
            <Text style={styles.heroTitle}>
              <Text style={styles.heroGradient}>දීර්ඝායු</Text>
              {'\n'}සමගින් පෞරාණික ආයුර්වේද සුවය
            </Text>
          ) : (
            <Text style={styles.heroTitle}>
              Discover Ancient Healing with{'\n'}
              <Text style={styles.heroGradient}>Deergayu</Text>
            </Text>
          )}

          <Text style={styles.heroSubtitle}>
            {t('hero_subtitle') ||
              'Certified doctors, authentic herbal remedies, and holistic wellness — in one place.'}
          </Text>

          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={20} color="#9aaa9a" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search remedies, oils, symptoms…"
              placeholderTextColor="#6a7a6a"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={onSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={onSearch} activeOpacity={0.85}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.navigate('/shop')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="local-pharmacy" size={18} color="#0a140f" />
              <Text style={styles.primaryBtnText}>{t('btn_shop') || 'Shop'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.navigate('/channeling')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="event" size={18} color="#d4af37" />
              <Text style={styles.secondaryBtnText}>{t('btn_book') || 'Book'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trustRow}>
            {['100% Natural', 'Certified Experts', 'Islandwide Delivery'].map((label) => (
              <View key={label} style={styles.trustItem}>
                <MaterialIcons name="check-circle" size={14} color="#7cb342" />
                <Text style={styles.trustText}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ImageBackground>

      {isAdmin ? (
        <TouchableOpacity style={styles.adminBanner} onPress={() => router.push('/admin')} activeOpacity={0.9}>
          <MaterialIcons name="shield" size={22} color="#0a140f" />
          <View style={{ flex: 1 }}>
            <Text style={styles.adminBannerTitle}>Admin Panel</Text>
            <Text style={styles.adminBannerSub}>Manage experts, products & orders</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#0a140f" />
        </TouchableOpacity>
      ) : null}

      {/* ── STATS ── */}
      <View style={styles.statsGrid}>
        {[
          { icon: 'groups' as const, value: stats?.expertCount ?? '—', label: 'Experts' },
          { icon: 'inventory-2' as const, value: stats?.productCount ?? '—', label: 'Products' },
          { icon: 'event-available' as const, value: stats?.appointmentCount ?? '—', label: 'Bookings' },
          { icon: 'verified' as const, value: '100%', label: 'Natural' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <MaterialIcons name={s.icon} size={18} color="#7cb342" />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* ── SERVICES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>What We Offer</Text>
        <Text style={styles.sectionTitle}>Our Services</Text>
        <Text style={styles.sectionSub}>
          Everything for your holistic health journey — ancient wisdom, modern ease.
        </Text>
        <View style={styles.servicesGrid}>
          {SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.key}
              style={styles.serviceCard}
              onPress={() => router.navigate(svc.route as any)}
              activeOpacity={0.88}
            >
              <View style={styles.serviceIcon}>
                <MaterialIcons name={svc.icon} size={26} color="#d4af37" />
              </View>
              <Text style={styles.serviceTitle}>{svc.title}</Text>
              <Text style={styles.serviceDesc}>{svc.desc}</Text>
              <View style={styles.serviceLink}>
                <Text style={styles.serviceLinkText}>Open</Text>
                <MaterialIcons name="chevron-right" size={16} color="#7cb342" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── DOCTORS ── */}
      {(loading || providers.length > 0) && (
        <View style={[styles.section, styles.sectionAlt]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Verified Experts</Text>
              <Text style={styles.sectionTitle}>Meet Our Doctors</Text>
            </View>
            <TouchableOpacity onPress={() => router.navigate('/channeling')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading && !providers.length ? (
            <ActivityIndicator color="#7cb342" style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {providers.map((p) => {
                const pic = mediaUrl(p.profileDetails?.profileImageUrl);
                const specialty = Array.isArray(p.profileDetails?.specialty)
                  ? p.profileDetails?.specialty.join(', ')
                  : p.profileDetails?.specialty;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.doctorCard}
                    activeOpacity={0.9}
                    onPress={() => router.navigate('/channeling')}
                  >
                    {pic ? (
                      <Image source={{ uri: pic }} style={styles.doctorAvatar} />
                    ) : (
                      <View style={[styles.doctorAvatar, styles.doctorPlaceholder]}>
                        <Text style={styles.doctorInitial}>
                          {(p.name || 'D')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.doctorName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.doctorRole}>{roleLabel(p.role)}</Text>
                    {specialty ? (
                      <Text style={styles.doctorSpecialty} numberOfLines={1}>
                        {specialty}
                      </Text>
                    ) : null}
                    <View style={styles.ratingRow}>
                      <MaterialIcons name="star" size={14} color="#d4af37" />
                      <Text style={styles.ratingText}>
                        {Number(p.rating || 4.5).toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.bookMini}>
                      <Text style={styles.bookMiniText}>Book</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── PRODUCTS ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Popular Products</Text>
            <Text style={styles.sectionTitle}>Trending Remedies</Text>
          </View>
          <TouchableOpacity onPress={() => router.navigate('/shop')}>
            <Text style={styles.seeAll}>Shop</Text>
          </TouchableOpacity>
        </View>

        {loading && !products.length ? (
          <ActivityIndicator color="#7cb342" style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {products.map((item) => {
              const img = productImage(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productCard}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/product/${item.id}`)}
                >
                  {img ? (
                    <Image source={{ uri: img }} style={styles.productImg} />
                  ) : (
                    <View style={[styles.productImg, styles.productImgEmpty]}>
                      <MaterialIcons name="image" size={32} color="rgba(212,175,55,0.35)" />
                    </View>
                  )}
                  {item.category ? (
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{item.category}</Text>
                    </View>
                  ) : null}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      Rs. {Number(item.price || 0).toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      style={styles.addChip}
                      onPress={() => addToCart(item).catch(() => {})}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="add-shopping-cart" size={14} color="#0a140f" />
                      <Text style={styles.addChipText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── CTA ── */}
      <LinearGradient
        colors={['#142018', '#1a2e22', '#0a140f']}
        style={styles.ctaBand}
      >
        <MaterialIcons name="spa" size={36} color="#d4af37" />
        <Text style={styles.ctaTitle}>Start Your Wellness Journey</Text>
        <Text style={styles.ctaSub}>
          Shop remedies or book a consultation — same account as deergayu.com.
        </Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.navigate('/channeling')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Book a Doctor</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#0a140f" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const CARD_W = Math.min(168, SCREEN_W * 0.42);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  hero: {
    minHeight: 520,
    justifyContent: 'flex-end',
  },
  heroImage: { resizeMode: 'cover' },
  heroInner: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  logo: { width: 40, height: 40 },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5f7f4',
    letterSpacing: 0.5,
  },
  heroLabel: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  heroLabelText: {
    color: '#f3d568',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fdfbf7',
    lineHeight: 38,
    marginBottom: 12,
  },
  heroGradient: { color: '#7cb342' },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(253, 251, 247, 0.78)',
    lineHeight: 22,
    marginBottom: 18,
    maxWidth: 360,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 32, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(124, 179, 66, 0.28)',
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#f5f7f4',
    fontSize: 14,
    paddingVertical: 8,
  },
  searchBtn: {
    backgroundColor: '#7cb342',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchBtnText: { color: '#0a140f', fontWeight: '800', fontSize: 13 },
  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7cb342',
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#0a140f', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryBtnText: { color: '#d4af37', fontWeight: '700', fontSize: 15 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { color: 'rgba(253,251,247,0.7)', fontSize: 12, fontWeight: '500' },

  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: -10,
    marginBottom: 8,
    zIndex: 3,
    backgroundColor: '#7cb342',
    borderRadius: 14,
    padding: 14,
  },
  adminBannerTitle: { color: '#0a140f', fontWeight: '800', fontSize: 15 },
  adminBannerSub: { color: 'rgba(10,20,15,0.7)', fontSize: 12, marginTop: 2 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: -18,
    zIndex: 2,
  },
  statCard: {
    width: (SCREEN_W - 32 - 24) / 4,
    minWidth: 72,
    flexGrow: 1,
    backgroundColor: '#142018',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 179, 66, 0.22)',
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 179, 66, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { color: '#7cb342', fontSize: 16, fontWeight: '800' },
  statLabel: { color: '#9aaa9a', fontSize: 10, marginTop: 2, fontWeight: '600' },

  errorText: { color: '#ef5350', textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },

  section: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 8 },
  sectionAlt: {
    backgroundColor: '#0e1a12',
    marginTop: 12,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionEyebrow: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#f5f7f4' },
  sectionSub: {
    color: '#9aaa9a',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  seeAll: { color: '#7cb342', fontWeight: '700', fontSize: 14, marginBottom: 4 },

  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: (SCREEN_W - 40 - 12) / 2,
    backgroundColor: 'rgba(20, 32, 24, 0.95)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.14)',
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  serviceTitle: { color: '#f5f7f4', fontWeight: '800', fontSize: 14, marginBottom: 4 },
  serviceDesc: { color: '#9aaa9a', fontSize: 12, lineHeight: 17, flexGrow: 1 },
  serviceLink: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  serviceLinkText: { color: '#7cb342', fontWeight: '700', fontSize: 13 },

  hScroll: { paddingRight: 20, gap: 12 },

  doctorCard: {
    width: CARD_W,
    backgroundColor: 'rgba(20, 32, 24, 0.95)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  doctorAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  doctorPlaceholder: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorInitial: { color: '#d4af37', fontSize: 26, fontWeight: '800' },
  doctorName: { color: '#f5f7f4', fontWeight: '800', fontSize: 14, textAlign: 'center' },
  doctorRole: { color: '#7cb342', fontSize: 11, fontWeight: '600', marginTop: 2 },
  doctorSpecialty: { color: '#9aaa9a', fontSize: 11, marginTop: 4, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8 },
  ratingText: { color: '#d4af37', fontWeight: '700', fontSize: 12 },
  bookMini: {
    marginTop: 10,
    backgroundColor: '#7cb342',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bookMiniText: { color: '#0a140f', fontWeight: '800', fontSize: 12 },

  productCard: {
    width: CARD_W + 12,
    backgroundColor: 'rgba(20, 32, 24, 0.95)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 179, 66, 0.18)',
  },
  productImg: { width: '100%', height: 120, backgroundColor: '#142018' },
  productImgEmpty: { alignItems: 'center', justifyContent: 'center' },
  catBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(10, 20, 16, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: { color: '#d4af37', fontSize: 10, fontWeight: '700' },
  productInfo: { padding: 12 },
  productName: { color: '#f5f7f4', fontWeight: '700', fontSize: 13, minHeight: 36 },
  productPrice: { color: '#7cb342', fontWeight: '800', fontSize: 15, marginTop: 6 },
  addChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7cb342',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addChipText: { color: '#0a140f', fontWeight: '800', fontSize: 12 },

  ctaBand: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  ctaTitle: {
    color: '#f5f7f4',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  ctaSub: {
    color: '#9aaa9a',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7cb342',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaBtnText: { color: '#0a140f', fontWeight: '800', fontSize: 15 },
});
