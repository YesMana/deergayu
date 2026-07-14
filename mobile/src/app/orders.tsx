import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchMyOrders, type Order } from '../lib/api';

export default function OrdersScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) {
        router.replace('/login');
        return;
      }
      if (user) load();
    }, [authLoading, user, router, load])
  );

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7cb342" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading && !orders.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.id}>#{item.id.slice(-8).toUpperCase()}</Text>
              <Text style={styles.status}>{item.status || 'pending'}</Text>
              <Text style={styles.total}>
                Rs. {Number(item.grandTotal ?? item.total ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.date}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a140f' },
  center: { flex: 1, backgroundColor: '#0a140f', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { color: '#f5f7f4', fontSize: 18, fontWeight: '700' },
  empty: { color: '#9aaa9a', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#142018',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.2)',
  },
  id: { color: '#d4af37', fontWeight: '700' },
  status: { color: '#7cb342', marginTop: 4, textTransform: 'capitalize' },
  total: { color: '#f5f7f4', fontWeight: '800', fontSize: 16, marginTop: 6 },
  date: { color: '#6a7a6a', marginTop: 4, fontSize: 12 },
});
