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

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindSteppers();
});
