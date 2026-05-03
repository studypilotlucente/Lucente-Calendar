import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  await loadProfile();
  await loadEvents();
  await loadFriends();
});

async function loadProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("userName").textContent = data.name;
    document.getElementById("userEmail").textContent = data.email;
    document.getElementById("userPhoto").src = data.photo;
  }
}

window.addEvent = async function() {
  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const time = document.getElementById("eventTime").value;

  if (!title || !date || !time) {
    alert("Please fill in all event details.");
    return;
  }

  const event = {
    id: Date.now(),
    title,
    date,
    time
  };

  const eventRef = doc(db, "events", currentUser.uid);
  const snap = await getDoc(eventRef);

  if (snap.exists()) {
    await updateDoc(eventRef, {
      events: arrayUnion(event)
    });
  } else {
    await setDoc(eventRef, {
      uid: currentUser.uid,
      events: [event]
    });
  }

  document.getElementById("eventTitle").value = "";
  document.getElementById("eventDate").value = "";
  document.getElementById("eventTime").value = "";

  await loadEvents();
};

async function loadEvents() {
  const eventList = document.getElementById("eventList");
  eventList.innerHTML = "";

  const eventRef = doc(db, "events", currentUser.uid);
  const snap = await getDoc(eventRef);

  if (!snap.exists() || snap.data().events.length === 0) {
    eventList.innerHTML = "<p>No events yet.</p>";
    return;
  }

  snap.data().events.forEach(event => {
    eventList.innerHTML += `
      <div class="mini-card">
        <strong>${event.title}</strong>
        <p>${event.date} at ${event.time}</p>
      </div>
    `;
  });
}

window.searchFriend = async function() {
  const searchValue = document.getElementById("friendSearch").value.trim().toLowerCase();
  const resultBox = document.getElementById("searchResult");

  resultBox.innerHTML = "";

  if (!searchValue) {
    alert("Type an email or username.");
    return;
  }

  const usersRef = collection(db, "users");

  const emailQuery = query(usersRef, where("email", "==", searchValue));
  const usernameQuery = query(usersRef, where("username", "==", searchValue));

  const emailResults = await getDocs(emailQuery);
  const usernameResults = await getDocs(usernameQuery);

  let foundUser = null;

  emailResults.forEach(doc => foundUser = doc.data());
  usernameResults.forEach(doc => foundUser = doc.data());

  if (!foundUser) {
    resultBox.innerHTML = "<p>No user found.</p>";
    return;
  }

  if (foundUser.uid === currentUser.uid) {
    resultBox.innerHTML = "<p>You cannot add yourself.</p>";
    return;
  }

  resultBox.innerHTML = `
    <div class="mini-card">
      <strong>${foundUser.name}</strong>
      <p>${foundUser.email}</p>
      <button onclick="addFriend('${foundUser.uid}')">Add Friend</button>
    </div>
  `;
};

window.addFriend = async function(friendUid) {
  const userRef = doc(db, "users", currentUser.uid);

  await updateDoc(userRef, {
    friends: arrayUnion(friendUid)
  });

  alert("Friend added!");
  await loadFriends();
};

async function loadFriends() {
  const friendsList = document.getElementById("friendsList");
  friendsList.innerHTML = "";

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists() || !snap.data().friends || snap.data().friends.length === 0) {
    friendsList.innerHTML = "<p>No friends added yet.</p>";
    return;
  }

  for (const friendUid of snap.data().friends) {
    const friendSnap = await getDoc(doc(db, "users", friendUid));

    if (friendSnap.exists()) {
      const friend = friendSnap.data();

      friendsList.innerHTML += `
        <div class="mini-card friend">
          <img src="${friend.photo}" alt="${friend.name}" />
          <div>
            <strong>${friend.name}</strong>
            <p>${friend.email}</p>
          </div>
        </div>
      `;
    }
  }
}

window.logout = async function() {
  await signOut(auth);
  window.location.href = "index.html";
};