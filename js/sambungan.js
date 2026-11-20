import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
