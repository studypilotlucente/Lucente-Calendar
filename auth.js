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

let mode = "signin";

window.showAuth = function(selectedMode) {
  mode = selectedMode;

  const box = document.getElementById("authBox");
  const title = document.getElementById("authTitle");
  const nameInput = document.getElementById("nameInput");
  const btn = document.getElementById("emailAuthBtn");
  const switchText = document.getElementById("switchAuthText");

  box.classList.remove("hidden");

  if (mode === "signup") {
    title.textContent = "Create Account";
    nameInput.style.display = "block";
    btn.textContent = "Create Account";
    switchText.innerHTML = `Already have an account? <button onclick="showAuth('signin')">Sign in</button>`;
  } else {
    title.textContent = "Sign In";
    nameInput.style.display = "none";
    btn.textContent = "Sign In";
    switchText.innerHTML = `No account yet? <button onclick="showAuth('signup')">Create one</button>`;
  }
};

document.getElementById("emailAuthBtn").addEventListener("click", async () => {
  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();

  if (!email || !password) {
    alert("Please enter email and password.");
    return;
  }

  try {
    if (mode === "signup") {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name: name || email.split("@")[0],
        username: (name || email.split("@")[0]).toLowerCase(),
        email: email,
        photo: "https://via.placeholder.com/100",
        friends: []
      });

      window.location.href = "app.html";
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "app.html";
    }
  } catch (error) {
    alert(error.message);
  }
});

window.googleLogin = async function() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "Lucente User",
        username: (user.displayName || "user").toLowerCase().replaceAll(" ", ""),
        email: user.email,
        photo: user.photoURL || "https://via.placeholder.com/100",
        friends: []
      });
    }

    window.location.href = "app.html";
  } catch (error) {
    alert(error.message);
  }
};

onAuthStateChanged(auth, user => {
  if (user) {
    window.location.href = "app.html";
  }
});