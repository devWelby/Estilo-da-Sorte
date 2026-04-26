export const ENV = {
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'estilo-da-sorte-dev',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
  },
  emulator: {
    host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
    authPort: Number(process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || 9199),
    firestorePort: Number(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT || 8180),
    functionsPort: Number(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT || 5101)
  },
  useEmulators: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true',
  devLoginEnabled: process.env.EXPO_PUBLIC_DEV_LOGIN_ENABLED !== 'false'
};
