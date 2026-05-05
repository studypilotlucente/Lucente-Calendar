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
let currentEvents = [];
let currentMonth = new Date();
let notifiedEvents = new Set();

function normalise(value) {
  return value.toLowerCase().trim();
}

function todayString() {
  return new Date().toISOString().split("T")[0];
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

window.showView = function(viewName, button) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.remove("active-view");
  });

  document.querySelectorAll(".side-link").forEach(link => {
    link.classList.remove("active");
  });

  document.getElementById(`${viewName}View`).classList.add("active-view");

  if (button) {
    button.classList.add("active");
  }
};

async function loadProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("userName").textContent = data.name;
    document.getElementById("userEmail").textContent = data.email;
    document.getElementById("userPhoto").src = data.photo || "logo.svg";
  }
}

window.addEvent = async function() {
  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const time = document.getElementById("eventTime").value;
  const category = document.getElementById("eventCategory").value;
  const priority = document.getElementById("eventPriority").value;
  const notes = document.getElementById("eventNotes").value.trim();

  if (!title || !date || !time) {
    alert("Please fill in title, date and time.");
    return;
  }

  const event = {
    id: String(Date.now()),
    title,
    date,
    time,
    category,
    priority,
    notes,
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
  document.getElementById("eventNotes").value = "";

  await loadEvents();
};

async function loadEvents() {
  const eventRef = doc(db, "events", currentUser.uid);
  const snap = await getDoc(eventRef);

  if (!snap.exists() || !snap.data().events) {
    currentEvents = [];
  } else {
    currentEvents = snap.data().events.sort((a, b) => {
      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    });
  }

  renderUpcomingEvents();
  renderToday();
  renderStats();
  renderCalendar();
  renderSelectedDate(todayString());
  renderWeekSchedule();
}

function eventCardHTML(event) {
  return `
    <div class="mini-card event-card priority-${event.priority}">
      <div>
        <strong>${event.title}</strong>
        <p>${event.date} at ${event.time}</p>
        <span class="tag">${event.category}</span>
        <span class="tag">${event.priority}</span>
        ${event.notes ? `<p class="event-notes">${event.notes}</p>` : ""}
      </div>
      <span class="bell">🔔</span>
    </div>
  `;
}

function renderUpcomingEvents() {
  const eventList = document.getElementById("eventList");
  eventList.innerHTML = "";

  if (currentEvents.length === 0) {
    eventList.innerHTML = "<p>No events yet.</p>";
    return;
  }

  currentEvents.slice(0, 8).forEach(event => {
    eventList.innerHTML += eventCardHTML(event);
  });
}

function renderToday() {
  const todayList = document.getElementById("todayList");
  todayList.innerHTML = "";

  const todayEvents = currentEvents.filter(event => event.date === todayString());

  if (todayEvents.length === 0) {
    todayList.innerHTML = "<p>No events today.</p>";
    return;
  }

  todayEvents.forEach(event => {
    todayList.innerHTML += eventCardHTML(event);
  });
}

function renderStats() {
  document.getElementById("totalEvents").textContent = currentEvents.length;
  document.getElementById("todayEvents").textContent =
    currentEvents.filter(event => event.date === todayString()).length;
}

window.changeMonth = function(direction) {
  currentMonth.setMonth(currentMonth.getMonth() + direction);
  renderCalendar();
};

function renderCalendar() {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("monthTitle");

  calendarGrid.innerHTML = "";

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  monthTitle.textContent = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarGrid.innerHTML += `<div class="calendar-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateValue = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = currentEvents.filter(event => event.date === dateValue);

    calendarGrid.innerHTML += `
      <button class="calendar-cell ${dateValue === todayString() ? "today-cell" : ""}" onclick="renderSelectedDate('${dateValue}')">
        <strong>${day}</strong>
        ${dayEvents.length > 0 ? `<span>${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}</span>` : ""}
      </button>
    `;
  }
}

window.renderSelectedDate = function(dateValue) {
  const selectedDateTitle = document.getElementById("selectedDateTitle");
  const selectedDateEvents = document.getElementById("selectedDateEvents");

  selectedDateTitle.textContent = `Events on ${dateValue}`;
  selectedDateEvents.innerHTML = "";

  const events = currentEvents.filter(event => event.date === dateValue);

  if (events.length === 0) {
    selectedDateEvents.innerHTML = "<p>No events on this date.</p>";
    return;
  }

  events.forEach(event => {
    selectedDateEvents.innerHTML += eventCardHTML(event);
  });
};

function renderWeekSchedule() {
  const weekSchedule = document.getElementById("weekSchedule");
  weekSchedule.innerHTML = "";

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    const dateValue = day.toISOString().split("T")[0];
    const dayEvents = currentEvents.filter(event => event.date === dateValue);

    weekSchedule.innerHTML += `
      <div class="week-day">
        <h3>${day.toLocaleDateString("default", { weekday: "long" })}</h3>
        <p>${dateValue}</p>
        ${
          dayEvents.length === 0
            ? `<div class="mini-card">No events</div>`
            : dayEvents.map(event => eventCardHTML(event)).join("")
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
    results.forEach(doc => {
      if (!foundUser) foundUser = doc.data();
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
      <img src="${foundUser.photo || "logo.svg"}" alt="${foundUser.name}" />
      <div>
        <strong>${foundUser.name}</strong>
        <p>${foundUser.email}</p>
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
    document.getElementById("friendCount").textContent = "0";
    return;
  }

  document.getElementById("friendCount").textContent = snap.data().friends.length;

  for (const friendUid of snap.data().friends) {
    const friendSnap = await getDoc(doc(db, "users", friendUid));

    if (friendSnap.exists()) {
      const friend = friendSnap.data();

      friendsList.innerHTML += `
        <div class="mini-card friend">
          <img src="${friend.photo || "logo.svg"}" alt="${friend.name}" />
          <div>
            <strong>${friend.name}</strong>
            <p>${friend.email}</p>
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

window.logout = async function() {
  document.body.classList.add("page-exit");
  setTimeout(async () => {
    await signOut(auth);
    window.location.href = "index.html";
  }, 250);
};