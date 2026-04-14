/* ─────────────────────────────────────────────────────────────
   countdown/app.js
   All logic for the countdown timer widget.
───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'countdown_state';

let interval    = null;
let clockInterval = null;
let prevS = -1, prevM = -1, prevH = -1;
let noTime    = false;
let currentTZ = 'America/New_York';
let state     = null;

/* ── Persistence ── */
function saveState(s)  { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch(e) {} }
function loadState()   { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return null; } }
function clearState()  { try { localStorage.removeItem(STORAGE_KEY); } catch(e) {} }

/* ── Helpers ── */
function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }

function nowInTZ(tz) {
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

function getTargetTS(year, month, day, hour, min, tz) {
  const approxUTC = Date.UTC(year, month - 1, day, hour, min, 0);
  const tzDate    = new Date(new Date(approxUTC).toLocaleString('en-US', { timeZone: tz }));
  return approxUTC + (approxUTC - tzDate.getTime());
}

function formatDateLabel(dateStr, timeStr, noT) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const months = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];
  let label = `${months[mo - 1]} ${d}, ${y}`;
  if (!noT && timeStr && timeStr !== '00:00') {
    const [h, mi] = timeStr.split(':').map(Number);
    label += `  ·  ${pad(h % 12 || 12)}:${pad(mi)} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  return label;
}

function lerpColor(r1,g1,b1,r2,g2,b2,t) {
  return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
}

function getDaysColor(days) {
  if (days >= 30) return 'rgb(240,240,240)';
  if (days >= 14) { const t=(30-days)/16; return lerpColor(240,240,240,240,130,50,t); }
  if (days >= 7)  { const t=(14-days)/7;  return lerpColor(240,130,50,255,30,10,t); }
  if (days >= 3)  { const t=(7-days)/4;   return lerpColor(255,30,10,220,0,0,t); }
  const t = (3 - Math.max(0, days)) / 3;
  return lerpColor(220,0,0,160,0,0,t);
}

function pulseDays(color) {
  const el = document.getElementById('block-d');
  el.style.borderColor = color.replace('rgb(','rgba(').replace(')',',0.45)');
  setTimeout(() => { el.style.borderColor = ''; }, 500);
}

function triggerError(el) {
  el.classList.remove('error');
  void el.offsetWidth;
  el.classList.add('error');
  setTimeout(() => el.classList.remove('error'), 400);
}

/* ── Clock display ── */
function updateClockDisplay() {
  try {
    const d   = nowInTZ(currentTZ);
    const h   = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const str = pad(h % 12 || 12) + ':' + pad(m) + ':' + pad(s) + ' ' + (h >= 12 ? 'PM' : 'AM');
    const ft  = document.getElementById('footer-time');
    const ftu = document.getElementById('footer-time-tu');
    if (ft)  ft.textContent  = str;
    if (ftu) ftu.textContent = str;
  } catch(e) {}
}

/* ── Timezone picker ── */
function toggleTZMenu(menuId) {
  document.getElementById(menuId).classList.toggle('open');
}

function setTZ(el) {
  currentTZ = el.dataset.tz;
  document.querySelectorAll('.tz-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.tz === currentTZ);
  });
  document.querySelectorAll('.tz-menu').forEach(m => m.classList.remove('open'));
  if (state) { state.tz = currentTZ; saveState(state); }
  prevS = -1; prevM = -1; prevH = -1;
}

/* ── Toggle no-time ── */
function toggleNoTime() {
  noTime = !noTime;
  document.getElementById('toggle-track').classList.toggle('on', noTime);
  document.getElementById('time-input').disabled = noTime;
}

/* ── Setup → Start ── */
function startTimer() {
  const dateVal = document.getElementById('date-input').value;
  const timeVal = noTime ? '00:00' : (document.getElementById('time-input').value || '00:00');
  const nameVal = (document.getElementById('event-name-input').value.trim()) || 'Countdown';
  if (!dateVal) { triggerError(document.getElementById('date-input')); return; }

  const [y, mo, d] = dateVal.split('-').map(Number);
  const [h, mi]    = timeVal.split(':').map(Number);

  state = {
    name: nameVal,
    dateStr: dateVal,
    timeStr: noTime ? '' : timeVal,
    year: y, month: mo, day: d, hour: h, min: mi,
    noTime: noTime,
    tz: currentTZ,
  };
  saveState(state);
  showTimerPanel();
}

/* ── Panel switchers ── */
function showTimerPanel() {
  document.getElementById('display-name').textContent  = state.name;
  document.getElementById('date-display').textContent  = formatDateLabel(state.dateStr, state.timeStr || '00:00', state.noTime);
  document.getElementById('setup-panel').style.display   = 'none';
  document.getElementById('timer-panel').style.display   = 'block';
  document.getElementById('timesup-panel').style.display = 'none';

  currentTZ = state.tz || 'America/New_York';
  document.querySelectorAll('.tz-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.tz === currentTZ);
  });

  prevS = -1; prevM = -1; prevH = -1;
  if (interval)      clearInterval(interval);
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(updateClockDisplay, 1000);
  updateClockDisplay();
  tickDown();
  interval = setInterval(tickDown, 1000);
}

function showTimesUp() {
  document.getElementById('setup-panel').style.display   = 'none';
  document.getElementById('timer-panel').style.display   = 'none';
  document.getElementById('timesup-panel').style.display = 'block';
  document.getElementById('timesup-event').textContent    = state.name;
  document.getElementById('timesup-headline').textContent = formatDateLabel(state.dateStr, state.timeStr || '00:00', state.noTime) + ' has passed.';

  currentTZ = state.tz || 'America/New_York';
  if (interval)      clearInterval(interval);
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(updateClockDisplay, 1000);
  updateClockDisplay();
  tickElapsed();
  interval = setInterval(tickElapsed, 1000);
}

function editTimer() {
  if (interval)      clearInterval(interval);
  if (clockInterval) clearInterval(clockInterval);
  document.getElementById('event-name-input').value = state.name;
  document.getElementById('date-input').value        = state.dateStr;
  if (!state.timeStr) {
    if (!noTime) toggleNoTime();
  } else {
    if (noTime) toggleNoTime();
    document.getElementById('time-input').value = state.timeStr;
  }
  document.getElementById('timer-panel').style.display = 'none';
  document.getElementById('setup-panel').style.display = 'block';
}

function resetTimer() {
  clearState();
  state = null;
  if (interval)      clearInterval(interval);
  if (clockInterval) clearInterval(clockInterval);
  document.getElementById('timesup-panel').style.display = 'none';
  document.getElementById('timer-panel').style.display   = 'none';
  document.getElementById('setup-panel').style.display   = 'block';
  document.getElementById('event-name-input').value = '';
  document.getElementById('date-input').value        = '';
  document.getElementById('time-input').value        = '00:00';
  if (noTime) toggleNoTime();
}

/* ── Tick functions ── */
function tickDown() {
  const targetTS = getTargetTS(state.year, state.month, state.day, state.hour, state.min, currentTZ);
  const diff     = targetTS - Date.now();

  if (diff <= 0) {
    if (interval) clearInterval(interval);
    saveState(state);
    showTimesUp();
    return;
  }

  const ts   = Math.floor(diff / 1000);
  const s    = ts % 60;
  const m    = Math.floor(ts / 60) % 60;
  const h    = Math.floor(ts / 3600) % 24;
  const days = Math.floor(ts / 86400);

  const dc = getDaysColor(days);
  document.getElementById('days').textContent  = pad(days);
  document.getElementById('days').style.color  = dc;
  pulseDays(dc);

  if (s !== prevS) { document.getElementById('secs').textContent  = pad(s);  prevS = s; }
  if (m !== prevM) { document.getElementById('mins').textContent  = pad(m);  prevM = m; }
  if (h !== prevH) { document.getElementById('hours').textContent = pad(h);  prevH = h; }
}

function tickElapsed() {
  const targetTS = getTargetTS(state.year, state.month, state.day, state.hour, state.min, currentTZ);
  const elapsed  = Math.floor((Date.now() - targetTS) / 1000);
  if (elapsed < 0) return;
  const s    = elapsed % 60;
  const m    = Math.floor(elapsed / 60) % 60;
  const h    = Math.floor(elapsed / 3600) % 24;
  const days = Math.floor(elapsed / 86400);
  document.getElementById('el-days').textContent  = pad(days);
  document.getElementById('el-hours').textContent = pad(h);
  document.getElementById('el-mins').textContent  = pad(m);
  document.getElementById('el-secs').textContent  = pad(s);
}

/* ─────────────────────────────────────────────────────────────
   CROSS-TAB / CROSS-WINDOW SYNC
   When the state is saved in another tab (or the Notion embed),
   this fires and updates the current window automatically.
───────────────────────────────────────────────────────────── */
window.addEventListener('storage', function(e) {
  if (e.key !== STORAGE_KEY) return;
  if (!e.newValue) { resetTimer(); return; }
  try {
    const incoming = JSON.parse(e.newValue);
    state = incoming;
    const targetTS = getTargetTS(state.year, state.month, state.day, state.hour, state.min, state.tz || currentTZ);
    if (Date.now() >= targetTS) { showTimesUp(); } else { showTimerPanel(); }
  } catch(ex) {}
});

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('date-input').min = new Date().toISOString().split('T')[0];

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.footer-tz-wrap')) {
      document.querySelectorAll('.tz-menu').forEach(m => m.classList.remove('open'));
    }
  });

  state = loadState();
  if (!state) {
    document.getElementById('setup-panel').style.display = 'block';
    return;
  }
  currentTZ = state.tz || 'America/New_York';
  const targetTS = getTargetTS(state.year, state.month, state.day, state.hour, state.min, currentTZ);
  if (Date.now() >= targetTS) { showTimesUp(); } else { showTimerPanel(); }
});
