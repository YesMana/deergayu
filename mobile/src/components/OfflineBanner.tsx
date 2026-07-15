import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, AppState, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';

/** Lightweight connectivity check — no native NetInfo dependency. */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  const check = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      await fetch(`${API_URL}/api/home-stats`, {
        method: 'GET',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 20_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [check]);

  if (!offline) return null;

  return (
    <TouchableOpacity
      style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}
      onPress={check}
      activeOpacity={0.85}
    >
      <MaterialIcons name="wifi-off" size={18} color="#0a140f" />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>You're offline</Text>
        <Text style={styles.sub}>Tap to retry · some actions need a connection</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#d4af37',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  title: { color: '#0a140f', fontWeight: '800', fontSize: 13 },
  sub: { color: 'rgba(10,20,15,0.75)', fontSize: 11, marginTop: 1 },
});
