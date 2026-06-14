// v0.68 wind overlay grid correction. Visual only.

function ensureWindStreakCoverageV067() {
  if (typeof windVisibleLayerV066 === 'undefined') return;
  const items = Array.from(windVisibleLayerV066.querySelectorAll('.wind-streak-v066'));
  items.forEach((item, idx) => { if (idx >= 20) item.remove(); });
  const kept = Array.from(windVisibleLayerV066.querySelectorAll('.wind-streak-v066'));
  for (let i = kept.length; i < 20; i += 1) {
    const item = document.createElement('i');
    item.className = 'wind-streak-v066';
    windVisibleLayerV066.appendChild(item);
  }
}

function layoutWindStreaksV067() {
  if (typeof windVisibleLayerV066 === 'undefined') return;
  const items = Array.from(windVisibleLayerV066.querySelectorAll('.wind-streak-v066'));
  items.forEach((item, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    item.style.left = `${-22 + col * 43 + (row % 2 ? 8 : 0)}%`;
    item.style.top = `${-3 + row * 26 + (col % 2 ? 3 : 0)}%`;
    item.style.width = `${70 + (idx % 5) * 17}px`;
    item.style.animationDelay = `${-idx * 0.29}s`;
  });
}

const updateWindVisibleOverlayBeforeV067 = typeof updateWindVisibleOverlayV066 === 'function' ? updateWindVisibleOverlayV066 : function() {};

updateWindVisibleOverlayV066 = function updateWindVisibleOverlayCoverageV067() {
  ensureWindStreakCoverageV067();
  layoutWindStreaksV067();
  updateWindVisibleOverlayBeforeV067();
  if (typeof windVisibleLayerV066 === 'undefined') return;
  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  if (mph < 10) {
    windVisibleLayerV066.style.display = 'none';
    windVisibleLayerV066.style.opacity = '0';
    return;
  }
  const angle = typeof windStateV057 !== 'undefined' ? windStateV057.angle : 0;
  const distance = 170 + mph * 6.5;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  windVisibleLayerV066.style.setProperty('--wind-start-x', `${-dx * 0.62}px`);
  windVisibleLayerV066.style.setProperty('--wind-start-y', `${-dy * 0.62}px`);
  windVisibleLayerV066.style.setProperty('--wind-end-x', `${dx * 0.82}px`);
  windVisibleLayerV066.style.setProperty('--wind-end-y', `${dy * 0.82}px`);
  windVisibleLayerV066.style.setProperty('--wind-alpha', String(Math.min(0.30, 0.10 + mph * 0.009)));
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
