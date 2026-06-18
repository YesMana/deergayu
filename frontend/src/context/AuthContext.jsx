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
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const superAdmins = ['yes.manujaya@gmail.com'];
        if (superAdmins.includes(currentUser.email)) {
          currentUser.role = 'admin';
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              currentUser.role = data.role || 'user';
              currentUser.displayName = data.name || currentUser.displayName;
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

  const signupWithEmail = async (email, password, name, role) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Create user doc in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      email,
      role,
      createdAt: new Date().toISOString()
    });
    return userCredential;
  };

  const loginWithGoogle = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    // Check if user doc exists, if not create as normal user
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        name: userCredential.user.displayName || 'Google User',
        email: userCredential.user.email,
        role: 'user',
        createdAt: new Date().toISOString()
      });
    }
    return userCredential;
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const logout = () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithEmail, 
      signupWithEmail, 
      loginWithGoogle, 
      resetPassword, 
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
