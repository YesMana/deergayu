import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { auth } from '../lib/firebase';
import { fetchAuthMe, postRegisterNotify } from '../lib/api';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/** Firebase Console → Authentication → Google → Web client ID */
export const GOOGLE_WEB_CLIENT_ID = (
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
).trim();

type AuthContextValue = {
  user: User | null;
  profile: any | null;
  loading: boolean;
  googleConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function makeNonce() {
  const raw = `${Date.now()}-${Math.random()}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
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
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        'Google Sign-In is not configured yet. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Firebase → Authentication → Google → Web client ID).'
      );
    }

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'deergayu',
      path: 'oauthredirect',
    });

    const nonce = await makeNonce();
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams: {
        nonce,
        prompt: 'select_account',
      },
    });

    await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
    const result = await request.promptAsync(GOOGLE_DISCOVERY, {
      showInRecents: true,
    });

    if (result.type !== 'success') {
      if (result.type === 'dismiss' || result.type === 'cancel') {
        throw new Error('Google Sign-In cancelled');
      }
      throw new Error('Google Sign-In failed');
    }

    const idToken = result.params.id_token;
    if (!idToken) {
      throw new Error(
        `No id_token returned. Add this redirect URI in Google Cloud Console: ${redirectUri}`
      );
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
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
      googleConfigured: Boolean(GOOGLE_WEB_CLIENT_ID),
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

// silence unused on web tooling
void Platform;
