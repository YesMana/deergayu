import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminAppointments,
  fetchAdminExperts,
  fetchAdminOrders,
  fetchAdminOverview,
  fetchAdminProducts,
  productImage,
  setAppointmentStatus,
  setOrderStatus,
  setProductStatus,
  setUserStatus,
  type AdminAppointment,
  type AdminExpert,
  type AdminOrder,
  type AdminOverview,
  type Product,
} from '../lib/api';

type Tab = 'home' | 'experts' | 'products' | 'orders' | 'appointments';

const ORDER_NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  awaiting_payment: ['confirmed', 'cancelled'],
};

const APPT_NEXT: Record<string, string[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['completed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
};

function isAdminProfile(profile: any, email?: string | null) {
  if (profile?.isAdmin || profile?.role === 'admin') return true;
  if ((email || '').toLowerCase() === 'yes.manujaya@gmail.com') return true;
  return false;
}

export default function AdminScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [experts, setExperts] = useState<AdminExpert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [expertFilter, setExpertFilter] = useState<'pending' | 'all'>('pending');
  const [productFilter, setProductFilter] = useState<'pending' | 'all'>('pending');

  const admin = isAdminProfile(profile, user?.email);

  const load = useCallback(async () => {
    if (!user || !admin) return;
    setLoading(true);
    try {
      const [ov, ex, pr, or, ap] = await Promise.all([
        fetchAdminOverview().catch(() => null),
        fetchAdminExperts(expertFilter === 'pending' ? 'pending' : undefined).catch(() => []),
        fetchAdminProducts(productFilter === 'pending' ? 'pending' : undefined).catch(() => []),
        fetchAdminOrders().catch(() => []),
        fetchAdminAppointments().catch(() => []),
      ]);
      if (ov) setOverview(ov);
      setExperts(Array.isArray(ex) ? ex : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setOrders(Array.isArray(or) ? or.slice(0, 40) : []);
      setAppointments(Array.isArray(ap) ? ap.slice(0, 40) : []);
    } finally {
      setLoading(false);
    }
  }, [user, admin, expertFilter, productFilter]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!admin) {
        Alert.alert('Admin only', 'This area is for Deergayu admins.');
        router.replace('/account');
        return;
      }
      load();
    }, [authLoading, user, admin, router, load])
  );

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e: any) {
      Alert.alert(label, e?.message || 'Failed');
    }
  };

  if (authLoading || !user || !admin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7cb342" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#d4af37" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>Deergayu</Text>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
        <MaterialIcons name="shield" size={22} color="#7cb342" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsInner}
      >
        {(
          [
            ['home', 'Overview'],
            ['experts', 'Experts'],
            ['products', 'Products'],
            ['orders', 'Orders'],
            ['appointments', 'Appts'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id && styles.tabOn]}
            onPress={() => setTab(id)}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
      >
        {tab === 'home' && (
          <>
            <Text style={styles.sectionTitle}>Needs attention</Text>
            <View style={styles.statGrid}>
              {[
                { label: 'Pending experts', value: overview?.pendingExperts ?? '—', tab: 'experts' as Tab },
                { label: 'Pending products', value: overview?.pendingProducts ?? '—', tab: 'products' as Tab },
                { label: 'Pending orders', value: overview?.pendingOrders ?? '—', tab: 'orders' as Tab },
                {
                  label: 'Pending appts',
                  value: overview?.pendingAppointments ?? '—',
                  tab: 'appointments' as Tab,
                },
              ].map((s) => (
                <TouchableOpacity key={s.label} style={styles.statCard} onPress={() => setTab(s.tab)}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Platform</Text>
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{overview?.totalUsers ?? '—'}</Text>
                <Text style={styles.statLabel}>Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{overview?.totalProducts ?? '—'}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{overview?.totalOrders ?? '—'}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              Full settings, videos, guide & reviews remain on deergayu.com/admin. Mobile covers
              approvals and order/appointment actions.
            </Text>
          </>
        )}

        {tab === 'experts' && (
          <>
            <View style={styles.filterRow}>
              {(['pending', 'all'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, expertFilter === f && styles.filterOn]}
                  onPress={() => setExpertFilter(f)}
                >
                  <Text style={[styles.filterText, expertFilter === f && styles.filterTextOn]}>
                    {f === 'pending' ? 'Pending' : 'All experts'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {experts.length === 0 ? (
              <Text style={styles.empty}>No experts in this filter</Text>
            ) : (
              experts.map((ex) => (
                <View key={ex.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{ex.name || 'Expert'}</Text>
                  <Text style={styles.cardMeta}>
                    {(ex.role || 'doctor').toUpperCase()} · {(ex.status || 'pending').toUpperCase()}
                  </Text>
                  {ex.email ? <Text style={styles.cardSub}>{ex.email}</Text> : null}
                  <View style={styles.actions}>
                    {ex.status !== 'approved' && (
                      <TouchableOpacity
                        style={styles.okBtn}
                        onPress={() => act('Approve', () => setUserStatus(ex.id, 'approved'))}
                      >
                        <Text style={styles.okBtnText}>Approve</Text>
                      </TouchableOpacity>
                    )}
                    {ex.status !== 'rejected' && (
                      <TouchableOpacity
                        style={styles.dangerBtn}
                        onPress={() => act('Reject', () => setUserStatus(ex.id, 'rejected'))}
                      >
                        <Text style={styles.dangerBtnText}>Reject</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'products' && (
          <>
            <View style={styles.filterRow}>
              {(['pending', 'all'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, productFilter === f && styles.filterOn]}
                  onPress={() => setProductFilter(f)}
                >
                  <Text style={[styles.filterText, productFilter === f && styles.filterTextOn]}>
                    {f === 'pending' ? 'Pending' : 'All products'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {products.length === 0 ? (
              <Text style={styles.empty}>No products in this filter</Text>
            ) : (
              products.map((p) => {
                const img = productImage(p);
                return (
                  <View key={p.id} style={[styles.card, styles.rowCard]}>
                    {img ? (
                      <Image source={{ uri: img }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <MaterialIcons name="image" size={20} color="#6a7a6a" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={styles.cardMeta}>
                        Rs. {Number(p.price || 0).toLocaleString()} ·{' '}
                        {(p.status || 'pending').toUpperCase()}
                      </Text>
                      <View style={styles.actions}>
                        {p.status !== 'approved' && (
                          <TouchableOpacity
                            style={styles.okBtn}
                            onPress={() => act('Approve', () => setProductStatus(p.id, 'approved'))}
                          >
                            <Text style={styles.okBtnText}>Approve</Text>
                          </TouchableOpacity>
                        )}
                        {p.status !== 'hidden' && (
                          <TouchableOpacity
                            style={styles.ghostBtn}
                            onPress={() => act('Hide', () => setProductStatus(p.id, 'hidden'))}
                          >
                            <Text style={styles.ghostBtnText}>Hide</Text>
                          </TouchableOpacity>
                        )}
                        {p.status !== 'rejected' && (
                          <TouchableOpacity
                            style={styles.dangerBtn}
                            onPress={() => act('Reject', () => setProductStatus(p.id, 'rejected'))}
                          >
                            <Text style={styles.dangerBtnText}>Reject</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            {orders.length === 0 ? (
              <Text style={styles.empty}>No orders</Text>
            ) : (
              orders.map((o) => {
                const next = ORDER_NEXT[o.status || ''] || ['confirmed', 'cancelled'];
                const total = o.totalPrice ?? o.grandTotal ?? o.total ?? 0;
                return (
                  <View key={o.id} style={styles.card}>
                    <Text style={styles.cardTitle}>#{o.id.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.cardMeta}>
                      {o.customerName || o.customerEmail || 'Customer'} ·{' '}
                      {(o.status || 'pending').toUpperCase()}
                    </Text>
                    <Text style={styles.cardSub}>
                      Rs. {Number(total).toLocaleString()} · {o.paymentMethod || 'n/a'}
                    </Text>
                    <View style={styles.actions}>
                      {next.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={s === 'cancelled' ? styles.dangerBtn : styles.okBtn}
                          onPress={() => act('Order', () => setOrderStatus(o.id, s))}
                        >
                          <Text style={s === 'cancelled' ? styles.dangerBtnText : styles.okBtnText}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'appointments' && (
          <>
            {appointments.length === 0 ? (
              <Text style={styles.empty}>No appointments</Text>
            ) : (
              appointments.map((a) => {
                const next = APPT_NEXT[a.status || ''] || ['accepted', 'rejected'];
                return (
                  <View key={a.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{a.providerName || 'Provider'}</Text>
                    <Text style={styles.cardMeta}>
                      {a.date} {a.time} · {(a.status || 'pending').toUpperCase()}
                    </Text>
                    <Text style={styles.cardSub}>
                      {a.customerName || a.customerEmail || 'Customer'}
                    </Text>
                    <View style={styles.actions}>
                      {next.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={
                            s === 'rejected' || s === 'cancelled' ? styles.dangerBtn : styles.okBtn
                          }
                          onPress={() => act('Appointment', () => setAppointmentStatus(a.id, s))}
                        >
                          <Text
                            style={
                              s === 'rejected' || s === 'cancelled'
                                ? styles.dangerBtnText
                                : styles.okBtnText
                            }
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  center: { flex: 1, backgroundColor: '#0a140f', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,179,66,0.15)',
  },
  backBtn: { width: 36 },
  headerEyebrow: { color: '#d4af37', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  headerTitle: { color: '#f5f7f4', fontSize: 20, fontWeight: '800' },
  tabs: { maxHeight: 52, borderTopWidth: 1, borderTopColor: 'rgba(124,179,66,0.08)' },
  tabsInner: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
  },
  tabOn: { backgroundColor: 'rgba(124,179,66,0.18)', borderColor: '#7cb342' },
  tabText: { color: '#9aaa9a', fontWeight: '700', fontSize: 13 },
  tabTextOn: { color: '#7cb342' },
  body: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: '#f5f7f4', fontWeight: '800', fontSize: 16, marginBottom: 10, marginTop: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#142018',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
  },
  statValue: { color: '#7cb342', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#9aaa9a', fontSize: 12, marginTop: 4, fontWeight: '600' },
  hint: { color: '#6a7a6a', fontSize: 12, lineHeight: 18, marginTop: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
  },
  filterOn: { borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.1)' },
  filterText: { color: '#9aaa9a', fontWeight: '700', fontSize: 12 },
  filterTextOn: { color: '#d4af37' },
  empty: { color: '#6a7a6a', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#142018',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.15)',
  },
  rowCard: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#0a140f' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#f5f7f4', fontWeight: '800', fontSize: 15 },
  cardMeta: { color: '#7cb342', fontSize: 12, fontWeight: '700', marginTop: 4 },
  cardSub: { color: '#9aaa9a', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  okBtn: {
    backgroundColor: '#7cb342',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  okBtnText: { color: '#0a140f', fontWeight: '800', fontSize: 12, textTransform: 'capitalize' },
  dangerBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dangerBtnText: { color: '#ef5350', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ghostBtnText: { color: '#d4af37', fontWeight: '700', fontSize: 12 },
});
