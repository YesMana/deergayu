import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchMyAppointments, fetchMyOrders, type Appointment, type Order } from '../lib/api';

export default function AccountScreen() {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [apptTotal, setApptTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const isAdmin = Boolean(profile?.isAdmin || profile?.role === 'admin');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [o, a] = await Promise.all([
        fetchMyOrders().catch(() => []),
        fetchMyAppointments().catch(() => []),
      ]);
      const ordersArr = Array.isArray(o) ? o : [];
      const apptArr = Array.isArray(a) ? a : [];
      setOrderTotal(ordersArr.length);
      setApptTotal(apptArr.length);
      setOrders(ordersArr.slice(0, 5));
      setAppointments(apptArr.slice(0, 5));
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

  if (authLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7cb342" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
          <Text style={styles.avatarText}>
            {(user.displayName || user.email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user.displayName || profile?.name || 'Member'}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.role}>
          {(profile?.role || 'user').toString().toUpperCase()} · synced with website
        </Text>
      </View>

      {isAdmin ? (
        <TouchableOpacity style={styles.adminLink} onPress={() => router.push('/admin')}>
          <MaterialIcons name="shield" size={22} color="#0a140f" />
          <Text style={styles.adminLinkText}>Admin Panel</Text>
          <MaterialIcons name="chevron-right" size={22} color="#0a140f" />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.link} onPress={() => router.push('/orders')}>
        <MaterialIcons name="receipt-long" size={22} color="#7cb342" />
        <Text style={styles.linkText}>My Orders ({orderTotal})</Text>
        <MaterialIcons name="chevron-right" size={22} color="#6a7a6a" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => router.push('/appointments')}>
        <MaterialIcons name="event" size={22} color="#7cb342" />
        <Text style={styles.linkText}>My Appointments ({apptTotal})</Text>
        <MaterialIcons name="chevron-right" size={22} color="#6a7a6a" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={() => router.push('/cart')}>
        <MaterialIcons name="shopping-cart" size={22} color="#7cb342" />
        <Text style={styles.linkText}>Cart</Text>
        <MaterialIcons name="chevron-right" size={22} color="#6a7a6a" />
      </TouchableOpacity>

      {(orders.length > 0 || appointments.length > 0) && (
        <Text style={styles.previewHint}>Recent activity preview</Text>
      )}

      <TouchableOpacity
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace('/login');
        }}
      >
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  center: { flex: 1, backgroundColor: '#0a140f', alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', padding: 28, paddingTop: 40 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7cb342',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarAdmin: { backgroundColor: '#d4af37' },
  avatarText: { color: '#0a140f', fontSize: 28, fontWeight: '800' },
  name: { color: '#f5f7f4', fontSize: 22, fontWeight: '700' },
  email: { color: '#9aaa9a', marginTop: 4 },
  role: { color: '#d4af37', marginTop: 8, fontSize: 12, fontWeight: '700' },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#7cb342',
  },
  adminLinkText: { flex: 1, color: '#0a140f', fontWeight: '800', fontSize: 16 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
  },
  linkText: { flex: 1, color: '#f5f7f4', fontWeight: '600', fontSize: 16 },
  previewHint: {
    color: '#6a7a6a',
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 8,
  },
  logout: {
    margin: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.4)',
    alignItems: 'center',
  },
  logoutText: { color: '#ef5350', fontWeight: '700' },
});
