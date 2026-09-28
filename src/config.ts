// Firebase web config for your project (Firebase console → Project settings → Your apps → Web app).
// These values are not secrets: Firestore security rules are what protect each student's data.
// Values below are for the PCMBtracker project; `.env` can override them (see `.env.example`).

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBqvesA91Up-6QL85HfZdkHnvBAyElKec8',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'pcmbtracker.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'pcmbtracker',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'pcmbtracker.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '406630955934',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:406630955934:web:df51c761c294b66a16f48f',
};

/** OAuth "Web client" ID from Google Cloud (Firebase → Authentication → Google → Web SDK configuration). Needed for Google sign-in on Android. */
export const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '406630955934-jvefd3c21m03r2615tmt4067ahvr18s4.apps.googleusercontent.com';

/** True once the Firebase project is filled in. Without it the app runs in on-device mode (no sign-in, no sync). */
export const isFirebaseConfigured = firebaseConfig.apiKey !== '' && firebaseConfig.projectId !== '';
