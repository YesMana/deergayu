import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  cancelAppointment,
  fetchMyAppointments,
  type Appointment,
} from '../lib/api';

export default function AppointmentsScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyAppointments();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
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

  const onCancel = (id: string) => {
    Alert.alert('Cancel appointment?', 'This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAppointment(id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Cancel failed');
          }
        },
      },
    ]);
  };

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
        <Text style={styles.title}>My Appointments</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading && !items.length ? (
        <ActivityIndicator color="#7cb342" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#7cb342" />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No appointments yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.providerName}</Text>
              <Text style={styles.meta}>
                {item.date} · {item.time}
              </Text>
              <Text style={styles.status}>{item.status}</Text>
              {item.status === 'pending' || item.status === 'accepted' ? (
                <TouchableOpacity style={styles.cancel} onPress={() => onCancel(item.id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
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
  name: { color: '#f5f7f4', fontWeight: '700', fontSize: 16 },
  meta: { color: '#9aaa9a', marginTop: 4 },
  status: { color: '#7cb342', marginTop: 6, textTransform: 'capitalize', fontWeight: '700' },
  cancel: { marginTop: 10, alignSelf: 'flex-start' },
  cancelText: { color: '#ef5350', fontWeight: '700' },
});
