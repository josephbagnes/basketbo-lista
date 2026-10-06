// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { signInFromHeatcheckLink } from "@/heatcheck";

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
// A link from HeatCheck carries the user's login; finish that sign-in before
// falling back to anonymous, so a throwaway anonymous session isn't created
// only to be replaced a moment later.
const heatcheckSignIn = signInFromHeatcheckLink(app, auth);
onAuthStateChanged(auth, (user) => {
  if (!user) {
    heatcheckSignIn.then(() => {
      if (auth.currentUser) return;
      return signInAnonymously(auth);
    }).catch((error) => {
      console.error("Anonymous sign-in failed:", error);
    });
  }
});

