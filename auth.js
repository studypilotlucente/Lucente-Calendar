import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

function formatUser(user, nameInput = "") {
  const name = nameInput || user.displayName || "User";

  return {
    uid: user.uid,
    name: name,
    nameLower: name.toLowerCase(),
    username: name.toLowerCase().replace(/\s+/g, ""),
    email: user.email.toLowerCase(),
    photo: user.photoURL || "logo.svg",
    friends: []
  };
}

async function createUserIfNotExists(user, nameInput = "") {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const userData = formatUser(user, nameInput);
    await setDoc(userRef, userData);
  }
}

window.signup = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value;

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await createUserIfNotExists(cred.user, name);

  window.location.href = "app.html";
};

window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const cred = await signInWithEmailAndPassword(auth, email, password);

  await createUserIfNotExists(cred.user);

  window.location.href = "app.html";
};

window.googleSignIn = async function() {
  const result = await signInWithPopup(auth, provider);

  await createUserIfNotExists(result.user);

  window.location.href = "app.html";
};