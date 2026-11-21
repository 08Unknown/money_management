import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "MASUKKAN_API_KEY_ANDA",
  authDomain: "MASUKKAN_AUTH_DOMAIN_ANDA",
  projectId: "MASUKKAN_PROJECT_ID_ANDA",
  storageBucket: "MASUKKAN_STORAGE_BUCKET_ANDA",
  messagingSenderId: "MASUKKAN_MESSAGING_SENDER_ID_ANDA",
  appId: "MASUKKAN_APP_ID_ANDA"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function ensureFirebaseAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}
