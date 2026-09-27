// Android: native Google account picker, then hand the ID token to Firebase.
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signOut as fbSignOut } from 'firebase/auth';
import { auth } from './firebase';
import { googleWebClientId } from '../config';

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: googleWebClientId });
  configured = true;
}

/** Returns false if the student closed the account picker. */
export async function signInWithGoogle(): Promise<boolean> {
  if (!auth) throw new Error('Firebase is not set up yet.');
  if (!googleWebClientId) throw new Error('Google sign-in is missing its web client ID.');
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return false;
    const idToken = res.data.idToken;
    if (!idToken) throw new Error('Google did not return a sign-in token. Check the web client ID.');
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return false;
    throw e;
  }
}

export async function signOutEverywhere(): Promise<void> {
  configure();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device; nothing to clear.
  }
  if (auth) await fbSignOut(auth);
}
