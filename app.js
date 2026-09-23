// Huntington Beach, CA 92647 (northwest Huntington Beach / Bolsa Chica area)
const LOCATION = { lat: 33.7178, lon: -118.0025, label: "Huntington Beach, CA 92647" };

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mostly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Depositing rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "🌨️"],
  77: ["Snow grains", "🌨️"],
  80: ["Light showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Snow showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm w/ hail", "⛈️"],
  99: ["Thunderstorm w/ hail", "⛈️"],
};

function describeWeatherCode(code) {
  return WEATHER_CODES[code] || ["Unknown", "❔"];
}

async function loadWeather() {
  const contentEl = document.getElementById("weather-content");
  const forecastEl = document.getElementById("forecast-content");
  const updatedEl = document.getElementById("weather-updated");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", LOCATION.lat);
  url.searchParams.set("longitude", LOCATION.lon);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "America/Los_Angeles");
  url.searchParams.set("forecast_days", "7");

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
    const data = await res.json();

    const cur = data.current;
    const [desc, icon] = describeWeatherCode(cur.weather_code);

    contentEl.innerHTML = `
      <div class="weather-icon">${icon}</div>
      <div>
        <div class="weather-temp">${Math.round(cur.temperature_2m)}°F</div>
        <p class="weather-desc">${desc}</p>
        <div class="weather-details">
          <span>💧 ${cur.relative_humidity_2m}% humidity</span>
          <span>💨 ${Math.round(cur.wind_speed_10m)} mph wind</span>
          <span>🌧️ ${cur.precipitation} in now</span>
        </div>
      </div>
    `;

    const daily = data.daily;
    forecastEl.innerHTML = daily.time.map((dateStr, i) => {
      const [dDesc, dIcon] = describeWeatherCode(daily.weather_code[i]);
      const date = new Date(dateStr + "T00:00:00");
      const dayName = i === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" });
      const hi = Math.round(daily.temperature_2m_max[i]);
      const lo = Math.round(daily.temperature_2m_min[i]);
      const rainChance = daily.precipitation_probability_max[i];
      return `
        <div class="forecast-day" title="${dDesc}">
          <div class="day-name">${dayName}</div>
          <div class="day-icon">${dIcon}</div>
          <div class="day-temps">${hi}°/${lo}°</div>
          <div class="day-rain">☔ ${rainChance}%</div>
        </div>
      `;
    }).join("");

    updatedEl.textContent = `Updated ${new Date().toLocaleTimeString()} · ${LOCATION.label}`;

    window.__rainForecast = daily; // used by tree watering advice
    refreshAll();
  } catch (err) {
    contentEl.innerHTML = `<p class="error">Couldn't load weather: ${err.message}</p>`;
  }
}

// ---------- Tree watering tracker ----------

const STORAGE_KEY = "tree-watering-tracker-v1";

const DEFAULT_TREES = [
  { id: "guava", name: "Guava", emoji: "🌳", intervalDays: 7, color: "var(--tree-guava)" },
  { id: "orange", name: "Orange", emoji: "🍊", intervalDays: 10, color: "var(--tree-orange)" },
  { id: "plum", name: "Plum", emoji: "🌳", intervalDays: 10, color: "var(--tree-plum)" },
  { id: "fig", name: "Fig", emoji: "🌳", intervalDays: 14, color: "var(--tree-fig)" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueSortedHistory(dates) {
  return Array.from(new Set(dates)).sort();
}

function loadTreeState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    saved = {};
  }
  return DEFAULT_TREES.map((tree) => {
    const savedTree = saved[tree.id] || {};
    // Migrate the old single-date shape ({ lastWatered }) into a full history log.
    let history = Array.isArray(savedTree.history) ? savedTree.history : [];
    if (history.length === 0 && savedTree.lastWatered) {
      history = [savedTree.lastWatered];
    }
    history = uniqueSortedHistory(history);
    return {
      ...tree,
      intervalDays: savedTree.intervalDays || tree.intervalDays,
      history,
      lastWatered: history.length ? history[history.length - 1] : null,
    };
  });
}

function saveTreeState(trees) {
  const toSave = {};
  trees.forEach((t) => {
    toSave[t.id] = { history: t.history || [], intervalDays: t.intervalDays };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - then) / 86400000);
}

function formatShortDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function upcomingRainInches() {
  const daily = window.__rainForecast;
  if (!daily) return null;
  return daily.precipitation_sum.slice(0, 2).reduce((a, b) => a + b, 0);
}

function refreshAll() {
  const trees = loadTreeState();
  renderTreeList(trees);
  renderCalendar(trees);
}

function renderTreeList(trees) {
  const listEl = document.getElementById("tree-list");
  const rain = upcomingRainInches();

  listEl.innerHTML = trees.map((tree) => {
    const since = daysSince(tree.lastWatered);
    let statusClass = "status-ok";
    let statusText = "Watered recently";

    if (since === null) {
      statusClass = "status-overdue";
      statusText = "Never logged";
    } else if (since >= tree.intervalDays) {
      statusClass = "status-overdue";
      statusText = `Overdue by ${since - tree.intervalDays} day${since - tree.intervalDays === 1 ? "" : "s"}`;
    } else if (since >= tree.intervalDays - 2) {
      statusClass = "status-soon";
      statusText = `Due in ${tree.intervalDays - since} day${tree.intervalDays - since === 1 ? "" : "s"}`;
    } else {
      statusText = `Watered ${since} day${since === 1 ? "" : "s"} ago`;
    }

    const rainNote = rain && rain >= 0.1
      ? `<div style="font-size:0.78rem;color:var(--muted);margin-top:4px;">🌧️ ~${rain.toFixed(2)}in rain expected in the next 2 days — you may be able to skip watering.</div>`
      : "";

    const recentDates = tree.history.slice(-5).reverse();
    const historyChips = recentDates.length
      ? recentDates.map((d) => `
          <span class="chip">
            ${formatShortDate(d)}
            <button type="button" class="chip-remove" data-action="remove-log" data-tree-id="${tree.id}" data-date="${d}" aria-label="Remove ${formatShortDate(d)} log for ${tree.name}">×</button>
          </span>
        `).join("")
      : `<span class="chip-empty">No entries yet</span>`;

    return `
      <div class="tree-card" data-tree-id="${tree.id}">
        <div class="tree-emoji" style="background:${tree.color}22;">${tree.emoji}</div>
        <div class="tree-main">
          <p class="tree-name">${tree.name}</p>
          <p class="tree-status">${statusText} <span class="status-badge ${statusClass}">${statusClass === "status-overdue" ? "Overdue" : statusClass === "status-soon" ? "Due soon" : "OK"}</span></p>
          ${rainNote}
          <div class="tree-history">
            <p class="history-label">Recent waterings</p>
            <div class="history-chips">${historyChips}</div>
          </div>
        </div>
        <div class="tree-controls">
          <label>Every
            <input type="number" min="1" max="60" value="${tree.intervalDays}" data-action="interval" data-tree-id="${tree.id}">
            days
          </label>
          <button class="water-btn" data-action="water" data-tree-id="${tree.id}">💧 Water today</button>
        </div>
      </div>
    `;
  }).join("");
}

function handleTreeListClick(e) {
  const waterBtn = e.target.closest("button[data-action='water']");
  if (waterBtn) {
    const trees = loadTreeState();
    const tree = trees.find((t) => t.id === waterBtn.dataset.treeId);
    if (!tree) return;
    tree.history = uniqueSortedHistory([...tree.history, todayStr()]);
    saveTreeState(trees);
    refreshAll();
    return;
  }

  const removeBtn = e.target.closest("button[data-action='remove-log']");
  if (removeBtn) {
    const trees = loadTreeState();
    const tree = trees.find((t) => t.id === removeBtn.dataset.treeId);
    if (!tree) return;
    tree.history = tree.history.filter((d) => d !== removeBtn.dataset.date);
    saveTreeState(trees);
    refreshAll();
  }
}

function handleTreeListChange(e) {
  const input = e.target.closest("input[data-action='interval']");
  if (!input) return;
  const treeId = input.dataset.treeId;
  const trees = loadTreeState();
  const tree = trees.find((t) => t.id === treeId);
  if (!tree) return;
  const val = parseInt(input.value, 10);
  tree.intervalDays = Number.isFinite(val) && val > 0 ? val : tree.intervalDays;
  saveTreeState(trees);
  refreshAll();
}

document.getElementById("tree-list").addEventListener("click", handleTreeListClick);
document.getElementById("tree-list").addEventListener("change", handleTreeListChange);

// ---------- Watering calendar ----------

const calendarState = (() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), selected: null };
})();

function renderCalendar(trees) {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("cal-month-label");
  const legend = document.getElementById("calendar-legend");
  const detail = document.getElementById("calendar-detail");
  const { year, month, selected } = calendarState;

  // date -> [{ name, color }]
  const waterByDate = new Map();
  trees.forEach((tree) => {
    tree.history.forEach((d) => {
      if (!waterByDate.has(d)) waterByDate.set(d, []);
      waterByDate.get(d).push({ name: tree.name, color: tree.color });
    });
  });

  label.textContent = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  legend.innerHTML = trees.map((tree) => `
    <span class="legend-item"><span class="legend-dot" style="background:${tree.color}"></span>${tree.name}</span>
  `).join("");

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = todayStr();

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) {
    cells += `<div class="calendar-day empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const waterings = waterByDate.get(iso) || [];
    const dots = waterings.map((w) => `<span class="calendar-dot" style="background:${w.color}"></span>`).join("");
    const classes = ["calendar-day"];
    if (iso === todayIso) classes.push("today");
    if (iso === selected) classes.push("selected");
    cells += `
      <button type="button" class="${classes.join(" ")}" data-date="${iso}">
        <span class="day-number">${day}</span>
        <span class="calendar-dots">${dots}</span>
      </button>
    `;
  }

  grid.innerHTML = cells;

  if (selected) {
    const waterings = waterByDate.get(selected) || [];
    const label = new Date(selected + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    detail.textContent = waterings.length
      ? `${label} — watered: ${waterings.map((w) => w.name).join(", ")}`
      : `${label} — no watering logged`;
  } else {
    detail.textContent = "Tap a day to see what was watered.";
  }
}

function changeCalendarMonth(delta) {
  calendarState.month += delta;
  if (calendarState.month < 0) {
    calendarState.month = 11;
    calendarState.year -= 1;
  } else if (calendarState.month > 11) {
    calendarState.month = 0;
    calendarState.year += 1;
  }
  refreshAll();
}

document.getElementById("cal-prev").addEventListener("click", () => changeCalendarMonth(-1));
document.getElementById("cal-next").addEventListener("click", () => changeCalendarMonth(1));

document.getElementById("calendar-grid").addEventListener("click", (e) => {
  const dayBtn = e.target.closest("button[data-date]");
  if (!dayBtn) return;
  calendarState.selected = calendarState.selected === dayBtn.dataset.date ? null : dayBtn.dataset.date;
  refreshAll();
});

refreshAll();
loadWeather();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
