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

const VYNTRA_URL = "https://vyntra-connect.vercel.app";

let currentUser = null;
let currentEvents = [];
let notifiedEvents = new Set();

function normalise(value) {
  return value.toLowerCase().trim();
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "auth.html?mode=signin";
    return;
  }

  currentUser = user;

  await loadProfile();
  await loadEvents();
  await loadFriends();

  requestNotificationPermission();
  startEventReminderChecker();
});

async function loadProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("userName").textContent = data.name || currentUser.email;
    document.getElementById("userEmail").textContent = data.email || currentUser.email;
    document.getElementById("userPhoto").src = data.photo || "logo.svg";
  } else {
    document.getElementById("userName").textContent = currentUser.email.split("@")[0];
    document.getElementById("userEmail").textContent = currentUser.email;
    document.getElementById("userPhoto").src = "logo.svg";
  }
}

window.openVyntraChat = function() {
  const userEmail = currentUser?.email || "";
  const url = `${VYNTRA_URL}/login.html?source=lucente&email=${encodeURIComponent(userEmail)}`;
  window.open(url, "_blank");
};

window.openVyntraEventChat = function(eventTitle = "Lucente Event") {
  const userEmail = currentUser?.email || "";
  const url = `${VYNTRA_URL}/login.html?source=lucente&type=event&event=${encodeURIComponent(eventTitle)}&email=${encodeURIComponent(userEmail)}`;
  window.open(url, "_blank");
};

window.addEvent = async function() {
  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const time = document.getElementById("eventTime").value;

  if (!title || !date || !time) {
    alert("Please fill in all event details.");
    return;
  }

  const event = {
    id: String(Date.now()),
    title,
    date,
    time,
    notified: false
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

  if (!snap.exists() || !snap.data().events || snap.data().events.length === 0) {
    eventList.innerHTML = "<p>No events yet.</p>";
    currentEvents = [];
    renderCalendar();
    renderWeek();
    return;
  }

  currentEvents = snap.data().events.sort((a, b) => {
    return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
  });

  currentEvents.forEach(event => {
    eventList.innerHTML += `
      <div class="mini-card event-card">
        <div>
          <strong>${escapeHTML(event.title)}</strong>
          <p>${event.date} at ${event.time}</p>
        </div>

        <div class="event-actions">
          <button onclick="openVyntraEventChat('${escapeAttribute(event.title)}')" class="chat-event-btn">
            Chat
          </button>
          <span>🔔</span>
        </div>
      </div>
    `;
  });

  renderCalendar();
  renderWeek();
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  grid.innerHTML = "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = currentEvents.filter(event => event.date === date);

    grid.innerHTML += `
      <div class="mini-card calendar-day">
        <strong>${day}</strong>
        ${
          events.length > 0
            ? `<p>${events.length} event${events.length > 1 ? "s" : ""}</p>`
            : `<p>No events</p>`
        }
      </div>
    `;
  }
}

function renderWeek() {
  const weekList = document.getElementById("weekList");
  if (!weekList) return;

  weekList.innerHTML = "";

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);

    const date = day.toISOString().split("T")[0];
    const events = currentEvents.filter(event => event.date === date);

    weekList.innerHTML += `
      <div class="mini-card week-day">
        <strong>${day.toDateString()}</strong>
        ${
          events.length === 0
            ? "<p>No events</p>"
            : events.map(event => `<p>${escapeHTML(event.title)} at ${event.time}</p>`).join("")
        }
      </div>
    `;
  }
}

window.searchFriend = async function() {
  const rawSearch = document.getElementById("friendSearch").value.trim();
  const search = normalise(rawSearch);
  const searchNoSpaces = search.replace(/\s+/g, "");
  const resultBox = document.getElementById("searchResult");

  resultBox.innerHTML = "";

  if (!search) {
    alert("Type an email, name or username.");
    return;
  }

  const usersRef = collection(db, "users");

  const queries = [
    query(usersRef, where("email", "==", search)),
    query(usersRef, where("username", "==", searchNoSpaces)),
    query(usersRef, where("nameLower", "==", search))
  ];

  let foundUser = null;

  for (const q of queries) {
    const results = await getDocs(q);
    results.forEach(docSnap => {
      if (!foundUser) foundUser = docSnap.data();
    });
  }

  if (!foundUser) {
    resultBox.innerHTML = "<p>No user found. Check spelling or ask them to sign up first.</p>";
    return;
  }

  if (foundUser.uid === currentUser.uid) {
    resultBox.innerHTML = "<p>You cannot add yourself.</p>";
    return;
  }

  resultBox.innerHTML = `
    <div class="mini-card friend">
      <img src="${foundUser.photo || "logo.svg"}" alt="${escapeAttribute(foundUser.name)}" />
      <div>
        <strong>${escapeHTML(foundUser.name)}</strong>
        <p>${escapeHTML(foundUser.email)}</p>
        <button onclick="addFriend('${foundUser.uid}')" class="small-btn">Add Friend</button>
      </div>
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
          <img src="${friend.photo || "logo.svg"}" alt="${escapeAttribute(friend.name)}" />
          <div>
            <strong>${escapeHTML(friend.name)}</strong>
            <p>${escapeHTML(friend.email)}</p>
          </div>
        </div>
      `;
    }
  }
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function startEventReminderChecker() {
  setInterval(() => {
    const now = new Date();

    currentEvents.forEach(event => {
      const eventTime = new Date(`${event.date}T${event.time}`);
      const diff = eventTime - now;

      if (diff <= 0 && diff > -60000 && !notifiedEvents.has(event.id)) {
        notifiedEvents.add(event.id);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Lucente Calendar Reminder", {
            body: `${event.title} is starting now.`,
            icon: "logo.svg"
          });
        } else {
          alert(`Reminder: ${event.title} is starting now.`);
        }
      }
    });
  }, 15000);
}

function escapeHTML(text = "") {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttribute(text = "") {
  return String(text).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

window.logout = async function() {
  document.body.classList.add("page-exit");
  setTimeout(async () => {
    await signOut(auth);
    window.location.href = "index.html";
  }, 250);
};