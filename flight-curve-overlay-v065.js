// v0.65 flight smoothing: persistent shot curve + wind drift, and more readable heavy-wind overlay.
// Keeps previous UI/tracer work; only supersedes the final flight update and wind overlay visibility.

function updateWindOverlayV065() {
  if (typeof windOverlayV064 === 'undefined') return;
  const rect = canvas.getBoundingClientRect();
  windOverlayV064.style.left = `${rect.left}px`;
  windOverlayV064.style.top = `${rect.top}px`;
  windOverlayV064.style.width = `${rect.width}px`;
  windOverlayV064.style.height = `${rect.height}px`;

  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  const menuOpen = typeof courseMenuV045 !== 'undefined' && getComputedStyle(courseMenuV045).display !== 'none';
  if (menuOpen || mph < 8) {
    windOverlayV064.style.display = 'none';
    windOverlayV064.style.opacity = '0';
    return;
  }

  const angle = typeof windStateV057 !== 'undefined' ? windStateV057.angle : 0;
  windOverlayV064.style.display = 'block';
  windOverlayV064.style.opacity = String(Math.min(0.24, 0.06 + mph * 0.008));
  windOverlayV064.style.setProperty('--wind-rot-v064', `${angle * 180 / Math.PI}deg`);
  windOverlayV064.style.setProperty('--wind-speed-v064', `${Math.max(2.3, 6.7 - mph * 0.19)}s`);
}

updateWindOverlayV064 = updateWindOverlayV065;

updateFlight = function updateFlightPersistentCurveV065() {
  if (!ball.flight) return;
  const shot = ball.flight;
  const trackingDriver = typeof driverTrailActiveV038 !== 'undefined' && driverTrailActiveV038 && shot.clubKey === 'driver';
  if (trackingDriver && typeof driverTrailV038 !== 'undefined') driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  const smooth = t * t * (3 - 2 * t);
  const arc = Math.sin(t * Math.PI);

  const baseX = lerp(shot.startX, shot.endX, ease);
  const baseY = lerp(shot.startY, shot.endY, ease);
  const perpX = -Math.sin(shot.angle);
  const perpY = Math.cos(shot.angle);

  // Old curve returned fully to zero at touchdown. This keeps a modest permanent component
  // so slices/fades and wind do not visually snap back onto the centre line at the end.
  const curve = shot.curvePixels || 0;
  const transientCurve = curve * 0.58 * Math.sin(t * Math.PI);
  const landingCurve = curve * 0.34 * smooth;
  const curveOffset = transientCurve + landingCurve;

  let windX = 0;
  let windY = 0;
  let windCurveX = 0;
  let windCurveY = 0;
  if (shot.windV063) {
    const windEase = smooth;
    const airCurve = Math.sin(t * Math.PI) * 0.35 + smooth * 0.65;
    windX = shot.windV063.driftX * windEase;
    windY = shot.windV063.driftY * windEase;
    windCurveX = shot.windV063.lateralX * airCurve;
    windCurveY = shot.windV063.lateralY * airCurve;
  }

  ball.x = clamp(baseX + perpX * curveOffset + windX + windCurveX, 18, canvas.width - 18);
  ball.y = clamp(baseY + perpY * curveOffset + windY + windCurveY, 24, canvas.height - 18);
  ball.visualScale = 1 + arc * shot.height;

  if (trackingDriver && typeof driverTrailV038 !== 'undefined') driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

  if (t >= 1) {
    const curveAngle = curve * 0.0017;
    const rollAngle = (shot.windV063 ? shot.windV063.rollAngle : shot.angle) + curveAngle;
    ball.flight = null;
    ball.visualScale = 1;
    if (trackingDriver) {
      driverTrailActiveV038 = false;
      driverTrailUntilV038 = performance.now() + 1650;
    }
    startLandingRoll(rollAngle, getLie(), shot.carryYards, shot.clubKey);
  }
};

const drawBeforeFlightCurveV065 = draw;
draw = function drawFlightCurveV065() {
  drawBeforeFlightCurveV065();
  updateWindOverlayV065();
};

const updateHudBeforeFlightCurveV065 = updateHud;
updateHud = function updateHudFlightCurveV065() {
  updateHudBeforeFlightCurveV065();
  updateWindOverlayV065();
};

setTimeout(updateWindOverlayV065, 0);
setTimeout(updateWindOverlayV065, 300);
