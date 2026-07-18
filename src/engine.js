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
