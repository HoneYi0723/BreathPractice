function buildCycle(settings) {
  const phases = [
    { name: '吸氣', key: 'in', seconds: settings.inhale },
    { name: '閉氣', key: 'hold', seconds: settings.holdIn },
    { name: '呼氣', key: 'out', seconds: settings.exhale },
    { name: '閉氣', key: 'hold', seconds: settings.holdOut },
  ];
  return phases.filter((p) => p.seconds > 0);
}

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildCycle, normalizeSettings, cycleDuration, DEFAULTS };
}
