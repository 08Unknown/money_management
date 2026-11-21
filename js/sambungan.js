import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0z0_BoWaDeWsLRxrfTiAuyHtxT7GW6B0",
  authDomain: "money-management-b186a.firebaseapp.com",
  projectId: "money-management-b186a",
  storageBucket: "money-management-b186a.firebasestorage.app",
  messagingSenderId: "427776856352",
  appId: "1:427776856352:web:c10c89b475ecd019b94745",
  measurementId: "G-WEDDC776B1"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function ensureFirebaseAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}
