// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);

// Firestore rules require an authenticated request. Pages that don't force a
// Google sign-in (e.g. the PIN-based registration flow) still need *some*
// Firebase Auth session, so fall back to an anonymous one whenever nobody is
// signed in. This runs once here since every page shares the same Auth
// singleton via getAuth().
const auth = getAuth(app);
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((error) => {
      console.error("Anonymous sign-in failed:", error);
    });
  }
});

