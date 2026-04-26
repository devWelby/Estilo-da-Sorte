import React, { createContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { paths } from '../data/firebase/firestorePaths';

export const AuthContext = createContext(null);

const devCredentials = {
  admin: { email: 'admin@dev.local', password: '123456' },
  vendedor: { email: 'vendedor@dev.local', password: '123456' },
  cliente: { email: 'cliente@dev.local', password: '123456' }
};

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setProfile(null);
      return undefined;
    }

    setProfileLoading(true);
    const ref = doc(db, paths.user(firebaseUser.uid));
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      setProfileLoading(false);
    }, () => {
      setProfile(null);
      setProfileLoading(false);
    });
    return unsubscribe;
  }, [firebaseUser?.uid]);

  async function signIn(email, password) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function devLogin(role) {
    const credentials = devCredentials[role];
    if (!credentials) throw new Error('Perfil dev inválido');
    await signIn(credentials.email, credentials.password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const value = useMemo(() => ({
    user: firebaseUser,
    profile,
    loading: loading || profileLoading,
    signIn,
    devLogin,
    signOut
  }), [firebaseUser, profile, loading, profileLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
