// Web: Google sign-in popup.
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth } from './firebase';

export async function signInWithGoogle(): Promise<boolean> {
  if (!auth) throw new Error('Firebase is not set up yet.');
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    return true;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return false;
    throw e;
  }
}

export async function signOutEverywhere(): Promise<void> {
  if (auth) await fbSignOut(auth);
}
