const orders = [
  {
    id: "042",
    table: "08",
    type: "DINE IN",
    guests: "2 COVERS",
    targetMinutes: 10,
    elapsedSeconds: 0,
    note: "ALLERGY — NO PEANUT",
    items: [
      { name: "Crispy chicken sandwich", qty: "× 1" },
      { name: "Truffle fries", qty: "× 1" },
      { name: "Garden salad", qty: "× 1" }
    ]
  },
  {
    id: "043",
    table: "12",
    type: "DINE IN",
    guests: "4 COVERS",
    targetMinutes: 15,
    elapsedSeconds: 0,
    note: "RIBEYE — MEDIUM RARE",
    items: [
      { name: "Ribeye steak", qty: "× 2" },
      { name: "Roasted potatoes", qty: "× 2" },
      { name: "Seasonal greens", qty: "× 1" }
    ]
  },
  {
    id: "044",
    table: "—",
    type: "TAKEAWAY",
    guests: "PICKUP · 8:45",
    targetMinutes: 12,
    elapsedSeconds: 0,
    note: "PACK CUTLERY",
    items: [
      { name: "Margherita pizza", qty: "× 1" },
      { name: "Garlic knots", qty: "× 1" }
    ]
  }
];

const grid = document.querySelector("#orderGrid");
const template = document.querySelector("#ticketTemplate");
const ticketSound = document.querySelector("#ticketSound");
const penSound = document.querySelector("#penSound");
const soundToggle = document.querySelector("#soundToggle");

penSound.volume = 0.08;

let platesOut = 12;
let soundEnabled = true;

function remaining(order) {
  return Math.max(0, order.targetMinutes * 60 - order.elapsedSeconds);
}

function urgency(order) {
  const left = remaining(order);

  if (left === 0) return "late";
  if (left <= order.targetMinutes * 60 * 0.35) return "warning";
  return "calm";
}

function formatTime(order) {
  const secondsLeft = remaining(order);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateStats() {
  const active = orders.length;
  const late = orders.filter(order => urgency(order) === "late").length;

  document.querySelector("#activeCount").textContent =
    String(active).padStart(2, "0");
  document.querySelector("#lateCount").textContent =
    String(late).padStart(2, "0");
  document.querySelector("#doneCount").textContent =
    String(platesOut).padStart(2, "0");
  document.querySelector("#ticketTotal").textContent =
    `${active} ${active === 1 ? "ticket" : "tickets"}`;
}

function updateTimers() {
  orders.forEach(order => {
    const card = grid.querySelector(`[data-order-id="${order.id}"]`);
    if (!card) return;

    const state = urgency(order);
    card.dataset.urgency = state;
    card.querySelector(".timer").textContent = formatTime(order);

    const urgencyLabels = {
      calm: "● GOOD TIME",
      warning: "● PICK IT UP",
      late: "● FIRE"
    };

    card.querySelector(".urgency").textContent = urgencyLabels[state];

    const progress = Math.min(
      1,
      order.elapsedSeconds / (order.targetMinutes * 60)
    );

    const isLight = document.documentElement.dataset.theme === "light";
    const start = isLight ? [17, 17, 17] : [89, 72, 59];
    const end = isLight ? [173, 33, 25] : [181, 46, 36];

    const rgb = start.map((value, index) =>
      Math.round(value + (end[index] - value) * progress)
    );

    card.querySelector(".ticket-note").style.backgroundColor =
      `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  });

  updateStats();
}

function renderTickets() {
  grid.innerHTML = "";

  [...orders]
    .sort((a, b) => remaining(a) - remaining(b))
    .forEach((order, index) => {
      const card = template.content.firstElementChild.cloneNode(true);

      card.dataset.orderId = order.id;
      card.dataset.urgency = urgency(order);
      card.style.animationDelay = `${index * 70}ms`;

      card.querySelector(".ticket-kind").textContent = order.type;
      card.querySelector(".table-number").textContent = order.table;
      card.querySelector(".ticket-number").textContent = `#${order.id}`;
      card.querySelector(".guest-count").textContent = order.guests;
      card.querySelector(".ticket-target").textContent =
        `${order.targetMinutes} MIN TARGET`;
      card.querySelector(".note-text").textContent = order.note;

      const list = card.querySelector(".item-list");

      order.items.forEach(item => {
        const row = document.createElement("li");
        row.className = `item-row${item.checked ? " checked" : ""}`;
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-pressed", String(Boolean(item.checked)));

        const check = document.createElement("span");
        check.className = "item-check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = item.checked ? "✓" : "";

        const itemName = document.createElement("span");
        itemName.textContent = item.name;

        const quantity = document.createElement("span");
        quantity.className = "item-qty";
        quantity.textContent = item.qty;

        row.append(check, itemName, quantity);

        const toggleItem = () => {
          const wasChecked = Boolean(item.checked);
          item.checked = !wasChecked;

          renderTickets();

          // Play a quiet, brief writing cue only when checking an item.
          if (!wasChecked) playSound(penSound, 0.22);
        };

        row.addEventListener("click", toggleItem);
        row.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleItem();
          }
        });

        list.appendChild(row);
      });

      const checkedCount = order.items.filter(item => item.checked).length;
      const itemCount = order.items.length;

      card.querySelector(".progress-count").textContent =
        `${checkedCount} / ${itemCount}`;

      card.querySelector(".progress-fill").style.width =
        `${(checkedCount / itemCount) * 100}%`;

      const sendButton = card.querySelector(".send-button");
      const ready = checkedCount === itemCount;

      sendButton.disabled = !ready;
      sendButton.style.opacity = ready ? "1" : ".55";
      sendButton.addEventListener("click", () => sendOrder(order.id));

      grid.appendChild(card);
    });

  updateTimers();
}

function sendOrder(id) {
  const index = orders.findIndex(order => order.id === id);
  if (index < 0 || !orders[index].items.every(item => item.checked)) return;

  orders.splice(index, 1);
  platesOut++;
  renderTickets();
}

async function playSound(audioElement, stopAfterSeconds = null) {
  if (!soundEnabled) return;

  try {
    audioElement.pause();
    audioElement.currentTime = 0;
    await audioElement.play();

    if (stopAfterSeconds !== null) {
      window.setTimeout(() => {
        audioElement.pause();
        audioElement.currentTime = 0;
      }, stopAfterSeconds * 1000);
    }
  } catch (error) {
    console.info("Click Sound on once to enable ticket audio.");
  }
}

function fireNewTicket() {
  const id = String(45 + Math.floor(Math.random() * 50));

  orders.push({
    id,
    table: String(5 + Math.floor(Math.random() * 20)).padStart(2, "0"),
    type: "DINE IN",
    guests: "2 COVERS",
    targetMinutes: 12,
    elapsedSeconds: 0,
    note: "JUST FIRED",
    items: [
      { name: "Chef's special", qty: "× 1" },
      { name: "Side of the day", qty: "× 1" }
    ]
  });

  renderTickets();
  playSound(ticketSound);
}

function setTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.dataset.theme = theme;
  localStorage.setItem("expo-theme", theme);

  document.querySelector("#themeIcon").textContent = isDark ? "☼" : "☾";
  document.querySelector("#themeLabel").textContent =
    isDark ? "Light room" : "Dark room";

  document.querySelector('meta[name="theme-color"]').content =
    isDark ? "#1d1916" : "#f5eddd";

  updateTimers();
}

document.querySelector("#addOrder").addEventListener("click", fireNewTicket);

document.querySelector("#themeToggle").addEventListener("click", () => {
  const nextTheme =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";

  setTheme(nextTheme);
});

soundToggle.addEventListener("click", async () => {
  soundEnabled = !soundEnabled;

  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  document.querySelector("#soundIcon").textContent = soundEnabled ? "🔔" : "🔕";
  document.querySelector("#soundLabel").textContent =
    soundEnabled ? "Sound on" : "Muted";

  if (soundEnabled) await playSound(ticketSound);
});

document.addEventListener("keydown", event => {
  const focusedControl = event.target.closest(
    "button, input, textarea, select, [role='button'], [contenteditable='true']"
  );
  if (focusedControl) return;

  if (event.key.toLowerCase() === "n") {
    fireNewTicket();
  }

  if (event.code === "Space") {
    event.preventDefault();
    document.querySelector(".item-row:not(.checked)")?.click();
  }
});

function updateClock() {
  document.querySelector("#clock").textContent =
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date());
}

const savedTheme = localStorage.getItem("expo-theme");
if (savedTheme === "dark" || savedTheme === "light") {
  setTheme(savedTheme);
}

updateClock();
renderTickets();

setInterval(updateClock, 30_000);

setInterval(() => {
  orders.forEach(order => order.elapsedSeconds++);
  updateTimers();
}, 1_000);

function setupRushPreview() {
  const slider = document.querySelector("#previewSlider");
  const ticket = document.querySelector("#previewTicket");

  if (!slider || !ticket) return;

  const urgencyLabel = document.querySelector("#previewUrgency");
  const timeLabel = document.querySelector("#previewTime");
  const elapsedLabel = document.querySelector("#previewElapsed");
  const note = document.querySelector("#previewNote");

  function formatSeconds(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updatePreview() {
    const elapsed = Number(slider.value);
    const target = Number(slider.max);
    const left = Math.max(0, target - elapsed);
    const progress = elapsed / target;

    let state = "calm";
    let label = "● GOOD TIME";

    if (left === 0) {
      state = "late";
      label = "● FIRE";
    } else if (left <= target * 0.35) {
      state = "warning";
      label = "● PICK IT UP";
    }

    ticket.dataset.urgency = state;
    urgencyLabel.textContent = label;
    timeLabel.textContent = formatSeconds(left);
    elapsedLabel.textContent = formatSeconds(elapsed);

    // Explicit RGB interpolation makes the note color preview reliable.
    const isLight = document.documentElement.dataset.theme === "light";
    const start = isLight ? [17, 17, 17] : [89, 72, 59];
    const end = isLight ? [173, 33, 25] : [181, 46, 36];

    const color = start.map((value, index) =>
      Math.round(value + (end[index] - value) * progress)
    );

    note.style.backgroundColor =
      `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  slider.addEventListener("input", updatePreview);
  updatePreview();

  // Keep preview note colors correct when switching light/dark theme.
  document.querySelector("#themeToggle")?.addEventListener("click", updatePreview);
}

setupRushPreview();
