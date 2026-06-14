// v0.64: subtle heavy-wind screen animation and restored driver tracer recording with v0.63 wind flight.

const windOverlayV064 = document.createElement('div');
windOverlayV064.className = 'wind-overlay-v064';
windOverlayV064.style.cssText = [
  'position:fixed',
  'z-index:970',
  'pointer-events:none',
  'display:none',
  'overflow:hidden',
  'opacity:0',
  'mix-blend-mode:screen'
].join(';');

const windOverlayStyleV064 = document.createElement('style');
windOverlayStyleV064.textContent = `
@keyframes windDriftV064 {
  0% { transform: translate3d(-18%, -4%, 0) rotate(var(--wind-rot-v064, 0deg)); }
  100% { transform: translate3d(18%, 4%, 0) rotate(var(--wind-rot-v064, 0deg)); }
}
.wind-overlay-v064::before,
.wind-overlay-v064::after {
  content: '';
  position: absolute;
  inset: -28% -48%;
  background:
    repeating-linear-gradient(100deg,
      transparent 0 34px,
      rgba(255,255,255,.022) 35px 37px,
      transparent 38px 74px);
  animation: windDriftV064 var(--wind-speed-v064, 5.8s) linear infinite;
}
.wind-overlay-v064::after {
  opacity: .45;
  animation-duration: calc(var(--wind-speed-v064, 5.8s) * 1.35);
  background:
    repeating-linear-gradient(100deg,
      transparent 0 62px,
      rgba(220,255,230,.018) 63px 65px,
      transparent 66px 126px);
}
`;
document.head.appendChild(windOverlayStyleV064);
document.body.appendChild(windOverlayV064);

function positionWindOverlayV064() {
  const rect = canvas.getBoundingClientRect();
  windOverlayV064.style.left = `${rect.left}px`;
  windOverlayV064.style.top = `${rect.top}px`;
  windOverlayV064.style.width = `${rect.width}px`;
  windOverlayV064.style.height = `${rect.height}px`;
}

function updateWindOverlayV064() {
  positionWindOverlayV064();
  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  const menuOpen = typeof courseMenuV045 !== 'undefined' && getComputedStyle(courseMenuV045).display !== 'none';
  if (menuOpen || mph < 10) {
    windOverlayV064.style.display = 'none';
    windOverlayV064.style.opacity = '0';
    return;
  }
  const angle = typeof windStateV057 !== 'undefined' ? windStateV057.angle : 0;
  windOverlayV064.style.display = 'block';
  windOverlayV064.style.opacity = String(Math.min(0.18, 0.045 + mph * 0.006));
  windOverlayV064.style.setProperty('--wind-rot-v064', `${angle * 180 / Math.PI}deg`);
  windOverlayV064.style.setProperty('--wind-speed-v064', `${Math.max(2.7, 7.2 - mph * 0.18)}s`);
}

function drawDriverTrailSafeV064() {
  const now = performance.now();
  if (typeof driverTrailV038 === 'undefined' || driverTrailV038.length < 2) return;
  if (!driverTrailActiveV038 && now > driverTrailUntilV038) return;

  const colour = (typeof currentCustomV057 === 'function' ? currentCustomV057().trail : null) || '#ffdd46';
  const rgba = typeof rgbaV057 === 'function'
    ? rgbaV057
    : ((hex, a) => hex === '#ffdd46' ? `rgba(255,221,70,${a})` : `rgba(255,221,70,${a})`);

  const cam = getCamera();
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(colour, .26);
  ctx.lineWidth = 6.2;
  ctx.beginPath();
  driverTrailV038.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.strokeStyle = rgba(colour, .9);
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  driverTrailV038.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.restore();
}

// Replace the current wind flight update with the v0.63 no-snap logic plus restored tracer recording.
updateFlight = function updateFlightWindAndTracerV064() {
  if (!ball.flight) return;
  const shot = ball.flight;
  const trackingDriver = typeof driverTrailActiveV038 !== 'undefined' && driverTrailActiveV038 && shot.clubKey === 'driver';
  if (trackingDriver && typeof driverTrailV038 !== 'undefined') driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  const arc = Math.sin(t * Math.PI);
  const baseX = lerp(shot.startX, shot.endX, ease);
  const baseY = lerp(shot.startY, shot.endY, ease);
  const curveOffset = (shot.curvePixels || 0) * Math.sin(t * Math.PI);
  const perpX = -Math.sin(shot.angle);
  const perpY = Math.cos(shot.angle);

  let windX = 0;
  let windY = 0;
  if (shot.windV063) {
    const windEase = t * t * (3 - 2 * t);
    const airCurve = Math.sin(t * Math.PI * 0.92) * Math.sin(t * Math.PI * 0.5);
    windX = shot.windV063.driftX * windEase + shot.windV063.lateralX * airCurve;
    windY = shot.windV063.driftY * windEase + shot.windV063.lateralY * airCurve;
  }

  ball.x = clamp(baseX + perpX * curveOffset + windX, 18, canvas.width - 18);
  ball.y = clamp(baseY + perpY * curveOffset + windY, 24, canvas.height - 18);
  ball.visualScale = 1 + arc * shot.height;

  if (trackingDriver && typeof driverTrailV038 !== 'undefined') driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

  if (t >= 1) {
    const rollAngle = shot.windV063 ? shot.windV063.rollAngle : shot.angle;
    ball.flight = null;
    ball.visualScale = 1;
    if (trackingDriver) {
      driverTrailActiveV038 = false;
      driverTrailUntilV038 = performance.now() + 1650;
    }
    startLandingRoll(rollAngle, getLie(), shot.carryYards, shot.clubKey);
  }
};

const drawBeforeWindOverlayV064 = draw;
draw = function drawWindOverlayTracerV064() {
  drawBeforeWindOverlayV064();
  drawDriverTrailSafeV064();
  updateWindOverlayV064();
};

const updateHudBeforeWindOverlayV064 = updateHud;
updateHud = function updateHudWindOverlayV064() {
  updateHudBeforeWindOverlayV064();
  updateWindOverlayV064();
};

const renderCourseMenuBeforeWindOverlayV064 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuWindOverlayV064() {
  renderCourseMenuBeforeWindOverlayV064();
  updateWindOverlayV064();
};

window.addEventListener('resize', updateWindOverlayV064);
window.addEventListener('scroll', updateWindOverlayV064, { passive: true });
setTimeout(updateWindOverlayV064, 0);
setTimeout(updateWindOverlayV064, 300);
