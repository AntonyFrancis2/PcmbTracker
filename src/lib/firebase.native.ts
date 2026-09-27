// Android: keep the signed-in session in AsyncStorage so students stay signed in.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig, isFirebaseConfigured } from '../config';

// Metro resolves `firebase/auth` to its React Native build, which exports getReactNativePersistence.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  const existing = getApps()[0];
  app = existing ?? initializeApp(firebaseConfig);
  auth = existing ? getAuth(app) : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  db = getFirestore(app);
}

export { app, auth, db };
