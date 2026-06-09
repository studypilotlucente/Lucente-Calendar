import { auth, provider, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let mode = new URLSearchParams(window.location.search).get("mode") || "signin";

const nameInput = document.getElementById("nameInput");
const title = document.getElementById("authTitle");
const btn = document.getElementById("emailAuthBtn");
const switchText = document.getElementById("switchAuthText");

function cleanUsername(value) {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

function setupAuthMode() {
  if (mode === "signup") {
    title.textContent = "Create Account";
    document.title = "Create Account | Lucente Calendar";
    nameInput.style.display = "block";
    nameInput.required = true;
    btn.textContent = "Create Account";
    switchText.innerHTML = `Already have an account? <button type="button" onclick="switchMode('signin')">Sign in</button>`;
  } else {
    title.textContent = "Sign In";
    document.title = "Sign In | Lucente Calendar";
    nameInput.style.display = "none";
    nameInput.required = false;
    btn.textContent = "Sign In";
    switchText.innerHTML = `No account yet? <button type="button" onclick="switchMode('signup')">Create one</button>`;
  }
}

window.switchMode = function(newMode) {
  mode = newMode;
  setupAuthMode();
};

async function createUserProfile(user, nameValue = "") {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) return;

  const name = nameValue || user.displayName || user.email.split("@")[0];

  await setDoc(userRef, {
    uid: user.uid,
    name: name,
    nameLower: name.toLowerCase(),
    username: cleanUsername(name),
    email: user.email.toLowerCase(),
    photo: user.photoURL || "logo.svg",
    friends: [],
    createdAt: Date.now()
  });
}

btn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const email = document.getElementById("emailInput").value.trim().toLowerCase();
  const password = document.getElementById("passwordInput").value.trim();

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  if (mode === "signup" && !name) {
    alert("Please enter your name to create an account.");
    return;
  }

  try {
    if (mode === "signup") {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(result.user, name);
      window.location.href = "app.html";
    } else {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserProfile(result.user);
      window.location.href = "app.html";
    }
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      alert("Account already created. Please sign in.");
      mode = "signin";
      setupAuthMode();
      return;
    }

    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      alert("Incorrect email or password.");
      return;
    }

    if (error.code === "auth/user-not-found") {
      alert("No account found. Please create an account first.");
      mode = "signup";
      setupAuthMode();
      return;
    }

    alert(error.message);
  }
});

window.googleLogin = async function() {
  try {
    const result = await signInWithPopup(auth, provider);
    await createUserProfile(result.user, result.user.displayName);
    window.location.href = "app.html";
  } catch (error) {
    alert("Google login failed: " + error.message);
  }
};

onAuthStateChanged(auth, user => {
  if (user && window.location.pathname.includes("auth.html")) {
    window.location.href = "app.html";
  }
});

setupAuthMode();