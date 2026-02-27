import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/**
 * Sign in with Google popup. Returns the Firebase User.
 */
export async function signInWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, provider);
    return result.user;
}

/**
 * Get the current Firebase ID token (refreshed automatically).
 */
export async function getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
}

/**
 * Sign out of Firebase.
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 */
export { onAuthStateChanged, auth };
