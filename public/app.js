const API = '/api';
let currentTab = 'today';
let addType = 'reminder';
let selectedPriority = 'medium';
let priorityFilterValue = 'all';
let allReminders = [];
let allTodos = [];
let showCompleted = false;

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModal();
  initPrioritySelector();
  initPriorityFilter();
  initCompletedToggle();
  loadAll();
  checkTelegram();
  initPush();
  initTodayHero();
});

// --- Data Loading ---
async function loadAll() {
  await Promise.all([loadReminders(), loadTodos()]);
  renderToday();
  renderPriority();
}

async function loadReminders() {
  const res = await fetch(`${API}/reminders`);
  allReminders = await res.json();
  renderReminders();
}

async function loadTodos() {
  const res = await fetch(`${API}/todos`);
  allTodos = await res.json();
  renderTodos();
}

// --- Tab Navigation ---
function initTabs() {
  const titles = { today: 'Today', reminders: 'Reminders', todo: 'To-Do', priority: 'Priority' };
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById(`tab-${currentTab}`).classList.add('active');
      document.getElementById('headerTitle').textContent = titles[currentTab];
    });
  });
}

// --- Modal ---
function initModal() {
  const modal = document.getElementById('addModal');
  const fab = document.getElementById('fabBtn');

  // Floating hints: hide when input has content
  function setupHint(inputId, hintId) {
    const input = document.getElementById(inputId);
    const hint = document.getElementById(hintId);
    const update = () => hint.classList.toggle('hidden', input.value.length > 0);
    input.addEventListener('input', update);
    input.addEventListener('focus', update);
    input.addEventListener('blur', update);
  }
  setupHint('f-title', 'titleHint');
  setupHint('f-message', 'messageHint');

  fab.addEventListener('click', () => {
    modal.classList.add('open');
    setDefaultDatetime();
    document.getElementById('f-repeat-toggle').checked = false;
    toggleRepeatFields();
    // Reset hints
    document.getElementById('titleHint').classList.remove('hidden');
    document.getElementById('messageHint').classList.remove('hidden');
    setTimeout(() => document.getElementById('f-title').focus(), 100);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);

  // Type toggle (pills)
  document.querySelectorAll('#typeToggle .pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      addType = btn.dataset.type;
      document.querySelectorAll('#typeToggle .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isReminder = addType === 'reminder';
      document.getElementById('reminderFields').style.display = isReminder ? 'block' : 'none';
      document.getElementById('dateRow').style.display = isReminder ? 'flex' : 'none';
      document.getElementById('timeRow').style.display = isReminder ? 'flex' : 'none';
      document.getElementById('repeatRow').style.display = isReminder ? 'flex' : 'none';
      document.getElementById('f-date').required = isReminder;
      document.getElementById('f-time').required = isReminder;
      if (!isReminder) {
        document.getElementById('repeatIntervalRow').style.display = 'none';
      }
    });
  });

  // Form submit
  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('f-title').value.trim();
    if (!title) return;

    if (addType === 'reminder') {
      await fetch(`${API}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message: document.getElementById('f-message').value,
          datetime: getDatetimeValue(),
          repeat: getRepeatValue(),
          priority: selectedPriority,
        }),
      });
    } else {
      await fetch(`${API}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: selectedPriority }),
      });
    }

    closeModal();
    e.target.reset();
    selectedPriority = 'medium';
    updatePrioritySelector();
    loadAll();
  });
}

function closeModal() {
  document.getElementById('addModal').classList.remove('open');
}

// --- Priority Selector (in form) ---
function initPrioritySelector() {
  document.querySelectorAll('#prioritySelector .p-pill').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedPriority = opt.dataset.priority;
      updatePrioritySelector();
    });
  });
}

function updatePrioritySelector() {
  document.querySelectorAll('#prioritySelector .p-pill').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.priority === selectedPriority);
  });
}

// --- Priority Filter (priority tab) ---
function initPriorityFilter() {
  document.querySelectorAll('#priorityFilter button').forEach(btn => {
    btn.addEventListener('click', () => {
      priorityFilterValue = btn.dataset.filter;
      document.querySelectorAll('#priorityFilter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPriority();
    });
  });
}

// --- Completed Toggle ---
function initCompletedToggle() {
  document.getElementById('completedToggle').addEventListener('click', () => {
    showCompleted = !showCompleted;
    document.getElementById('completedList').style.display = showCompleted ? 'block' : 'none';
    document.getElementById('completedArrow').textContent = showCompleted ? '\u25BC' : '\u25B6';
  });
}

// --- Render: Today ---
function renderToday() {
  const el = document.getElementById('todayList');
  const today = new Date().toISOString().slice(0, 10);

  const todayReminders = allReminders.filter(r => !r.notified && r.datetime.startsWith(today));
  const pendingTodos = allTodos.filter(t => !t.completed);

  if (!todayReminders.length && !pendingTodos.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">&#9728;</div><p>Nothing for today. Enjoy!</p></div>';
    return;
  }

  let html = '';
  if (todayReminders.length) {
    html += '<div class="section-title">Reminders</div>';
    html += todayReminders.map(r => renderReminderCard(r)).join('');
  }
  if (pendingTodos.length) {
    html += '<div class="section-title">To-Do</div>';
    html += pendingTodos.map(t => renderTodoRow(t)).join('');
  }
  el.innerHTML = html;
}

// --- Render: Reminders ---
function renderReminders() {
  const el = document.getElementById('reminderList');
  if (!allReminders.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">&#128276;</div><p>No reminders yet</p></div>';
    return;
  }
  el.innerHTML = allReminders.map(r => renderReminderCard(r)).join('');
}

function renderReminderCard(r) {
  const dt = new Date(r.datetime);
  const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const pri = r.priority || 'medium';
  return `
    <div class="card ${r.notified ? 'notified' : ''}" style="${r.notified ? 'opacity:0.5' : ''}">
      <div class="card-priority-bar ${pri}"></div>
      <div class="card-header" style="padding-left:8px">
        <div style="flex:1">
          <div class="card-title">${esc(r.title)}</div>
          ${r.message ? `<div class="card-message">${esc(r.message)}</div>` : ''}
          <div class="card-meta">
            <span>${dateStr} ${timeStr}</span>
            ${r.repeat !== 'none' ? `<span class="badge badge-repeat">${formatRepeat(r.repeat)}</span>` : ''}
            ${r.notified ? '<span class="badge badge-done">done</span>' : ''}
          </div>
        </div>
        <button class="btn-icon danger" onclick="deleteReminder(${r.id})" aria-label="Delete">&#10005;</button>
      </div>
    </div>`;
}

// --- Render: Todos ---
function renderTodos() {
  const pending = allTodos.filter(t => !t.completed);
  const completed = allTodos.filter(t => t.completed);

  const todoEl = document.getElementById('todoList');
  if (!pending.length && !completed.length) {
    todoEl.innerHTML = '<div class="empty-state"><div class="icon">&#9989;</div><p>No tasks yet</p></div>';
    document.getElementById('completedSection').style.display = 'none';
    return;
  }

  todoEl.innerHTML = pending.length
    ? pending.map(t => renderTodoRow(t)).join('')
    : '<div class="empty-state"><p>All done!</p></div>';

  const compSection = document.getElementById('completedSection');
  if (completed.length) {
    compSection.style.display = 'block';
    document.getElementById('completedCount').textContent = completed.length;
    document.getElementById('completedList').innerHTML = completed.map(t => renderTodoRow(t)).join('');
  } else {
    compSection.style.display = 'none';
  }
}

function renderTodoRow(t) {
  const pri = t.priority || 'medium';
  return `
    <div class="checkbox-row ${t.completed ? 'completed' : ''}" onclick="toggleTodo(${t.id}, ${t.completed ? 0 : 1})">
      <div class="checkbox ${t.completed ? 'checked' : ''}"></div>
      <span class="checkbox-label">${esc(t.title)}</span>
      <div class="priority-dot ${pri}"></div>
      <button class="btn-icon danger" onclick="event.stopPropagation();deleteTodo(${t.id})" aria-label="Delete">&#10005;</button>
    </div>`;
}

// --- Render: Priority ---
function renderPriority() {
  const el = document.getElementById('priorityList');
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  // Combine reminders + todos
  const items = [
    ...allReminders.filter(r => !r.notified).map(r => ({ ...r, type: 'reminder' })),
    ...allTodos.filter(t => !t.completed).map(t => ({ ...t, type: 'todo' })),
  ];

  const filtered = priorityFilterValue === 'all'
    ? items
    : items.filter(i => (i.priority || 'medium') === priorityFilterValue);

  filtered.sort((a, b) => priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']);

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="icon">&#128200;</div><p>No items</p></div>';
    return;
  }

  el.innerHTML = filtered.map(item => {
    if (item.type === 'reminder') return renderReminderCard(item);
    return renderTodoRow(item);
  }).join('');
}

// --- Actions ---
async function deleteReminder(id) {
  await fetch(`${API}/reminders/${id}`, { method: 'DELETE' });
  loadAll();
}

async function deleteTodo(id) {
  await fetch(`${API}/todos/${id}`, { method: 'DELETE' });
  loadAll();
}

async function toggleTodo(id, completed) {
  await fetch(`${API}/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: !!completed }),
  });
  loadAll();
}

// --- Push Notifications ---
async function initPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const reg = await navigator.serviceWorker.register('/sw.js');
  const sub = await reg.pushManager.getSubscription();
  if (!sub) document.getElementById('notifBanner').classList.add('show');
}

async function requestPushPermission() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  const res = await fetch(`${API}/push/vapid-key`);
  const { key } = await res.json();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  await fetch(`${API}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  document.getElementById('notifBanner').classList.remove('show');
}

// --- Telegram Status ---
async function checkTelegram() {
  try {
    const res = await fetch(`${API}/telegram/status`);
    const { configured } = await res.json();
    if (configured) document.getElementById('telegramDot').classList.add('connected');
  } catch {}
}

// --- Helpers ---
function setDefaultDatetime() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  document.getElementById('f-date').value = local.toISOString().slice(0, 10);
  now.setMinutes(now.getMinutes() + 5);
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  document.getElementById('f-time').value = localTime.toISOString().slice(11, 16);
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// --- Repeat Toggle ---
function toggleRepeatFields() {
  const on = document.getElementById('f-repeat-toggle').checked;
  document.getElementById('repeatIntervalRow').style.display = on ? 'flex' : 'none';
  document.getElementById('dateLabel').textContent = on ? 'Start Date' : 'Date';
}

function getRepeatValue() {
  if (!document.getElementById('f-repeat-toggle').checked) return 'none';
  const num = document.getElementById('f-repeat-value').value;
  const unit = document.getElementById('f-repeat-unit').value;
  if (num === '1') {
    const map = { minutes: 'every_minute', hours: 'hourly', days: 'daily', weeks: 'weekly', months: 'monthly' };
    return map[unit];
  }
  return `custom:${num}:${unit}`;
}

function getDatetimeValue() {
  const date = document.getElementById('f-date').value;
  if (!date) return '';
  const time = document.getElementById('f-time').value || '09:00';
  return `${date}T${time}`;
}

function formatRepeat(repeat) {
  if (!repeat || repeat === 'none') return '';
  if (repeat.startsWith('custom:')) {
    const [, num, unit] = repeat.split(':');
    return `Every ${num} ${unit}`;
  }
  const labels = { every_minute: 'Every minute', hourly: 'Hourly', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
  return labels[repeat] || repeat;
}

// --- Today Hero ---
function initTodayHero() {
  updateClock();
  setInterval(updateClock, 60000);
  fetchLocationAndWeather();
}

function updateClock() {
  const now = new Date();
  document.getElementById('heroDay').textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
  document.getElementById('heroFullDate').textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById('heroTime').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fetchLocationAndWeather() {
  if (!navigator.geolocation) { fetchLocationByIP(); return; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    // Reverse geocode (free, no key needed)
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`);
      const geoData = await geoRes.json();
      const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.state || '';
      const country = geoData.address.country_code?.toUpperCase() || '';
      document.getElementById('heroLocationText').textContent = city ? `${city}, ${country}` : `${latitude.toFixed(1)}, ${longitude.toFixed(1)}`;
    } catch {
      document.getElementById('heroLocationText').textContent = `${latitude.toFixed(1)}, ${longitude.toFixed(1)}`;
    }

    // Weather (Open-Meteo, free, no key needed)
    try {
      const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
      const wData = await wRes.json();
      const w = wData.current_weather;
      const icon = weatherIcon(w.weathercode);
      document.getElementById('heroWeatherIcon').textContent = icon;
      document.getElementById('heroWeatherText').textContent = `${Math.round(w.temperature)}°C`;
    } catch {}
  }, () => {
    // Permission denied — try IP-based fallback
    fetchLocationByIP();
  }, { timeout: 8000 });
}

async function fetchLocationByIP() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    const city = data.city || data.region || '';
    const country = data.country_code || '';
    if (city) {
      document.getElementById('heroLocationText').textContent = `${city}, ${country}`;
    }
    if (data.latitude && data.longitude) {
      try {
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${data.latitude}&longitude=${data.longitude}&current_weather=true`);
        const wData = await wRes.json();
        const w = wData.current_weather;
        document.getElementById('heroWeatherIcon').textContent = weatherIcon(w.weathercode);
        document.getElementById('heroWeatherText').textContent = `${Math.round(w.temperature)}°C`;
      } catch {}
    }
  } catch {}
}

function weatherIcon(code) {
  if (code === 0) return '\u2600\uFE0F';         // clear
  if (code <= 3) return '\u26C5';                  // partly cloudy
  if (code <= 49) return '\u2601\uFE0F';           // cloudy/fog
  if (code <= 69) return '\uD83C\uDF27\uFE0F';    // rain
  if (code <= 79) return '\u2744\uFE0F';           // snow
  if (code <= 99) return '\u26C8\uFE0F';           // thunderstorm
  return '\uD83C\uDF24\uFE0F';
}

// Auto-refresh every 30s
setInterval(loadAll, 30000);
