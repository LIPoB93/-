const screens = [...document.querySelectorAll('.screen')];
const state = { name: '', docent: '', qIndex: 0 };

const qCards = [
  {
    title: '숲과 시선의 첫 만남',
    description: '푸른 밤하늘과 꽃, 인물의 눈이 한 화면에서 만나며 관람객의 시선을 작품 안으로 끌어들입니다.',
    script: '작품 전체를 먼저 천천히 바라봐 주세요. 가장 먼저 눈에 들어오는 곳이 어디인지 생각해보겠습니다.',
    question: '이 작품에서 가장 먼저 시선이 머무는 곳은 어디인가요?',
    point: '전체 구성, 첫인상, 눈과 배경의 대비'
  },
  {
    title: '푸른색의 흐름',
    description: '여러 층의 파랑과 청록색이 소용돌이치며 밤하늘과 자연의 움직임을 동시에 표현합니다.',
    script: '파란색이 한 가지 색처럼 보이는지, 서로 다른 깊이로 느껴지는지 살펴보세요.',
    question: '가장 차갑게 느껴지는 파랑과 가장 따뜻하게 느껴지는 파랑은 어디인가요?',
    point: '색의 온도, 붓질 방향, 명암 변화'
  },
  {
    title: '별빛 아래, 숲의 눈',
    description: '큰 눈은 관람객을 바라보는 동시에 자연이 인간을 응시하는 듯한 인상을 만듭니다.',
    script: '이번에는 작품 속 눈과 잠시 시선을 맞춰보겠습니다. 표정이 어떻게 느껴지는지 살펴보세요.',
    question: '이 눈은 어떤 감정이나 이야기를 전하고 있다고 느끼나요?',
    point: '시선, 표정, 반사광, 감정의 해석'
  },
  {
    title: '꽃으로 이어진 얼굴',
    description: '얼굴과 꽃의 경계가 사라지면서 인간과 자연이 하나의 존재처럼 연결됩니다.',
    script: '꽃이 단순한 장식인지, 얼굴의 일부인지 구분해보며 작품을 보겠습니다.',
    question: '꽃이 얼굴을 가리는 것처럼 보이나요, 얼굴을 완성하는 것처럼 보이나요?',
    point: '인물과 자연의 결합, 경계, 상징성'
  },
  {
    title: '생명과 성장의 리듬',
    description: '서로 다른 크기와 색의 식물들이 아래에서 위로 자라며 화면에 생명력을 더합니다.',
    script: '작품 아래쪽의 꽃과 줄기에서 위쪽 하늘까지 시선을 천천히 이동해보세요.',
    question: '화면에서 가장 활발하게 움직이는 것처럼 느껴지는 부분은 어디인가요?',
    point: '반복, 리듬, 성장 방향, 화면의 밀도'
  },
  {
    title: '숲이 건네는 마지막 질문',
    description: '작품은 인간이 자연을 바라보는 장면과 자연이 인간을 바라보는 장면을 동시에 보여줍니다.',
    script: '처음 봤을 때와 지금의 느낌이 달라졌는지 떠올려보며 관람을 마무리하겠습니다.',
    question: '이 작품을 한 문장으로 소개한다면 어떤 문장을 고르시겠어요?',
    point: '전체 메시지, 개인적 해석, 관람 후 인상'
  }
];

// 총 20개 슬롯 유지. 7번 이후는 빈 칸(추후 구글 시트 데이터로 교체 예정).
const TOTAL_CARDS = 20;
while (qCards.length < TOTAL_CARDS) {
  qCards.push({
    title: `작품 ${qCards.length + 1}`,
    description: '',
    script: '',
    question: '',
    point: ''
  });
}

const SCREEN_ORDER = ['waiting', 'intro', 'roster', 'route', 'qcard', 'complete'];

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

  // 명단 → 다음: 입력 검증
  if (direction === 1 && cur === 'roster') {
    if (!rosterReady()) return;
    state.name = document.getElementById('visitor-name').value.trim();
    state.docent = document.getElementById('docent-select').value;
  }
  // Q카드 → 완료로 넘어갈 때 요약 채움
  if (direction === 1 && cur === 'qcard') {
    document.getElementById('summary-name').textContent = state.name;
    document.getElementById('summary-docent').textContent = state.docent;
  }
  // 동선/대기로 진입 시 Q카드 인덱스 초기화
  if (next === 'qcard') { state.qIndex = 0; renderQCard(); }
  showScreen(next);
}

function renderQCard() {
  const card = qCards[state.qIndex];
  document.getElementById('q-counter').textContent = `Q카드 ${state.qIndex + 1} / ${qCards.length}`;
  document.getElementById('progress-bar').style.width = `${((state.qIndex + 1) / qCards.length) * 100}%`;
  document.getElementById('q-title').textContent = card.title;
  document.getElementById('q-description').textContent = card.description;
  document.getElementById('q-script').textContent = card.script;
  document.getElementById('q-question').textContent = card.question;
  document.getElementById('q-point').textContent = card.point;

  const dots = document.getElementById('q-dots');
  dots.innerHTML = qCards.map((_, i) => `<i class="${i === state.qIndex ? 'active' : ''}"></i>`).join('');
  document.querySelector('[data-action="q-prev"]').disabled = state.qIndex === 0;
  document.querySelector('[data-action="q-next"]').textContent = state.qIndex === qCards.length - 1 ? '안내 완료 ›' : '다음 카드 ›';
}

function resetTour() {
  state.name = '';
  state.docent = '';
  state.qIndex = 0;
  document.getElementById('visitor-form').reset();
  document.getElementById('form-error').textContent = '';
  renderQCard();
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'nav-prev') { navTo(-1); return; }
  if (action === 'nav-next') { navTo(1); return; }
  if (action === 'start') showScreen('intro');
  if (action === 'back-waiting') showScreen('waiting');
  if (action === 'route-next') { state.qIndex = 0; renderQCard(); showScreen('qcard'); }
  if (action === 'q-prev' && state.qIndex > 0) { state.qIndex--; renderQCard(); }
  if (action === 'q-next') {
    if (state.qIndex < qCards.length - 1) { state.qIndex++; renderQCard(); }
    else {
      document.getElementById('summary-name').textContent = state.name;
      document.getElementById('summary-docent').textContent = state.docent;
      showScreen('complete');
    }
  }
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
  showScreen('route');
});

// 명단 입력이 바뀔 때마다 다음 버튼 활성/비활성 갱신
document.getElementById('visitor-name').addEventListener('input', updateNav);
document.getElementById('docent-select').addEventListener('change', updateNav);

renderQCard();
updateNav();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
