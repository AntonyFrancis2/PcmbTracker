// Firebase web config for your project (Firebase console → Project settings → Your apps → Web app).
// These values are not secrets: Firestore security rules are what protect each student's data.
// Set them in `.env` (see `.env.example`) or as GitHub Actions variables for the APK build.

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** OAuth "Web client" ID from Google Cloud (Firebase → Authentication → Google → Web SDK configuration). Needed for Google sign-in on Android. */
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** True once the Firebase project is filled in. Without it the app runs in on-device mode (no sign-in, no sync). */
export const isFirebaseConfigured = firebaseConfig.apiKey !== '' && firebaseConfig.projectId !== '';
