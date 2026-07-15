import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { title: 'Astrology & Vastu', desc: 'Book astrologers', icon: 'auto-awesome' as const, route: '/astrology' },
  { title: 'Ayurvedic Guide', desc: 'Remedies & routines', icon: 'menu-book' as const, route: '/guide' },
  { title: 'Videos', desc: 'Watch wellness content', icon: 'ondemand-video' as const, route: '/videos' },
  { title: 'AI Symptom Checker', desc: 'Get herbal guidance', icon: 'healing' as const, route: '/symptom-checker' },
  { title: 'Wishlist', desc: 'Saved products', icon: 'favorite' as const, route: '/wishlist' },
  { title: 'My Account', desc: 'Orders & appointments', icon: 'person' as const, route: '/account' },
  { title: 'Cart', desc: 'Review your basket', icon: 'shopping-cart' as const, route: '/cart' },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin, user } = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
    >
      <Text style={styles.title}>More</Text>
      <Text style={styles.sub}>Guides, tools, and account — same data as the website.</Text>

      {isAdmin ? (
        <TouchableOpacity style={styles.adminCard} onPress={() => router.push('/admin')}>
          <MaterialIcons name="shield" size={22} color="#0a140f" />
          <View style={{ flex: 1 }}>
            <Text style={styles.adminTitle}>Admin Panel</Text>
            <Text style={styles.adminSub}>Approvals & orders</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#0a140f" />
        </TouchableOpacity>
      ) : null}

      {LINKS.map((l) => (
        <TouchableOpacity
          key={l.route}
          style={styles.card}
          onPress={() => {
            if ((l.route === '/account' || l.route === '/wishlist') && !user) router.push('/login');
            else router.push(l.route as any);
          }}
        >
          <View style={styles.iconWrap}>
            <MaterialIcons name={l.icon} size={22} color="#d4af37" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{l.title}</Text>
            <Text style={styles.cardDesc}>{l.desc}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#6a7a6a" />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.legal}
        onPress={() => Linking.openURL('https://deergayu.com/privacy')}
      >
        <Text style={styles.legalText}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.legal}
        onPress={() => Linking.openURL('https://deergayu.com/terms')}
      >
        <Text style={styles.legalText}>Terms of Service</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f', paddingHorizontal: 16 },
  title: { color: '#7cb342', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  sub: { color: '#9aaa9a', marginBottom: 18, lineHeight: 20 },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#7cb342',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  adminTitle: { color: '#0a140f', fontWeight: '800', fontSize: 15 },
  adminSub: { color: 'rgba(10,20,15,0.7)', fontSize: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#142018',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: '#f5f7f4', fontWeight: '700', fontSize: 15 },
  cardDesc: { color: '#9aaa9a', fontSize: 12, marginTop: 2 },
  legal: { paddingVertical: 10, paddingHorizontal: 4 },
  legalText: { color: '#7cb342', fontWeight: '600', fontSize: 13 },
});
