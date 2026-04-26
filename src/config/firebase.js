import { initializeApp, getApps } from 'firebase/app';
import { Platform } from 'react-native';
import {
  getAuth,
  connectAuthEmulator,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { ENV } from './env';

const fallbackConfig = {
  apiKey: 'demo-key',
  authDomain: 'estilo-da-sorte-dev.firebaseapp.com',
  projectId: 'estilo-da-sorte-dev',
  storageBucket: 'estilo-da-sorte-dev.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo'
};

const app = getApps().length ? getApps()[0] : initializeApp({
  ...fallbackConfig,
  ...Object.fromEntries(Object.entries(ENV.firebase).filter(([, value]) => !!value))
});

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  auth = getAuth(app);
}

let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
} catch (error) {
  db = getFirestore(app);
}

const functions = getFunctions(app, 'us-central1');

function getEmulatorHost() {
  if (ENV.emulator.host) {
    return ENV.emulator.host;
  }
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

if (__DEV__ && ENV.useEmulators) {
  const host = getEmulatorHost();
  try {
    connectAuthEmulator(auth, `http://${host}:${ENV.emulator.authPort}`);
    connectFirestoreEmulator(db, host, ENV.emulator.firestorePort);
    connectFunctionsEmulator(functions, host, ENV.emulator.functionsPort);
  } catch (error) {
    console.log('Emuladores ja conectados ou indisponiveis:', error?.message);
  }
}

export { app, auth, db, functions };
