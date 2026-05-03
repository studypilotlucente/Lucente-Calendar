import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbqObVk7L1tEttPNL7iJEuQcjJtA-Xzhg",
  authDomain: "lucente-calendar-fdb10.firebaseapp.com",
  projectId: "lucente-calendar-fdb10",
  storageBucket: "lucente-calendar-fdb10.firebasestorage.app",
  messagingSenderId: "443438868901",
  appId: "1:443438868901:web:ebb0cc14af638e578a604c",
  measurementId: "G-H5VSF3232W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);