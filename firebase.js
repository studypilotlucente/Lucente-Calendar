import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PASTE-YOUR-API-KEY",
  authDomain: "PASTE-YOUR-AUTH-DOMAIN",
  projectId: "PASTE-YOUR-PROJECT-ID",
  storageBucket: "PASTE-YOUR-STORAGE-BUCKET",
  messagingSenderId: "PASTE-YOUR-MESSAGING-SENDER-ID",
  appId: "PASTE-YOUR-APP-ID"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);