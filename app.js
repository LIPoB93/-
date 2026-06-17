// 기록은 기기에 먼저 저장하고, 같은 Vercel 도메인의 /api/save를 통해 시트로 전송합니다.

const screens = [...document.querySelectorAll('.screen')];
const state = {
  name: '',
  docent: '',
  startTime: '',
  endTime: '',
  recordId: '',
  startedAtMs: 0
};

function nowString() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 기존 기기의 미전송 기록을 그대로 살리기 위해 저장 키는 유지합니다.
const STORAGE_KEYS = {
  records: 'forest-qcard-records-v1',
  active: 'forest-qcard-active-v1'
};
const MAX_STORED_RECORDS = 100;
let syncAllPromise = null;

function makeRecordId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `record_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn('기기 저장 데이터 읽기 실패:', error);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('기기 저장 실패:', error);
    return false;
  }
}

function getStoredRecords() {
  const records = readJson(STORAGE_KEYS.records, []);
  return Array.isArray(records) ? records : [];
}

function saveStoredRecords(records) {
  const sorted = [...records].sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  return writeJson(STORAGE_KEYS.records, sorted.slice(-MAX_STORED_RECORDS));
}

function saveActiveTour() {
  if (!state.name || !state.docent || !state.startTime) return;
  writeJson(STORAGE_KEYS.active, {
    recordId: state.recordId,
    name: state.name,
    docent: state.docent,
    startTime: state.startTime,
    startedAtMs: state.startedAtMs || Date.now()
  });
}

function clearActiveTour() {
  try {
    localStorage.removeItem(STORAGE_KEYS.active);
  } catch (error) {
    console.warn('진행 중 기록 삭제 실패:', error);
  }
}

function restoreActiveTour() {
  const active = readJson(STORAGE_KEYS.active, null);
  if (!active || !active.name || !active.docent || !active.startTime) return;

  const age = Date.now() - Number(active.startedAtMs || 0);
  if (!Number.isFinite(age) || age > 12 * 60 * 60 * 1000) {
    clearActiveTour();
    return;
  }

  state.recordId = active.recordId || makeRecordId();
  state.name = active.name;
  state.docent = active.docent;
  state.startTime = active.startTime;
  state.startedAtMs = Number(active.startedAtMs || Date.now());

  document.getElementById('visitor-name').value = state.name;
  document.getElementById('docent-select').value = state.docent;
}

function queueCurrentRecord() {
  const record = {
    recordId: state.recordId || makeRecordId(),
    name: state.name,
    docent: state.docent,
    startTime: state.startTime,
    endTime: state.endTime,
    createdAtMs: state.startedAtMs || Date.now(),
    completedAtMs: Date.now(),
    synced: false,
    syncedAtMs: null
  };

  const records = getStoredRecords();
  const index = records.findIndex((item) => item.recordId === record.recordId);
  if (index >= 0) records[index] = { ...records[index], ...record };
  else records.push(record);

  if (!saveStoredRecords(records)) {
    throw new Error('기기에 기록을 저장하지 못했습니다.');
  }

  clearActiveTour();
  return record;
}

function markRecordSynced(recordId) {
  const records = getStoredRecords();
  const index = records.findIndex((item) => item.recordId === recordId);
  if (index < 0) return;
  records[index] = {
    ...records[index],
    synced: true,
    syncedAtMs: Date.now()
  };
  saveStoredRecords(records);
}

async function sendRecord(record) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        recordId: record.recordId,
        name: record.name,
        docent: record.docent,
        startTime: record.startTime,
        endTime: record.endTime
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result || !result.ok) {
      throw new Error((result && result.error) || `저장 요청 실패 (${response.status})`);
    }
    return result;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('저장 응답 시간이 초과되었습니다.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function syncRecord(record) {
  return sendRecord(record).then((result) => {
    markRecordSynced(record.recordId);
    return result;
  });
}

function syncPendingRecords() {
  if (syncAllPromise) return syncAllPromise;

  syncAllPromise = (async () => {
    const pending = getStoredRecords().filter((record) => !record.synced);
    let synced = 0;
    let failed = 0;

    for (const record of pending) {
      try {
        await syncRecord(record);
        synced += 1;
      } catch (error) {
        failed += 1;
        console.warn('미전송 기록 재전송 실패:', record.recordId, error);
      }
    }

    return { synced, failed };
  })().finally(() => {
    syncAllPromise = null;
  });

  return syncAllPromise;
}

const SCREEN_ORDER = ['waiting', 'intro', 'roster', 'route', 'complete'];

function currentScreen() {
  const element = document.querySelector('.screen.active');
  return element ? element.dataset.screen : 'waiting';
}

function rosterReady() {
  const name = document.getElementById('visitor-name').value.trim();
  const docent = document.getElementById('docent-select').value;
  return Boolean(name && docent);
}

function updateNav() {
  const current = currentScreen();
  const index = SCREEN_ORDER.indexOf(current);
  const prevButton = document.querySelector('[data-action="nav-prev"]');
  const nextButton = document.querySelector('[data-action="nav-next"]');

  // 완료 후에는 이전 화면으로 돌아가 중복 완료하는 것을 막습니다.
  prevButton.style.display = index > 0 && current !== 'complete' ? '' : 'none';
  nextButton.style.display = index < SCREEN_ORDER.length - 1 ? '' : 'none';
  nextButton.disabled = current === 'roster' && !rosterReady();
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle('active', screen.dataset.screen === name);
  });
  const active = document.querySelector(`[data-screen="${name}"]`);
  if (active) active.scrollTop = 0;
  updateNav();
}

function startTourFromForm() {
  const name = document.getElementById('visitor-name').value.trim();
  const docent = document.getElementById('docent-select').value;
  const error = document.getElementById('form-error');

  if (!name || !docent) {
    error.textContent = '이름과 담당 도슨트를 모두 입력해주세요.';
    return false;
  }

  error.textContent = '';
  state.name = name;
  state.docent = docent;

  if (!state.startTime) {
    state.startTime = nowString();
    state.startedAtMs = Date.now();
    state.recordId = makeRecordId();
  }

  saveActiveTour();
  return true;
}

function completeTour() {
  if (!state.name || !state.docent || !state.startTime) {
    showScreen('roster');
    return;
  }

  state.endTime = nowString();
  document.getElementById('summary-name').textContent = state.name;
  document.getElementById('summary-docent').textContent = state.docent;

  const message = document.querySelector('.complete-message');

  try {
    const record = queueCurrentRecord();
    message.textContent = '기기에 기록했습니다. 시트로 전송 중입니다.';

    syncRecord(record)
      .then(() => {
        message.textContent = '기록이 시트에 저장되었습니다.';
      })
      .catch((error) => {
        console.warn(error);
        message.textContent = '기기에 저장되었습니다. 인터넷 연결 시 자동 전송됩니다.';
      });
  } catch (error) {
    console.error(error);
    message.textContent = '기기 저장에 실패했습니다. 관리자에게 알려주세요.';
  }
}

function navTo(direction) {
  const current = currentScreen();
  const index = SCREEN_ORDER.indexOf(current);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= SCREEN_ORDER.length) return;

  const next = SCREEN_ORDER[targetIndex];

  if (direction === 1 && current === 'roster' && !startTourFromForm()) return;
  if (direction === 1 && current === 'route' && next === 'complete') completeTour();

  showScreen(next);
}

function resetTour() {
  state.name = '';
  state.docent = '';
  state.startTime = '';
  state.endTime = '';
  state.recordId = '';
  state.startedAtMs = 0;
  clearActiveTour();
  document.getElementById('visitor-form').reset();
  document.getElementById('form-error').textContent = '';
  document.querySelector('.complete-message').textContent = '수고하셨습니다.';
}

document.documentElement.dataset.appReady = 'true';

const waitingScreen = document.querySelector('[data-screen="waiting"]');
const startButton = document.querySelector('[data-action="start"]');
if (startButton) {
  startButton.addEventListener('click', (event) => {
    event.stopPropagation();
    showScreen('intro');
  });
}
if (waitingScreen) waitingScreen.addEventListener('click', () => showScreen('intro'));

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  if (action === 'nav-prev') navTo(-1);
  if (action === 'nav-next') navTo(1);
  if (action === 'new-tour') {
    resetTour();
    showScreen('roster');
  }
  if (action === 'to-waiting') {
    resetTour();
    showScreen('waiting');
  }
});

const shell = document.querySelector('.app-shell');
let touchStartX = null;
let touchStartY = null;

shell.addEventListener('touchstart', (event) => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

shell.addEventListener('touchend', (event) => {
  if (touchStartX === null) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;

  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    navTo(dx > 0 ? -1 : 1);
  }
});

let mouseStartX = null;
let mouseStartY = null;
shell.addEventListener('mousedown', (event) => {
  if (event.target.closest('input, select, textarea')) {
    mouseStartX = null;
    return;
  }
  mouseStartX = event.clientX;
  mouseStartY = event.clientY;
});

shell.addEventListener('mouseup', (event) => {
  if (mouseStartX === null) return;
  const dx = event.clientX - mouseStartX;
  const dy = event.clientY - mouseStartY;
  mouseStartX = null;
  mouseStartY = null;

  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    navTo(dx > 0 ? -1 : 1);
  }
});

document.getElementById('visitor-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (startTourFromForm()) showScreen('route');
});

document.getElementById('visitor-name').addEventListener('input', updateNav);
document.getElementById('docent-select').addEventListener('change', updateNav);

restoreActiveTour();
updateNav();

setTimeout(() => { syncPendingRecords(); }, 0);
window.addEventListener('online', () => { syncPendingRecords(); });
