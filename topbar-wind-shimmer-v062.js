// v0.62/v0.72: swap Score/Next Shot, full-bar shimmer, score-cell glow, and proper launch-time wind flight.

function reorderTopBarV062() {
  if (typeof topBarV060 === 'undefined') return;
  if (!holeCellV060 || !scoreCellV060 || !windCellV060 || !lieCellV060) return;
  topBarV060.style.gridTemplateColumns = '1.1fr 1.22fr 1fr .78fr';
  topBarV060.append(holeCellV060.cell, lieCellV060.cell, windCellV060.cell, scoreCellV060.cell);
  [holeCellV060, lieCellV060, windCellV060, scoreCellV060].forEach((part, idx) => {
    part.cell.style.borderLeft = idx === 0 ? '0' : part.cell.style.borderLeft;
  });
}

let topBarShimmerUntilV062 = 0;
let scoreGlowUntilV072 = 0;

function installTopBarShimmerV062() {
  if (typeof topBarV060 === 'undefined') return null;
  topBarV060.style.position = 'fixed';
  topBarV060.style.overflow = 'hidden';
  const oldScoreBeam = typeof scoreCellV060 !== 'undefined' && scoreCellV060.cell ? scoreCellV060.cell.querySelector('[data-score-shimmer-v061="true"]') : null;
  if (oldScoreBeam) oldScoreBeam.remove();
  let beam = topBarV060.querySelector('[data-fullbar-shimmer-v062="true"]');
  if (!beam) {
    beam = document.createElement('div');
    beam.dataset.fullbarShimmerV062 = 'true';
    beam.style.cssText = [
      'position:absolute',
      'top:-40%',
      'bottom:-40%',
      'left:-42%',
      'width:34%',
      'transform:skewX(-21deg)',
      'background:linear-gradient(90deg,transparent,rgba(255,255,255,.74),transparent)',
      'opacity:0',
      'pointer-events:none',
      'z-index:3'
    ].join(';');
    topBarV060.appendChild(beam);
  }
  return beam;
}

function installScoreGlowV072() {
  if (typeof scoreCellV060 === 'undefined' || !scoreCellV060.cell) return null;
  const cell = scoreCellV060.cell;
  cell.style.position = 'relative';
  cell.style.overflow = 'hidden';
  cell.style.transition = 'box-shadow 120ms ease, background 120ms ease, transform 120ms ease';

  let glow = cell.querySelector('[data-score-glow-v072="true"]');
  if (!glow) {
    glow = document.createElement('div');
    glow.dataset.scoreGlowV072 = 'true';
    glow.style.cssText = [
      'position:absolute',
      'inset:0',
      'border-radius:inherit',
      'background:radial-gradient(circle at 50% 45%,rgba(255,242,157,.42),rgba(255,214,82,.18) 42%,transparent 72%)',
      'opacity:0',
      'pointer-events:none',
      'z-index:1'
    ].join(';');
    cell.insertBefore(glow, cell.firstChild);
  }
  return glow;
}

triggerScoreShimmerV061 = function triggerFullBarShimmerV062() {
  const now = performance.now();
  topBarShimmerUntilV062 = now + 940;
  scoreGlowUntilV072 = now + 940;
};

function runScoreGlowV072() {
  const glow = installScoreGlowV072();
  if (!glow || typeof scoreCellV060 === 'undefined' || !scoreCellV060.cell) return;
  const cell = scoreCellV060.cell;
  const start = scoreGlowUntilV072 - 940;
  const now = performance.now();
  if (now > scoreGlowUntilV072) {
    glow.style.opacity = '0';
    cell.style.boxShadow = '';
    cell.style.background = '';
    cell.style.transform = '';
    return;
  }
  const t = clamp((now - start) / 940, 0, 1);
  const pulse = Math.sin(t * Math.PI);
  const flicker = 0.82 + Math.sin(t * Math.PI * 5) * 0.08;
  const strength = pulse * flicker;
  glow.style.opacity = String(0.82 * strength);
  cell.style.boxShadow = `inset 0 0 ${10 + 16 * strength}px rgba(255,226,88,${0.18 + 0.28 * strength}), 0 0 ${8 + 18 * strength}px rgba(255,214,72,${0.16 + 0.26 * strength})`;
  cell.style.background = `linear-gradient(180deg, rgba(255,238,142,${0.08 + 0.18 * strength}), rgba(255,208,74,${0.04 + 0.12 * strength}))`;
  cell.style.transform = `scale(${1 + 0.012 * strength})`;
}

runScoreShimmerV061 = function runFullBarShimmerV062() {
  const beam = installTopBarShimmerV062();
  runScoreGlowV072();
  if (!beam) return;
  const start = topBarShimmerUntilV062 - 940;
  const now = performance.now();
  if (now > topBarShimmerUntilV062) {
    beam.style.opacity = '0';
    beam.style.left = '-42%';
    return;
  }
  const t = clamp((now - start) / 940, 0, 1);
  beam.style.opacity = String(Math.sin(t * Math.PI) * 0.82);
  beam.style.left = `${-40 + t * 145}%`;
};

const resolveSkillShotBaseV062 = typeof resolveSkillShotBaseV058 === 'function'
  ? resolveSkillShotBaseV058
  : (typeof resolveSkillShotBeforeWindV057 === 'function' ? resolveSkillShotBeforeWindV057 : resolveSkillShot);

resolveSkillShot = function resolveSkillShotWindAtLaunchV062() {
  const shotInfo = pendingShot ? { clubKey: pendingShot.clubKey, power: pendingShot.power } : null;
  resolveSkillShotBaseV062();
  if (!shotInfo || !ball || !ball.flight) return;
  const club = clubs[shotInfo.clubKey];
  if (!club || club.type === 'putt') return;
  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  if (mph <= 0) return;

  const shotAngle = ball.flight.angle || 0;
  const windAngle = windStateV057.angle || 0;
  const power = shotInfo.power || 0.5;
  const cross = Math.sin(windAngle - shotAngle);
  const tail = Math.cos(windAngle - shotAngle);
  const drift = mph * (0.38 + power * 0.72);
  const downwindLift = Math.max(0, tail) * mph * 0.18;

  // Apply before the first flight frame, so the existing shot-shape curve and wind curve blend together in the air.
  ball.flight.endX = clamp(ball.flight.endX + Math.cos(windAngle) * drift, 24, canvas.width - 24);
  ball.flight.endY = clamp(ball.flight.endY + Math.sin(windAngle) * drift * 0.66 - downwindLift, 40, canvas.height - 24);
  ball.flight.curvePixels = (ball.flight.curvePixels || 0) + cross * mph * (1.25 + power * 0.95);
  ball.flight.windAppliedV062 = true;
};

// Disable the v0.58 per-frame endpoint mutation that caused the landing stutter.
const updateFlightBaseV062 = typeof updateFlightBeforeWindV058 === 'function' ? updateFlightBeforeWindV058 : updateFlight;
updateFlight = function updateFlightNoLateWindMutationV062() {
  updateFlightBaseV062();
};

const styleUnifiedTopBarBeforeV062 = typeof styleUnifiedTopBarV061 === 'function' ? styleUnifiedTopBarV061 : function() {};
styleUnifiedTopBarV061 = function styleUnifiedTopBarOrderV062() {
  styleUnifiedTopBarBeforeV062();
  reorderTopBarV062();
  installTopBarShimmerV062();
  installScoreGlowV072();
};

const updateUnifiedTopBarBeforeV062 = typeof updateUnifiedTopBarV060 === 'function' ? updateUnifiedTopBarV060 : function() {};
updateUnifiedTopBarV060 = function updateUnifiedTopBarOrderV062() {
  updateUnifiedTopBarBeforeV062();
  reorderTopBarV062();
  installTopBarShimmerV062();
  installScoreGlowV072();
  runScoreShimmerV061();
};

const drawBeforeTopbarWindV062 = draw;
draw = function drawTopbarWindV062() {
  drawBeforeTopbarWindV062();
  reorderTopBarV062();
  runScoreShimmerV061();
};

setTimeout(() => { reorderTopBarV062(); installTopBarShimmerV062(); installScoreGlowV072(); }, 0);
setTimeout(() => { reorderTopBarV062(); installTopBarShimmerV062(); installScoreGlowV072(); }, 300);
