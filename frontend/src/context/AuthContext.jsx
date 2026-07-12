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
import { doc, getDoc, setDoc } from 'firebase/firestore';

const API_URL = import.meta.env.VITE_API_URL || '';
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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
              currentUser.role = data.role || 'user';
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
    // Create user doc in Firestore
    const userData = {
      name,
      email,
      role,
      status: role === 'user' ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };
    
    if (profileDetails && role !== 'user') {
      userData.profileDetails = profileDetails;
    }
    
    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    return userCredential;
  };

  const loginWithGoogle = async () => {
    return signInWithPopup(auth, googleProvider);
  };

  const resetPassword = async (email) => {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send password reset email');
    }
    return data;
  };

  const logout = () => {
    return signOut(auth);
  };

  // Call this after updating profileDetails in Firestore
  // to immediately refresh user state across all components
  const refreshUser = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        currentUser.role = data.role || 'user';
        currentUser.status = data.status || 'approved';
        currentUser.displayName = data.name || currentUser.displayName;
        currentUser.name = data.name || currentUser.displayName;
        currentUser.profileDetails = data.profileDetails || null;
      }
      // Force React re-render by creating a new object reference
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
      refreshUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
