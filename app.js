const sounds = {
  start: new Audio('sound/Start.mp3'),
  in: new Audio('sound/in.mp3'),
  hold: new Audio('sound/hold.mp3'),
  out: new Audio('sound/out.mp3'),
  finish: new Audio('sound/finish.mp3'),
};

function unlockAudio() {
  Object.values(sounds).forEach((a) => { a.load(); });
}

function playSound(key) {
  const a = sounds[key];
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(() => {});
}

const STORAGE_KEY = 'breath-settings';
const FIELDS = ['inhale', 'holdIn', 'exhale', 'holdOut', 'minutes'];
const MIN = { inhale: 1, holdIn: 0, exhale: 1, holdOut: 0, minutes: 1 };
const MAX = { inhale: 60, holdIn: 60, exhale: 60, holdOut: 60, minutes: 60 };

function readField(field) {
  return Number(document.getElementById(field).textContent);
}
function writeField(field, value) {
  document.getElementById(field).textContent = String(value);
}
function getSettings() {
  const raw = {};
  FIELDS.forEach((f) => { raw[f] = readField(f); });
  return normalizeSettings(raw);
}
function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getSettings()));
}
function loadSettings() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { stored = {}; }
  const s = normalizeSettings(stored);
  FIELDS.forEach((f) => writeField(f, s[f]));
}

function bindSteppers() {
  document.querySelectorAll('.row').forEach((row) => {
    const field = row.dataset.field;
    row.querySelector('.minus').addEventListener('click', () => {
      writeField(field, Math.max(MIN[field], readField(field) - 1));
      saveSettings();
    });
    row.querySelector('.plus').addEventListener('click', () => {
      writeField(field, Math.min(MAX[field], readField(field) + 1));
      saveSettings();
    });
  });
}

let session = null;

// 開始音效播完後的準備緩衝時間
const LEAD_IN_MS = 2000;

function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function showPractice(on) {
  document.getElementById('settings-screen').hidden = on;
  document.getElementById('practice-screen').hidden = !on;
}

function updateTimeLeft() {
  if (!session) return;
  document.getElementById('time-left').textContent = fmtTime(session.endTime - Date.now());
}

// 等某個音檔播完（附逾時保險，避免音檔載入失敗時卡住不動）。
// 回呼綁定當下的 session：若期間按了停止或重新開始，這個監聽器就失效，
// 否則舊的監聽器會在下次播放結束時觸發，多開一條平行的循環鏈。
function afterSound(key, callback) {
  const a = sounds[key];
  const ownSession = session;
  const fallbackMs = 5000;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    a.removeEventListener('ended', finish);
    if (session !== ownSession) return;
    callback();
  };
  a.addEventListener('ended', finish);
  ownSession.timers.push(setTimeout(finish, fallbackMs));
}

function startPractice() {
  unlockAudio();
  const settings = getSettings();
  session = { settings, timers: [], endTime: 0, tick: null };
  showPractice(true);

  document.getElementById('phase-name').textContent = '準備';
  document.getElementById('phase-count').textContent = '';
  const circle = document.getElementById('breath-circle');
  circle.style.transitionDuration = '0s';
  circle.classList.remove('grow', 'shrink');

  playSound('start');
  session.endTime = Date.now() + settings.minutes * 60 * 1000;
  updateTimeLeft();
  session.tick = setInterval(updateTimeLeft, 250);

  // 等開始音效播完，再留 LEAD_IN_MS 的準備時間才進入第一輪
  afterSound('start', () => {
    if (!session) return;
    session.timers.push(setTimeout(runCycle, LEAD_IN_MS));
  });
}

function stopPractice(playFinish) {
  if (!session) return;
  session.timers.forEach(clearTimeout);
  if (session.tick) clearInterval(session.tick);
  session = null;
  if (playFinish) playSound('finish');
  showPractice(false);
}

function runCycle() {
  if (!session) return;
  // 時間到：在每輪開頭判斷，因此一定會做完當前整輪才結束
  if (Date.now() >= session.endTime) {
    stopPractice(true);
    return;
  }
  const phases = buildCycle(session.settings);
  runPhase(phases, 0);
}

function runPhase(phases, index) {
  if (!session) return;
  if (index >= phases.length) {
    runCycle();
    return;
  }
  const phase = phases[index];
  const circle = document.getElementById('breath-circle');
  document.getElementById('phase-name').textContent = phase.name;
  playSound(phase.key);

  // 圓圈動畫：吸氣放大、呼氣縮小；閉氣不更動 class，維持當前大小
  circle.style.transitionDuration = phase.seconds + 's';
  if (phase.key === 'in') {
    circle.classList.remove('shrink');
    circle.classList.add('grow');
  } else if (phase.key === 'out') {
    circle.classList.remove('grow');
    circle.classList.add('shrink');
  }

  let remaining = phase.seconds;
  document.getElementById('phase-count').textContent = String(remaining);
  const countdown = setInterval(() => {
    if (!session) { clearInterval(countdown); return; }
    remaining -= 1;
    document.getElementById('phase-count').textContent = String(Math.max(0, remaining));
  }, 1000);
  session.timers.push(countdown);

  session.timers.push(setTimeout(() => {
    clearInterval(countdown);
    runPhase(phases, index + 1);
  }, phase.seconds * 1000));
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindSteppers();
  document.getElementById('startBtn').addEventListener('click', startPractice);
  document.getElementById('stopBtn').addEventListener('click', () => stopPractice(false));
});

if ('serviceWorker' in navigator) {
  // 若 load 事件已經觸發過就直接註冊，否則等 load（避免與首次載入搶頻寬）
  const registerSW = () => navigator.serviceWorker.register('service-worker.js').catch(() => {});
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
}
