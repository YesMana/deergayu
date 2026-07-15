import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name || email.split('@')[0], email, password);
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Auth error', e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Google Sign-In', e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>Deergayu</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
      <Text style={styles.sub}>Same account as the website — data stays in sync.</Text>

      <TouchableOpacity
        style={[styles.googleBtn, busy && { opacity: 0.6 }]}
        onPress={onGoogle}
        disabled={busy}
      >
        <MaterialIcons name="login" size={20} color="#f5f7f4" />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#6a7a6a"
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6a7a6a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#6a7a6a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#0a140f" />
        ) : (
          <Text style={styles.btnText}>{mode === 'login' ? 'Sign in' : 'Register'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switch}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a140f',
    padding: 24,
    justifyContent: 'center',
  },
  brand: { color: '#7cb342', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  title: { color: '#f5f7f4', fontSize: 24, fontWeight: '700' },
  sub: { color: '#9aaa9a', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,247,244,0.25)',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: '#142018',
  },
  googleText: { color: '#f5f7f4', fontWeight: '700', fontSize: 15 },
  hint: { color: '#d4af37', fontSize: 12, marginTop: 8, lineHeight: 18 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(124,179,66,0.25)' },
  orText: { color: '#6a7a6a', fontWeight: '600' },
  input: {
    backgroundColor: '#142018',
    borderWidth: 1,
    borderColor: 'rgba(124,179,66,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#f5f7f4',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#7cb342',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#0a140f', fontWeight: '800', fontSize: 16 },
  switch: { color: '#d4af37', textAlign: 'center', marginTop: 18, fontWeight: '600' },
});
