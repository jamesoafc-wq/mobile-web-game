// v0.66 visible wind overlay: actual DOM streaks over the course, no blend mode or menu-display dependency.
// Does not alter shot physics or the v0.65 flight smoothing.

const windVisibleLayerV066 = document.createElement('div');
windVisibleLayerV066.className = 'wind-visible-layer-v066';
windVisibleLayerV066.style.cssText = [
  'position:fixed',
  'z-index:994',
  'pointer-events:none',
  'overflow:hidden',
  'display:none',
  'opacity:0'
].join(';');

document.body.appendChild(windVisibleLayerV066);

const windVisibleStyleV066 = document.createElement('style');
windVisibleStyleV066.textContent = `
@keyframes windVisibleDriftV066 {
  0% { transform: translate3d(var(--wind-start-x, -80px), var(--wind-start-y, 0px), 0) rotate(var(--wind-angle, 0deg)); opacity: 0; }
  16% { opacity: var(--wind-alpha, .18); }
  72% { opacity: var(--wind-alpha, .18); }
  100% { transform: translate3d(var(--wind-end-x, 180px), var(--wind-end-y, 0px), 0) rotate(var(--wind-angle, 0deg)); opacity: 0; }
}
.wind-streak-v066 {
  position: absolute;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(245,255,238,.70), transparent);
  filter: blur(.15px);
  animation-name: windVisibleDriftV066;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}
`;
document.head.appendChild(windVisibleStyleV066);

for (let i = 0; i < 14; i += 1) {
  const streak = document.createElement('i');
  streak.className = 'wind-streak-v066';
  streak.style.left = `${-22 + (i % 4) * 18}%`;
  streak.style.top = `${6 + i * 7.1}%`;
  streak.style.width = `${54 + (i % 5) * 16}px`;
  streak.style.animationDelay = `${-i * 0.37}s`;
  streak.style.animationDuration = `${4.1 + (i % 4) * 0.62}s`;
  windVisibleLayerV066.appendChild(streak);
}

function updateWindVisibleOverlayV066() {
  const rect = canvas.getBoundingClientRect();
  windVisibleLayerV066.style.left = `${rect.left}px`;
  windVisibleLayerV066.style.top = `${rect.top}px`;
  windVisibleLayerV066.style.width = `${rect.width}px`;
  windVisibleLayerV066.style.height = `${rect.height}px`;

  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  if (mph < 6 || rect.width <= 0 || rect.height <= 0) {
    windVisibleLayerV066.style.display = 'none';
    windVisibleLayerV066.style.opacity = '0';
    return;
  }

  const angle = typeof windStateV057 !== 'undefined' ? windStateV057.angle : 0;
  const dx = Math.cos(angle) * (150 + mph * 7);
  const dy = Math.sin(angle) * (70 + mph * 3.5);
  const alpha = Math.min(0.34, 0.11 + mph * 0.011);
  const durationScale = Math.max(0.56, 1.15 - mph * 0.025);

  windVisibleLayerV066.style.display = 'block';
  windVisibleLayerV066.style.opacity = '1';
  windVisibleLayerV066.style.setProperty('--wind-angle', `${angle * 180 / Math.PI}deg`);
  windVisibleLayerV066.style.setProperty('--wind-start-x', `${-dx * 0.45}px`);
  windVisibleLayerV066.style.setProperty('--wind-start-y', `${-dy * 0.45}px`);
  windVisibleLayerV066.style.setProperty('--wind-end-x', `${dx}px`);
  windVisibleLayerV066.style.setProperty('--wind-end-y', `${dy}px`);
  windVisibleLayerV066.style.setProperty('--wind-alpha', String(alpha));

  windVisibleLayerV066.querySelectorAll('.wind-streak-v066').forEach((streak, idx) => {
    const base = 3.5 + (idx % 4) * 0.55;
    streak.style.animationDuration = `${base * durationScale}s`;
  });
}

// Hide the older ultra-subtle layer so the visible v0.66 layer is the only wind visual.
function suppressOldWindLayersV066() {
  if (typeof windOverlayV064 !== 'undefined') {
    windOverlayV064.style.display = 'none';
    windOverlayV064.style.opacity = '0';
  }
}

const drawBeforeVisibleWindV066 = draw;
draw = function drawVisibleWindV066() {
  drawBeforeVisibleWindV066();
  suppressOldWindLayersV066();
  updateWindVisibleOverlayV066();
};

const updateHudBeforeVisibleWindV066 = updateHud;
updateHud = function updateHudVisibleWindV066() {
  updateHudBeforeVisibleWindV066();
  suppressOldWindLayersV066();
  updateWindVisibleOverlayV066();
};

const renderCourseMenuBeforeVisibleWindV066 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuVisibleWindV066() {
  renderCourseMenuBeforeVisibleWindV066();
  updateWindVisibleOverlayV066();
};

window.addEventListener('resize', updateWindVisibleOverlayV066);
window.addEventListener('scroll', updateWindVisibleOverlayV066, { passive: true });
setTimeout(updateWindVisibleOverlayV066, 0);
setTimeout(updateWindVisibleOverlayV066, 300);
