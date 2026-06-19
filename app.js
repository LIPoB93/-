// ───────────────────────────────────────────────
// 구글 스프레드시트 연동 설정
// Apps Script 웹앱 배포 후 받은 URL을 아래 따옴표 안에 붙여넣으세요.
// 비워두면 기록 전송은 건너뛰고 앱은 정상 동작합니다.
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyvUVC8QhU_iEcdMaM_o8KiapxWONkzGBQDho6ac8HV5qn-y2UBeEiMTz-kq3bou6iOsQ/exec';
// ───────────────────────────────────────────────

const screens = [...document.querySelectorAll('.screen')];
const state = { name: '', docent: '', startTime: '', endTime: '' };

// 한국 시간 문자열(YYYY-MM-DD HH:mm:ss)
function nowString() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 시트로 기록 전송 (실패해도 앱 흐름은 막지 않음)
function sendRecord() {
  if (!SHEET_ENDPOINT) return;
  // no-cors 환경에서도 데이터가 확실히 전달되도록 URL 쿼리 파라미터로 전송
  const params = new URLSearchParams({
    name: state.name,
    docent: state.docent,
    startTime: state.startTime,
    endTime: state.endTime
  });
  const url = SHEET_ENDPOINT + '?' + params.toString();
  fetch(url, { method: 'POST', mode: 'no-cors' }).catch(() => {});
}


const SCREEN_ORDER = ['waiting', 'intro', 'roster', 'route', 'video', 'message', 'complete'];

function currentScreen() {
  const el = document.querySelector('.screen.active');
  return el ? el.dataset.screen : 'waiting';
}

// 명단 화면에서 다음으로 갈 수 있는지(입력 완료 여부)
function rosterReady() {
  const name = document.getElementById('visitor-name').value.trim();
  const docent = document.getElementById('docent-select').value;
  return !!(name && docent);
}

function updateNav() {
  const cur = currentScreen();
  const idx = SCREEN_ORDER.indexOf(cur);
  const prevBtn = document.querySelector('[data-action="nav-prev"]');
  const nextBtn = document.querySelector('[data-action="nav-next"]');

  // 갈 곳 없는 쪽은 숨김
  const hasPrev = idx > 0;
  const hasNext = idx < SCREEN_ORDER.length - 1;
  prevBtn.style.display = hasPrev ? '' : 'none';
  nextBtn.style.display = hasNext ? '' : 'none';

  // 명단 화면은 입력 완료 전까지 다음 비활성화
  nextBtn.disabled = (cur === 'roster' && !rosterReady());
}

function showScreen(name) {
  screens.forEach(screen => screen.classList.toggle('active', screen.dataset.screen === name));
  const active = document.querySelector(`[data-screen="${name}"]`);
  if (active) active.scrollTop = 0;
  updateNav();
}

// 좌우 화살표로 화면 이동
function navTo(direction) {
  const cur = currentScreen();
  const idx = SCREEN_ORDER.indexOf(cur);
  const target = idx + direction;
  if (target < 0 || target >= SCREEN_ORDER.length) return;
  const next = SCREEN_ORDER[target];

  // 명단 → 다음: 입력 검증 + 시작 시간 기록
  if (direction === 1 && cur === 'roster') {
    if (!rosterReady()) return;
    state.name = document.getElementById('visitor-name').value.trim();
    state.docent = document.getElementById('docent-select').value;
    if (!state.startTime) state.startTime = nowString();
  }
  // 완료 화면 도달: 요약 채움 + 완료 시간 기록 + 시트 전송
  if (next === 'complete') {
    document.getElementById('summary-name').textContent = state.name;
    document.getElementById('summary-docent').textContent = state.docent;
    state.endTime = nowString();
    sendRecord();
  }
  showScreen(next);
}

function resetTour() {
  state.name = '';
  state.docent = '';
  state.startTime = '';
  state.endTime = '';
  document.getElementById('visitor-form').reset();
  document.getElementById('form-error').textContent = '';
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'nav-prev') { navTo(-1); return; }
  if (action === 'nav-next') { navTo(1); return; }
  if (action === 'start') showScreen('intro');
  if (action === 'back-waiting') showScreen('waiting');
  if (action === 'new-tour') { resetTour(); showScreen('roster'); }
  if (action === 'to-waiting') { resetTour(); showScreen('waiting'); }
});

// 전역 좌우 스와이프 = 화면 이동(navTo). 모든 화면에서 동작.
const shell = document.querySelector('.app-shell');
let touchStartX = null;
let touchStartY = null;

shell.addEventListener('touchstart', (event) => {
  const t = event.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

shell.addEventListener('touchend', (event) => {
  if (touchStartX === null) return;
  const t = event.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;
  // 가로 이동이 충분히 크고 세로보다 우세할 때만 화면 이동
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    // 오른쪽으로 밀면 이전(왼쪽 화면), 왼쪽으로 밀면 다음(오른쪽 화면)
    navTo(dx > 0 ? -1 : 1);
  }
});

// PC 마우스 드래그도 지원 (입력 요소 위에서 시작한 드래그는 제외)
let mouseStartX = null;
let mouseStartY = null;
shell.addEventListener('mousedown', (event) => {
  if (event.target.closest('input, select, textarea')) { mouseStartX = null; return; }
  mouseStartX = event.clientX;
  mouseStartY = event.clientY;
});
shell.addEventListener('mouseup', (event) => {
  if (mouseStartX === null) return;
  const dx = event.clientX - mouseStartX;
  const dy = event.clientY - mouseStartY;
  mouseStartX = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    navTo(dx > 0 ? -1 : 1);
  }
});

document.getElementById('visitor-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('visitor-name').value.trim();
  const docent = document.getElementById('docent-select').value;
  const error = document.getElementById('form-error');
  if (!name || !docent) {
    error.textContent = '이름과 담당 도슨트를 모두 입력해주세요.';
    return;
  }
  error.textContent = '';
  state.name = name;
  state.docent = docent;
  if (!state.startTime) state.startTime = nowString();
  showScreen('route');
});

// 명단 입력이 바뀔 때마다 다음 버튼 활성/비활성 갱신
document.getElementById('visitor-name').addEventListener('input', updateNav);
document.getElementById('docent-select').addEventListener('change', updateNav);

updateNav();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
