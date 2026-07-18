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
