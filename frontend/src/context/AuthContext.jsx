import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { API_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

async function completeRegistration(user, { name, role, profileDetails } = {}) {
  const token = await user.getIdToken();
  const res = await fetch(`${API_URL}/api/auth/complete-registration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: name || user.displayName || 'User',
      role: role || 'user',
      profileDetails: profileDetails || undefined,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to complete registration');
  }
  return res.json();
}

async function notifyRegistration(user, payload) {
  try {
    const token = await user.getIdToken();
    await fetch(`${API_URL}/api/auth/register-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: payload.name,
        email: user.email,
        role: payload.role,
        profileDetails: payload.profileDetails,
      }),
    });
  } catch (e) {
    console.error('Register notify error:', e);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const superAdmins = ['yes.manujaya@gmail.com'];
        if (currentUser.email && superAdmins.includes(currentUser.email.toLowerCase())) {
          currentUser.role = 'admin';
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.role === 'admin') {
                currentUser.role = 'admin';
              } else {
                currentUser.role = data.role || 'user';
              }
              currentUser.status = data.status || 'approved';
              currentUser.displayName = data.name || currentUser.displayName;
              currentUser.profileDetails = data.profileDetails || null;
            } else {
              currentUser.role = 'user';
            }
          } catch (e) {
            console.error("Error fetching user role:", e);
            currentUser.role = 'user';
          }

          // Multi-admin: confirm via backend if not already admin (checks adminEmails list)
          if (currentUser.role !== 'admin') {
            try {
              const token = await currentUser.getIdToken();
              const res = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const me = await res.json();
                if (me.isAdmin || me.role === 'admin') {
                  currentUser.role = 'admin';
                }
              }
            } catch (e) {
              console.error('Error checking admin status:', e);
            }
          }
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signupWithEmail = async (email, password, name, role, profileDetails = null) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Privileged fields (role/status) are set only via Admin SDK on the API
    await completeRegistration(userCredential.user, { name, role, profileDetails });
    await notifyRegistration(userCredential.user, { name, role, profileDetails });
    return userCredential;
  };

  const loginWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider);
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const logout = () => {
    return signOut(auth);
  };

  // Call this after updating profileDetails to refresh user state
  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'admin') currentUser.role = 'admin';
        else currentUser.role = data.role || 'user';
        currentUser.status = data.status || 'approved';
        currentUser.displayName = data.name || currentUser.displayName;
        currentUser.name = data.name || currentUser.displayName;
        currentUser.profileDetails = data.profileDetails || null;
      }
      setUser({ ...currentUser });
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithEmail, 
      signupWithEmail, 
      loginWithGoogle, 
      resetPassword, 
      logout,
      refreshUser,
      completeRegistration,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
