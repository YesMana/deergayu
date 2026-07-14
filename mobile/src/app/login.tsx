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
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, register } = useAuth();
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>Deergayu</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
      <Text style={styles.sub}>Same account as the website — data stays in sync.</Text>

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
  sub: { color: '#9aaa9a', marginTop: 6, marginBottom: 24, lineHeight: 20 },
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
