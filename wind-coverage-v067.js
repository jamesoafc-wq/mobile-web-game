// v0.67 wind overlay coverage fix: distribute streaks across and beyond the full course width.
// Visual-only patch. Does not alter wind physics, shot shape, tracer, or flight smoothing.

function ensureWindStreakCoverageV067() {
  if (typeof windVisibleLayerV066 === 'undefined') return;
  const existing = windVisibleLayerV066.querySelectorAll('.wind-streak-v066').length;
  for (let i = existing; i < 30; i += 1) {
    const streak = document.createElement('i');
    streak.className = 'wind-streak-v066';
    windVisibleLayerV066.appendChild(streak);
  }
}

function layoutWindStreaksV067() {
  if (typeof windVisibleLayerV066 === 'undefined') return;
  const streaks = Array.from(windVisibleLayerV066.querySelectorAll('.wind-streak-v066'));
  const rows = 10;
  streaks.forEach((streak, idx) => {
    const col = idx % 10;
    const row = Math.floor(idx / 10) % rows;
    // Spread source positions from well off the left edge to well off the right edge.
    // This keeps left-blowing wind visible on the right side of the screen.
    streak.style.left = `${-34 + col * 18.6 + (row % 2) * 7}%`;
    streak.style.top = `${4 + row * 10 + (col % 3) * 1.7}%`;
    streak.style.width = `${62 + (idx % 6) * 18}px`;
    streak.style.animationDelay = `${-idx * 0.23}s`;
  });
}

const updateWindVisibleOverlayBeforeV067 = typeof updateWindVisibleOverlayV066 === 'function'
  ? updateWindVisibleOverlayV066
  : function() {};

updateWindVisibleOverlayV066 = function updateWindVisibleOverlayCoverageV067() {
  ensureWindStreakCoverageV067();
  layoutWindStreaksV067();
  updateWindVisibleOverlayBeforeV067();

  if (typeof windVisibleLayerV066 === 'undefined') return;
  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  if (mph >= 6) {
    const angle = typeof windStateV057 !== 'undefined' ? windStateV057.angle : 0;
    const dx = Math.cos(angle) * (190 + mph * 8.5);
    const dy = Math.sin(angle) * (86 + mph * 4.2);
    windVisibleLayerV066.style.setProperty('--wind-start-x', `${-dx * 0.72}px`);
    windVisibleLayerV066.style.setProperty('--wind-start-y', `${-dy * 0.72}px`);
    windVisibleLayerV066.style.setProperty('--wind-end-x', `${dx * 0.92}px`);
    windVisibleLayerV066.style.setProperty('--wind-end-y', `${dy * 0.92}px`);
    windVisibleLayerV066.style.setProperty('--wind-alpha', String(Math.min(0.32, 0.12 + mph * 0.01)));
  }
};

const drawBeforeWindCoverageV067 = draw;
draw = function drawWindCoverageV067() {
  drawBeforeWindCoverageV067();
  updateWindVisibleOverlayV066();
};

const updateHudBeforeWindCoverageV067 = updateHud;
updateHud = function updateHudWindCoverageV067() {
  updateHudBeforeWindCoverageV067();
  updateWindVisibleOverlayV066();
};

setTimeout(() => { ensureWindStreakCoverageV067(); layoutWindStreaksV067(); updateWindVisibleOverlayV066(); }, 0);
setTimeout(() => { ensureWindStreakCoverageV067(); layoutWindStreaksV067(); updateWindVisibleOverlayV066(); }, 300);
