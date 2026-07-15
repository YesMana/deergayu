import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || 'https://deergayu-api.onrender.com';

/**
 * Bridge page for the Expo mobile app.
 * Opens in an in-app browser, signs in with the same Google/Firebase as the website,
 * then redirects back to the app with a short one-time code.
 */
export default function MobileAuth() {
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const [status, setStatus] = useState('Connecting to Google…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const finishWithUser = async (user) => {
    setStatus('Signing you into the app…');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_URL}/api/auth/mobile-google/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not create app login code');

    const base = redirect.split('#')[0];
    const join = base.includes('?') ? '&' : '?';
    window.location.href = `${base}${join}code=${encodeURIComponent(data.code)}`;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!redirect) {
        setError('Missing redirect URI. Open Google Sign-In from the Deergayu app.');
        return;
      }

      try {
        // Resume after Google redirect (common in in-app browsers)
        const redirectResult = await getRedirectResult(auth);
        if (cancelled) return;
        if (redirectResult?.user) {
          await finishWithUser(redirectResult.user);
          return;
        }

        if (auth.currentUser) {
          await finishWithUser(auth.currentUser);
          return;
        }

        setStatus('Choose your Google account…');
        try {
          const cred = await signInWithPopup(auth, googleProvider);
          if (cancelled) return;
          await finishWithUser(cred.user);
        } catch (popupErr) {
          // Popup often blocked in Android Custom Tabs — fall back to redirect
          console.warn('Popup failed, using redirect', popupErr);
          setStatus('Redirecting to Google…');
          await signInWithRedirect(auth, googleProvider);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Google Sign-In failed');
          setStatus('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirect]);

  const retry = async () => {
    setError('');
    setBusy(true);
    setStatus('Choose your Google account…');
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishWithUser(cred.user);
    } catch (e) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (e2) {
        setError(e2?.message || e?.message || 'Failed');
        setStatus('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: 'linear-gradient(160deg, #0a140f 0%, #142018 100%)',
        color: '#f5f7f4',
      }}
    >
      <h1 style={{ color: '#7cb342', marginBottom: '0.5rem' }}>Deergayu</h1>
      <p style={{ color: '#9aaa9a', maxWidth: 360, marginBottom: '1.5rem' }}>
        Mobile Google Sign-In — same account as the website.
      </p>
      {status ? <p style={{ fontWeight: 600 }}>{status}</p> : null}
      {error ? (
        <>
          <p style={{ color: '#ef5350', marginTop: '1rem', maxWidth: 400 }}>{error}</p>
          <button
            type="button"
            onClick={retry}
            disabled={busy}
            style={{
              marginTop: '1.25rem',
              background: '#7cb342',
              color: '#0a140f',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </>
      ) : (
        <div
          style={{
            marginTop: 16,
            width: 28,
            height: 28,
            border: '3px solid rgba(124,179,66,0.25)',
            borderTopColor: '#7cb342',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
