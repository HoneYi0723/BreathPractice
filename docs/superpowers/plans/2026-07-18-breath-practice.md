# 呼吸練習 App 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一個純網頁的呼吸練習 App，用音檔與圓圈動畫引導使用者完成可自訂節奏的呼吸循環，可部署為可分享網址並以 PWA 加到手機主畫面離線使用。

**Architecture:** 單頁應用（SPA），兩個畫面（設定畫面、練習畫面）以 JS 切換顯示。核心是一個以資料驅動的「階段序列引擎」：把一輪循環展開成階段陣列（吸/閉/呼/閉，0 秒者略過），用 `setTimeout` 逐階段推進，每階段開始時播對應音檔、更新文字與圓圈動畫，總時間到則做完當前整輪後播結束音回設定畫面。設定存 localStorage。附 manifest + service worker 做 PWA 與離線快取。

**Tech Stack:** 原生 HTML + CSS + JavaScript（無框架、無建置工具）、Web Audio 用 `HTMLAudioElement`、`localStorage`、Service Worker Cache API。本機測試用 `npx serve`。

## Global Constraints

- 純前端，**不引入任何框架或建置工具**，所有檔案可直接靜態部署。
- 目標平台以 **Android Chrome** 為主，需跨平台可用（iOS Safari / 桌機瀏覽器）。
- **不加音量控制**（系統音量由使用者實體按鍵控制）。
- 音檔位於 `sound/`，檔名固定：`Start.mp3`、`in.mp3`、`hold.mp3`、`out.mp3`、`finish.mp3`。
- 第一段音效必須由使用者按「開始」手勢觸發；按下開始時預先解鎖所有音檔。
- 設定預設值：吸氣 2、閉氣（吸後）2、呼氣 2、閉氣（呼後）2、練習時間 5 分鐘。
- 秒數下限：吸氣/呼氣最少 1 秒；兩個閉氣可為 0。
- 介面文字使用繁體中文。
- 秒數為 0 的閉氣階段自動跳過（不播音、不倒數）。
- 練習時間到不立即中斷，做完當前整輪循環後才播 `finish.mp3` 並回設定畫面。

---

## File Structure

- `index.html` — 頁面骨架：設定畫面與練習畫面兩個 section，載入 style.css 與 app.js，掛 manifest。
- `style.css` — 版面與樣式：直向列、−/+ 控制、大按鈕、練習畫面全螢幕與圓圈動畫。
- `src/engine.js` — 純邏輯，無 DOM：把設定展開成階段序列、計算階段/剩餘時間。可獨立單元測試。
- `app.js` — DOM 綁定與流程控制：讀寫設定、切畫面、驅動引擎、播音檔、更新畫面與圓圈、註冊 service worker。
- `manifest.json` — PWA 設定（名稱、圖示、display standalone）。
- `service-worker.js` — 快取殼與音檔，供離線使用。
- `icons/icon-192.png`、`icons/icon-512.png` — PWA 圖示。
- `tests/engine.test.js` — 純 Node 執行的引擎單元測試（無需瀏覽器、無依賴）。
- `sound/` — 既有五個音檔，不變動。

**測試策略**：核心排程/序列邏輯抽到 `src/engine.js`，用零依賴的 Node 測試檔（`node tests/engine.test.js`）驗證，不需瀏覽器。DOM/音檔/動畫屬於整合層，於 Task 5–8 以瀏覽器手動驗收（每個 Task 附明確的手動驗收步驟）。

---

## Task 1: 專案骨架與本機伺服器

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`
- Create: `package.json`

**Interfaces:**
- Consumes: 無
- Produces: 可用 `npx serve` 開啟的空殼頁面；`app.js` 於載入時 `console.log('app loaded')`。

- [ ] **Step 1: 建立最小 index.html**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>呼吸練習</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main id="app">
    <h1>呼吸練習</h1>
  </main>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 建立空 style.css 與 app.js**

`style.css`：
```css
:root { color-scheme: light dark; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
```

`app.js`：
```js
console.log('app loaded');
```

- [ ] **Step 3: 建立 package.json（僅為本機伺服器方便）**

```json
{
  "name": "breath-practice",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "serve -l 3000 ."
  }
}
```

- [ ] **Step 4: 驗證本機開啟**

Run: `npx serve -l 3000 .`（另開瀏覽器到 http://localhost:3000）
Expected: 頁面顯示「呼吸練習」標題；瀏覽器 console 出現 `app loaded`。

- [ ] **Step 5: Commit**

```bash
git add index.html style.css app.js package.json
git commit -m "chore: scaffold breath practice web app"
```

---

## Task 2: 引擎 — 展開一輪循環為階段序列

**Files:**
- Create: `src/engine.js`
- Test: `tests/engine.test.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - `buildCycle(settings)` → 回傳階段陣列。`settings = { inhale, holdIn, exhale, holdOut }`（單位：秒，整數）。每個階段物件為 `{ name, key, seconds }`，其中 `name` 為中文顯示名（`'吸氣'|'閉氣'|'呼氣'`），`key` 對應音檔鍵（`'in'|'hold'|'out'`）。**seconds 為 0 的階段不納入陣列。**
  - 於瀏覽器與 Node 皆可用：檔案結尾加 `if (typeof module !== 'undefined') module.exports = { buildCycle };`，瀏覽器則靠全域函式。

- [ ] **Step 1: 寫失敗測試**

`tests/engine.test.js`：
```js
const assert = require('assert');
const { buildCycle } = require('../src/engine.js');

// 完整箱式呼吸：四階段皆有秒數
(() => {
  const cycle = buildCycle({ inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 });
  assert.deepStrictEqual(cycle, [
    { name: '吸氣', key: 'in', seconds: 4 },
    { name: '閉氣', key: 'hold', seconds: 4 },
    { name: '呼氣', key: 'out', seconds: 4 },
    { name: '閉氣', key: 'hold', seconds: 4 },
  ], 'box breathing cycle');
})();

// 閉氣為 0 應被略過：只剩吸與呼
(() => {
  const cycle = buildCycle({ inhale: 2, holdIn: 0, exhale: 2, holdOut: 0 });
  assert.deepStrictEqual(cycle, [
    { name: '吸氣', key: 'in', seconds: 2 },
    { name: '呼氣', key: 'out', seconds: 2 },
  ], 'skip zero holds');
})();

console.log('engine buildCycle: all tests passed');
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node tests/engine.test.js`
Expected: FAIL — `Cannot find module '../src/engine.js'`。

- [ ] **Step 3: 實作 buildCycle**

`src/engine.js`：
```js
function buildCycle(settings) {
  const phases = [
    { name: '吸氣', key: 'in', seconds: settings.inhale },
    { name: '閉氣', key: 'hold', seconds: settings.holdIn },
    { name: '呼氣', key: 'out', seconds: settings.exhale },
    { name: '閉氣', key: 'hold', seconds: settings.holdOut },
  ];
  return phases.filter((p) => p.seconds > 0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildCycle };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `node tests/engine.test.js`
Expected: PASS — 印出 `engine buildCycle: all tests passed`。

- [ ] **Step 5: Commit**

```bash
git add src/engine.js tests/engine.test.js
git commit -m "feat: add buildCycle to expand one breathing cycle into phases"
```

---

## Task 3: 引擎 — 設定正規化與衍生值

**Files:**
- Modify: `src/engine.js`
- Test: `tests/engine.test.js`

**Interfaces:**
- Consumes: `buildCycle` (Task 2)
- Produces:
  - `normalizeSettings(raw)` → 夾限並回傳合法設定 `{ inhale, holdIn, exhale, holdOut, minutes }`。規則：`inhale`/`exhale` 夾限至 `[1, 60]`；`holdIn`/`holdOut` 夾限至 `[0, 60]`；`minutes` 夾限至 `[1, 60]`；缺漏或非數值以預設值（inhale2/holdIn2/exhale2/holdOut2/minutes5）取代。
  - `cycleDuration(settings)` → 一輪循環總秒數（各納入階段 seconds 相加）。
  - 兩者一併加入 `module.exports`。

- [ ] **Step 1: 寫失敗測試（追加到 tests/engine.test.js）**

```js
const { normalizeSettings, cycleDuration } = require('../src/engine.js');

// 夾限與預設補值
(() => {
  const s = normalizeSettings({ inhale: 0, holdIn: -3, exhale: 999, holdOut: 4, minutes: 0 });
  assert.deepStrictEqual(s, { inhale: 1, holdIn: 0, exhale: 60, holdOut: 4, minutes: 1 }, 'clamp');
})();
(() => {
  const s = normalizeSettings({});
  assert.deepStrictEqual(s, { inhale: 2, holdIn: 2, exhale: 2, holdOut: 2, minutes: 5 }, 'defaults');
})();

// 一輪秒數
(() => {
  assert.strictEqual(cycleDuration({ inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }), 16, 'cycle 16s');
  assert.strictEqual(cycleDuration({ inhale: 2, holdIn: 0, exhale: 2, holdOut: 0 }), 4, 'cycle 4s');
})();

console.log('engine settings: all tests passed');
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `node tests/engine.test.js`
Expected: FAIL — `normalizeSettings is not a function`。

- [ ] **Step 3: 實作 normalizeSettings 與 cycleDuration**

在 `src/engine.js` 的 `buildCycle` 之後、export 之前加入：
```js
const DEFAULTS = { inhale: 2, holdIn: 2, exhale: 2, holdOut: 2, minutes: 5 };

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeSettings(raw) {
  const r = raw || {};
  return {
    inhale: clampInt(r.inhale, 1, 60, DEFAULTS.inhale),
    holdIn: clampInt(r.holdIn, 0, 60, DEFAULTS.holdIn),
    exhale: clampInt(r.exhale, 1, 60, DEFAULTS.exhale),
    holdOut: clampInt(r.holdOut, 0, 60, DEFAULTS.holdOut),
    minutes: clampInt(r.minutes, 1, 60, DEFAULTS.minutes),
  };
}

function cycleDuration(settings) {
  return buildCycle(settings).reduce((sum, p) => sum + p.seconds, 0);
}
```

並把 export 改為：
```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildCycle, normalizeSettings, cycleDuration, DEFAULTS };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `node tests/engine.test.js`
Expected: PASS — 兩組 all tests passed 皆印出。

- [ ] **Step 5: Commit**

```bash
git add src/engine.js tests/engine.test.js
git commit -m "feat: add settings normalization and cycle duration"
```

---

## Task 4: 設定畫面 UI（六列 + −/+ 控制 + localStorage）

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

**Interfaces:**
- Consumes: `normalizeSettings`, `DEFAULTS` (Task 3，經 `<script src="src/engine.js">` 掛全域)
- Produces:
  - 設定畫面 DOM：五個數值列（id：`inhale`、`holdIn`、`exhale`、`holdOut`、`minutes`），每列有 `−`/`+` 按鈕與數值顯示；第六列「開始」按鈕（id `startBtn`）。
  - `app.js` 全域函式 `getSettings()`（從畫面讀出 normalize 後的設定物件）與 `loadSettings()`（開頁時從 localStorage key `breath-settings` 還原並填入畫面，無則用 DEFAULTS）。每次 −/+ 變動即寫回 localStorage。

- [ ] **Step 1: 在 index.html 掛入引擎與設定畫面骨架**

在 `<script src="app.js">` 之前加入 `<script src="src/engine.js"></script>`，並把 `<main id="app">` 內容改為：
```html
<section id="settings-screen">
  <h1>呼吸練習</h1>
  <div class="row" data-field="inhale">
    <span class="label">吸氣秒數</span>
    <div class="stepper">
      <button class="minus" aria-label="減少">−</button>
      <output id="inhale">2</output>
      <button class="plus" aria-label="增加">+</button>
    </div>
  </div>
  <div class="row" data-field="holdIn">
    <span class="label">閉氣秒數（吸氣後）</span>
    <div class="stepper">
      <button class="minus" aria-label="減少">−</button>
      <output id="holdIn">2</output>
      <button class="plus" aria-label="增加">+</button>
    </div>
  </div>
  <div class="row" data-field="exhale">
    <span class="label">呼氣秒數</span>
    <div class="stepper">
      <button class="minus" aria-label="減少">−</button>
      <output id="exhale">2</output>
      <button class="plus" aria-label="增加">+</button>
    </div>
  </div>
  <div class="row" data-field="holdOut">
    <span class="label">閉氣秒數（呼氣後）</span>
    <div class="stepper">
      <button class="minus" aria-label="減少">−</button>
      <output id="holdOut">2</output>
      <button class="plus" aria-label="增加">+</button>
    </div>
  </div>
  <div class="row" data-field="minutes">
    <span class="label">練習時間（分鐘）</span>
    <div class="stepper">
      <button class="minus" aria-label="減少">−</button>
      <output id="minutes">5</output>
      <button class="plus" aria-label="增加">+</button>
    </div>
  </div>
  <button id="startBtn" class="primary">開始</button>
</section>
```

- [ ] **Step 2: style.css 加入設定畫面樣式**

```css
#app { max-width: 480px; margin: 0 auto; padding: 24px 16px; }
#settings-screen h1 { text-align: center; margin-bottom: 24px; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(128,128,128,.25); }
.label { font-size: 1.05rem; }
.stepper { display: flex; align-items: center; gap: 12px; }
.stepper button { width: 44px; height: 44px; font-size: 1.4rem; border: 1px solid rgba(128,128,128,.5); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
.stepper output { min-width: 2.5ch; text-align: center; font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.primary { width: 100%; margin-top: 28px; padding: 18px; font-size: 1.3rem; border: none; border-radius: 12px; background: #2e7d5b; color: #fff; cursor: pointer; }
```

- [ ] **Step 3: app.js 實作 −/+、讀寫與 localStorage**

把 `app.js` 內容改為：
```js
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
```

- [ ] **Step 4: 手動驗收**

Run: `npx serve -l 3000 .`（瀏覽器開 http://localhost:3000）
Expected:
- 五列顯示預設 2/2/2/2/5。
- 點 −/+ 數值變動；吸氣/呼氣不低於 1，閉氣可到 0，皆不超過 60。
- 改幾個值後重新整理頁面，數值仍保留（localStorage 生效）。

- [ ] **Step 5: Commit**

```bash
git add index.html style.css app.js
git commit -m "feat: settings screen with steppers and localStorage persistence"
```

---

## Task 5: 音檔預載與解鎖

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: 無
- Produces:
  - 全域 `sounds`：`{ start, in, hold, out, finish }`，各為 `HTMLAudioElement`（`new Audio('sound/…')`）。
  - `unlockAudio()`：於使用者手勢（按開始）內呼叫，對每個音檔 `load()` 一次以解除行動瀏覽器自動播放限制。
  - `playSound(key)`：把該音檔 `currentTime = 0` 後 `play()`（以 `.catch(()=>{})` 吞掉被拒的 promise，避免例外中斷流程）。

- [ ] **Step 1: 在 app.js 頂部加入音檔物件與函式**

```js
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
```

- [ ] **Step 2: 暫時把「開始」按鈕接上音檔以驗證**

在 `DOMContentLoaded` 內加入（此為暫接，Task 7 會取代）：
```js
document.getElementById('startBtn').addEventListener('click', () => {
  unlockAudio();
  playSound('start');
});
```

- [ ] **Step 3: 手動驗收（含手機）**

Run: `npx serve -l 3000 .`
Expected（桌機）：按「開始」聽到 `Start.mp3`。
Expected（Android 手機，若可測）：同一區網用手機瀏覽器開 `http://<電腦IP>:3000`，按「開始」能出聲（驗證手勢解鎖有效）。

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: preload and unlock audio, add playSound helper"
```

---

## Task 6: 練習畫面 UI 與圓圈動畫樣式

**Files:**
- Modify: `index.html`
- Modify: `style.css`

**Interfaces:**
- Consumes: 無
- Produces:
  - 練習畫面 DOM（id `practice-screen`，預設隱藏 `hidden`）：階段名稱 `#phase-name`、階段倒數 `#phase-count`、剩餘總時間 `#time-left`、圓圈 `#breath-circle`、停止按鈕 `#stopBtn`。
  - CSS class：圓圈 `.circle`，以及三個狀態 class `.grow`（放大）、`.shrink`（縮小）、`.hold`（維持），供 Task 7 以 JS 切換；放大/縮小以 CSS `transition: transform` 呈現，過渡時間由 JS 以 inline style `transitionDuration` 設定為該階段秒數。

- [ ] **Step 1: index.html 加入練習畫面（放在 settings-screen 之後）**

```html
<section id="practice-screen" hidden>
  <div id="time-left" class="time-left">05:00</div>
  <div class="circle-wrap">
    <div id="breath-circle" class="circle">
      <div class="circle-inner">
        <div id="phase-name" class="phase-name">準備</div>
        <div id="phase-count" class="phase-count">0</div>
      </div>
    </div>
  </div>
  <button id="stopBtn" class="primary stop">停止</button>
</section>
```

- [ ] **Step 2: style.css 加入練習畫面與圓圈樣式**

```css
#practice-screen { display: flex; flex-direction: column; align-items: center; min-height: 80vh; justify-content: space-between; padding-top: 24px; }
.time-left { font-size: 1.2rem; opacity: .7; font-variant-numeric: tabular-nums; }
.circle-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.circle { width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle at 50% 40%, #4db38a, #2e7d5b); display: flex; align-items: center; justify-content: center; transform: scale(1); transition: transform linear; }
.circle.grow { transform: scale(1.6); }
.circle.shrink { transform: scale(1); }
.circle.hold { /* 維持當前 transform，不變 */ }
.circle-inner { text-align: center; color: #fff; }
.phase-name { font-size: 1.5rem; }
.phase-count { font-size: 2.4rem; font-variant-numeric: tabular-nums; }
.stop { background: #a33; max-width: 480px; }
[hidden] { display: none !important; }
```

- [ ] **Step 3: 手動驗收（暫以 devtools 檢視）**

Run: `npx serve -l 3000 .`
在 devtools console 執行 `document.getElementById('practice-screen').hidden = false; document.getElementById('settings-screen').hidden = true;`
Expected: 出現剩餘時間、置中綠色圓圈（內含「準備 / 0」）、紅色「停止」按鈕。手動在 console 對圓圈加 `classList.add('grow')` 可見放大。

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: practice screen layout and breathing circle styles"
```

---

## Task 7: 練習流程引擎（階段推進、音檔、動畫、計時）

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: `buildCycle`, `cycleDuration` (engine)、`getSettings` (Task 4)、`playSound`/`unlockAudio` (Task 5)、練習畫面 DOM (Task 6)
- Produces:
  - `startPractice()`：解鎖音檔、切到練習畫面、播 `start`、初始化總時間，然後啟動第一輪。
  - `stopPractice(playFinish)`：清除所有計時器、切回設定畫面；`playFinish` 為 true 時先播 `finish`。
  - 內部狀態物件 `session`（`settings`、`totalMs`、`endTime`、`timers`），確保停止時能完整清除，避免殘留 `setTimeout` 造成幽靈音效。

- [ ] **Step 1: 移除 Task 5 的暫接、加入流程狀態與 start/stop**

刪掉 Task 5 Step 2 暫接的 startBtn listener。於 app.js 加入：
```js
let session = null;

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

function startPractice() {
  unlockAudio();
  const settings = getSettings();
  session = { settings, timers: [], endTime: 0, tick: null };
  showPractice(true);
  playSound('start');
  session.endTime = Date.now() + settings.minutes * 60 * 1000;
  updateTimeLeft();
  session.tick = setInterval(updateTimeLeft, 250);
  // Start.mp3 短暫前導後開始第一輪
  session.timers.push(setTimeout(runCycle, 1500));
}

function stopPractice(playFinish) {
  if (!session) return;
  session.timers.forEach(clearTimeout);
  if (session.tick) clearInterval(session.tick);
  session = null;
  if (playFinish) playSound('finish');
  showPractice(false);
}

function updateTimeLeft() {
  if (!session) return;
  document.getElementById('time-left').textContent = fmtTime(session.endTime - Date.now());
}
```

- [ ] **Step 2: 加入 runCycle 與 runPhase（核心推進）**

```js
function runCycle() {
  if (!session) return;
  // 時間到：做完當前整輪後才在此判斷結束
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
    // 一輪結束，接下一輪
    runCycle();
    return;
  }
  const phase = phases[index];
  const circle = document.getElementById('breath-circle');
  document.getElementById('phase-name').textContent = phase.name;
  playSound(phase.key);

  // 圓圈動畫：吸氣放大、呼氣縮小、閉氣維持
  circle.style.transitionDuration = phase.seconds + 's';
  circle.classList.remove('grow', 'shrink', 'hold');
  if (phase.key === 'in') circle.classList.add('grow');
  else if (phase.key === 'out') circle.classList.add('shrink');
  else circle.classList.add('hold');

  // 階段內每秒倒數顯示
  let remaining = phase.seconds;
  document.getElementById('phase-count').textContent = String(remaining);
  const countdown = setInterval(() => {
    if (!session) { clearInterval(countdown); return; }
    remaining -= 1;
    document.getElementById('phase-count').textContent = String(Math.max(0, remaining));
  }, 1000);
  session.timers.push(countdown);

  // 階段結束後進入下一階段
  session.timers.push(setTimeout(() => {
    clearInterval(countdown);
    runPhase(phases, index + 1);
  }, phase.seconds * 1000));
}
```

註：`session.timers` 同時收集 `setTimeout` 與 `setInterval` 的 id；`clearTimeout` 與 `clearInterval` 在瀏覽器中 id 空間共用，`stopPractice` 以 `clearTimeout` 全部清除即可，另外單獨清 `session.tick`。

- [ ] **Step 3: 綁定開始與停止按鈕**

在 `DOMContentLoaded` 內加入：
```js
document.getElementById('startBtn').addEventListener('click', startPractice);
document.getElementById('stopBtn').addEventListener('click', () => stopPractice(false));
```

- [ ] **Step 4: 手動驗收**

Run: `npx serve -l 3000 .`
測試情境（先把練習時間設 1 分鐘、吸2閉2呼2閉2）：
Expected:
- 按「開始」→ 聽到 Start.mp3 → 圓圈開始放大並顯示「吸氣 2」倒數，依序 吸→閉→呼→閉 循環，各階段播對應音效、圓圈放大/維持/縮小。
- 剩餘時間持續遞減；到 0 後**做完當前整輪**才聽到 finish.mp3 並自動回設定畫面。
- 練習中按「停止」→ 立即回設定畫面、無殘留音效或倒數。
- 另測「閉氣都設 0」：循環只有 吸→呼，兩個閉氣階段被略過。

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: practice engine driving phases, audio, circle animation and timing"
```

---

## Task 8: PWA — manifest、圖示與 Service Worker（離線）

**Files:**
- Create: `manifest.json`
- Create: `service-worker.js`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Modify: `index.html`
- Modify: `app.js`

**Interfaces:**
- Consumes: 全部前述靜態資源
- Produces: 可安裝的 PWA；離線時仍可載入頁面與音檔。

- [ ] **Step 1: 建立 manifest.json**

```json
{
  "name": "呼吸練習",
  "short_name": "呼吸練習",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#111111",
  "theme_color": "#2e7d5b",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: 產生圖示（純色底 + 文字，避免外部依賴）**

用瀏覽器 console 或 Node canvas 產生皆可；最簡單方式——在專案臨時建立 `make-icons.html`，內容：
```html
<canvas id="c"></canvas>
<script>
function make(size){
  const c=document.getElementById('c'); c.width=size; c.height=size;
  const x=c.getContext('2d');
  x.fillStyle='#2e7d5b'; x.fillRect(0,0,size,size);
  x.fillStyle='#fff'; x.textAlign='center'; x.textBaseline='middle';
  x.font=(size*0.5)+'px system-ui'; x.fillText('呼',size/2,size*0.52);
  const a=document.createElement('a');
  a.href=c.toDataURL('image/png'); a.download='icon-'+size+'.png'; a.click();
}
make(192); make(512);
</script>
```
以 `npx serve` 開啟此頁自動下載兩張 PNG，移入 `icons/`，完成後刪除 `make-icons.html`。

Expected: `icons/icon-192.png`、`icons/icon-512.png` 存在。

- [ ] **Step 3: 建立 service-worker.js**

```js
const CACHE = 'breath-v1';
const ASSETS = [
  '.', 'index.html', 'style.css', 'app.js', 'src/engine.js', 'manifest.json',
  'sound/Start.mp3', 'sound/in.mp3', 'sound/hold.mp3', 'sound/out.mp3', 'sound/finish.mp3',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```

- [ ] **Step 4: index.html 掛 manifest，app.js 註冊 service worker**

`index.html` 的 `<head>` 內加入：
```html
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#2e7d5b" />
```

`app.js` 末端加入：
```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
```

- [ ] **Step 5: 手動驗收**

Run: `npx serve -l 3000 .`（PWA 需同源，localhost 視為安全來源）
Expected:
- devtools → Application → Manifest 顯示「呼吸練習」與圖示。
- Application → Service Workers 顯示已 activated。
- 勾選 Offline 後重新整理，頁面仍載入、按開始音效仍可播放（已快取）。
- 手機（若可測）Chrome 選單出現「加到主畫面」，加入後為全螢幕獨立視窗。

- [ ] **Step 6: Commit**

```bash
git add manifest.json service-worker.js icons/ index.html app.js
git commit -m "feat: PWA manifest, icons and offline service worker"
```

---

## Task 9: 部署說明文件

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 完成的 App
- Produces: 部署與使用說明。

- [ ] **Step 1: 撰寫 README.md**

````markdown
# 呼吸練習

用音檔與圓圈動畫引導呼吸的簡單網頁 App，可加到手機主畫面離線使用。

## 本機測試
```
npx serve -l 3000 .
```
瀏覽器開 http://localhost:3000 （請勿用 file:// 直接開，音檔會播不出來）。

## 部署（擇一，皆免費靜態空間）
- **GitHub Pages**：把整個資料夾推到 GitHub repo，Settings → Pages → 選 branch 根目錄，取得網址。
- **Netlify / Cloudflare Pages**：拖曳整個資料夾即可，取得網址。

部署後把網址傳給任何人，手機/桌機瀏覽器打開即用；Chrome 可「加到主畫面」離線使用。

## 更新音檔
替換 `sound/` 內對應檔案（檔名不變），並把 `service-worker.js` 的 `CACHE` 版本號（如 `breath-v1` → `breath-v2`）遞增以讓使用者取得新版。
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add usage and deployment instructions"
```

---

## Self-Review

**Spec coverage：**
- 純網頁 / 無框架 → Task 1、Global Constraints ✅
- 部署可分享網址 → Task 9 ✅
- PWA + 離線 + 加到主畫面 → Task 8 ✅
- 記憶設定 localStorage → Task 4 ✅
- 設定畫面六列 + −/+ + 預設 2/2/2/2/5 + 閉氣可 0 + 無離開鈕 → Task 4、Global Constraints ✅
- 練習畫面：階段名 / 倒數 / 剩餘時間 / 圓圈動畫 / 停止 → Task 6、Task 7 ✅
- 流程：Start→循環(in/hold/out/hold)→0秒略過→時間到做完整輪→finish→回設定；停止立即回 → Task 7 ✅
- 首次播放需手勢、預先解鎖 → Task 5、Task 7 ✅
- 不可 file:// 直開 → Task 1、Task 9 ✅
- 不加音量控制 → 已排除，無對應任務（正確）✅
- 跨平台 → 純網頁本質達成，README 說明 ✅

**Placeholder scan：** 無 TBD/TODO；每個程式步驟均含完整程式碼。✅

**Type consistency：** `buildCycle` 回傳 `{name,key,seconds}` 於 Task 2 定義，Task 7 使用 `phase.name/key/seconds` 一致；`normalizeSettings`/`cycleDuration`/`DEFAULTS` 於 Task 3 export，Task 4/7 使用一致；`getSettings`/`playSound`/`unlockAudio`/`startPractice`/`stopPractice`/`session` 命名跨任務一致。✅

無缺漏，計畫完成。
