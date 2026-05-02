let events = JSON.parse(localStorage.getItem("events")) || [];
let family = JSON.parse(localStorage.getItem("family")) || [];
let messages = JSON.parse(localStorage.getItem("messages")) || [];

function saveData() {
  localStorage.setItem("events", JSON.stringify(events));
  localStorage.setItem("family", JSON.stringify(family));
  localStorage.setItem("messages", JSON.stringify(messages));
}

function showPage(pageId, button) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active-page");
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active-page");
  button.classList.add("active");
}

function addEvent() {
  const title = document.getElementById("eventTitle").value.trim();
  const date = document.getElementById("eventDate").value;
  const time = document.getElementById("eventTime").value;

  if (!title || !date || !time) {
    alert("Please fill in all event details.");
    return;
  }

  events.push({
    id: Date.now(),
    title: title,
    date: date,
    time: time
  });

  saveData();
  renderEvents();

  document.getElementById("eventTitle").value = "";
  document.getElementById("eventDate").value = "";
  document.getElementById("eventTime").value = "";
}

function deleteEvent(id) {
  events = events.filter(event => event.id !== id);
  saveData();
  renderEvents();
}

function renderEvents() {
  const eventList = document.getElementById("eventList");
  const todayList = document.getElementById("todayList");

  eventList.innerHTML = "";
  todayList.innerHTML = "";

  if (events.length === 0) {
    eventList.innerHTML = "<p>No events yet. Add one from the dashboard.</p>";
    todayList.innerHTML = "<li>No upcoming events</li>";
    return;
  }

  events.forEach(event => {
    eventList.innerHTML += `
      <div class="event-card">
        <div>
          <h3>${event.title}</h3>
          <p>${event.date} at ${event.time}</p>
        </div>
        <button class="delete-btn" onclick="deleteEvent(${event.id})">Delete</button>
      </div>
    `;
  });

  events.slice(0, 5).forEach(event => {
    todayList.innerHTML += `
      <li>${event.title} — ${event.date} at ${event.time}</li>
    `;
  });
}

function addFamily() {
  const name = document.getElementById("familyName").value.trim();

  if (!name) {
    alert("Please enter a name.");
    return;
  }

  family.push(name);
  saveData();
  renderFamily();

  document.getElementById("familyName").value = "";
}

function renderFamily() {
  const familyList = document.getElementById("familyList");
  familyList.innerHTML = "";

  if (family.length === 0) {
    familyList.innerHTML = "<li>No family members added yet</li>";
    return;
  }

  family.forEach(member => {
    familyList.innerHTML += `<li>${member}</li>`;
  });
}

function sendMessage() {
  const input = document.getElementById("chatMessage");
  const text = input.value.trim();

  if (!text) return;

  messages.push({
    text: text,
    time: new Date().toLocaleTimeString()
  });

  saveData();
  renderMessages();

  input.value = "";
}

function renderMessages() {
  const messageBox = document.getElementById("messages");
  messageBox.innerHTML = "";

  if (messages.length === 0) {
    messageBox.innerHTML = "<p>No messages yet.</p>";
    return;
  }

  messages.forEach(message => {
    messageBox.innerHTML += `
      <div class="message">
        ${message.text}
        <br>
        <small>${message.time}</small>
      </div>
    `;
  });

  messageBox.scrollTop = messageBox.scrollHeight;
}

renderEvents();
renderFamily();
renderMessages();