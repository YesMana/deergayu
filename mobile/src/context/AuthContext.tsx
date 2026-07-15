import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithCustomToken,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { auth } from '../lib/firebase';
import { API_URL } from '../constants/api';
import { fetchAuthMe, postRegisterNotify } from '../lib/api';

WebBrowser.maybeCompleteAuthSession();

/** Same super-admin as website AuthContext / backend platformUtils */
const SUPER_ADMIN_EMAIL = 'yes.manujaya@gmail.com';

/** Website bridge that uses the same Firebase Google Sign-In as deergayu.com */
const MOBILE_AUTH_URL = (
  process.env.EXPO_PUBLIC_MOBILE_AUTH_URL || 'https://deergayu.com/mobile-auth'
).replace(/\/$/, '');

function resolveIsAdmin(user: User | null, profile: any | null) {
  if (profile?.isAdmin || profile?.role === 'admin') return true;
  const email = (user?.email || profile?.email || '').toLowerCase();
  if (email && email === SUPER_ADMIN_EMAIL) return true;
  return false;
}

type AuthContextValue = {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  googleConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseCodeFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams?.code;
    if (typeof q === 'string' && q) return q;
    if (Array.isArray(q) && q[0]) return String(q[0]);
    const m = url.match(/[?&#]code=([^&#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }
    try {
      const me = await fetchAuthMe();
      setProfile(me);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const me = await fetchAuthMe();
          setProfile(me);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    // Return path Expo Go / standalone can catch
    const redirectUri = Linking.createURL('google-auth');
    const authUrl = `${MOBILE_AUTH_URL}?redirect=${encodeURIComponent(redirectUri)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
      showInRecents: true,
      preferEphemeralSession: false,
    });

    if (result.type !== 'success' || !('url' in result) || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Google Sign-In cancelled');
      }
      throw new Error('Google Sign-In failed — browser closed without completing login');
    }

    const code = parseCodeFromUrl(result.url);
    if (!code) {
      throw new Error(
        'No login code returned. Make sure deergayu.com/mobile-auth is deployed, then try again.'
      );
    }

    const res = await fetch(`${API_URL}/api/auth/mobile-google/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Could not finish Google Sign-In');
    }

    const cred = await signInWithCustomToken(auth, data.customToken);
    postRegisterNotify({
      uid: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName,
      provider: 'google',
    }).catch(() => {});
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: resolveIsAdmin(user, profile),
      googleConfigured: true,
      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      register: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name) await updateProfile(cred.user, { displayName: name });
        postRegisterNotify({
          uid: cred.user.uid,
          email: cred.user.email,
          name,
        }).catch(() => {});
      },
      loginWithGoogle,
      logout: async () => {
        await signOut(auth);
      },
      getToken: async () => {
        if (!auth.currentUser) return null;
        return auth.currentUser.getIdToken();
      },
      refreshProfile,
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

void Platform;
