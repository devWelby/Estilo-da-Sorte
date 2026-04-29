import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Config, ENV } from '../config/env';
import { paths } from '../data/firebase/firestorePaths';
import { registerPushToken } from '../data/repositories/notificationRepository';
import { bootstrapDevData } from '../data/repositories/devRepository';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const lastRegisteredTokenRef = useRef(null);

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

  useEffect(() => {
    if (!firebaseUser?.uid || !ENV.devFcmToken) return;
    if (lastRegisteredTokenRef.current === ENV.devFcmToken) return;

    registerPushToken(ENV.devFcmToken, Platform.OS)
      .then(() => {
        lastRegisteredTokenRef.current = ENV.devFcmToken;
      })
      .catch(() => {
        // Registro de push em dev e opcional, nao deve quebrar login.
      });
  }, [firebaseUser?.uid]);

  async function signIn(email, password) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function devLogin(role) {
    const devModeEnabled = __DEV__ && ENV.useEmulators && Config.ENABLE_DEV_LOGIN;
    if (!devModeEnabled) {
      throw new Error('Login de desenvolvimento desativado neste ambiente.');
    }

    const roleToEmail = {
      admin: 'admin@dev.local',
      vendedor: 'vendedor@dev.local',
      cliente: 'cliente@dev.local'
    };
    const email = roleToEmail[role];
    if (!email) throw new Error('Perfil dev invalido');
    const password = '123456';

    try {
      await signIn(email, password);
    } catch (error) {
      const code = String(error?.code || '');
      const message = String(error?.message || '');
      const canBootstrap = devModeEnabled;
      const isMissingUser = code.includes('auth/user-not-found')
        || code.includes('auth/invalid-credential')
        || message.includes('INVALID_LOGIN_CREDENTIALS');

      if (!canBootstrap || !isMissingUser) {
        throw error;
      }

      await bootstrapDevData();
      await signIn(email, password);
    }
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
