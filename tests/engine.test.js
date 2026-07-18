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
