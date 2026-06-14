// v0.61 themed unified UI, tracer reset fix, and birdie-or-better score shimmer.
// This patch only restyles overlays/controls. It does not resize or reposition the canvas/game tile.

let lastCompletedCountV061 = typeof roundScoresV035 !== 'undefined' ? roundScoresV035.filter(v => v != null).length : 0;
let lastRoundScoreV061 = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
let shimmerUntilV061 = 0;

function themePaletteV061() {
  const fallback = { rough: '#245c30', fairway: '#65a94d', green: '#7ccf62', accent: '#d9f89a' };
  let theme = fallback;
  try {
    if (typeof themeForHoleV046 === 'function' && hole) theme = { ...fallback, ...themeForHoleV046(hole) };
  } catch {}
  const course = activeCourseIdV045 || 'willow';
  const accentByCourse = {
    willow: '#d9f89a',
    coral: '#ffcf8e',
    dunes: '#f3c56d',
    pine: '#9ae282',
    silver: '#b7e6ff'
  };
  return { ...theme, accent: accentByCourse[course] || theme.green || fallback.accent };
}

function hexToRgbV061(hex) {
  const raw = String(hex || '#245c30').replace('#', '').slice(0, 6).padEnd(6, '0');
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16)
  };
}

function rgbaV061(hex, a) {
  const c = hexToRgbV061(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function installShimmerV061() {
  if (typeof scoreCellV060 === 'undefined' || !scoreCellV060.cell) return;
  if (scoreCellV060.cell.querySelector('[data-score-shimmer-v061="true"]')) return;
  scoreCellV060.cell.style.position = 'relative';
  scoreCellV060.cell.style.overflow = 'hidden';
  const beam = document.createElement('div');
  beam.dataset.scoreShimmerV061 = 'true';
  beam.style.cssText = [
    'position:absolute',
    'inset:-30% auto -30% -70%',
    'width:52%',
    'transform:skewX(-22deg)',
    'background:linear-gradient(90deg,transparent,rgba(255,255,255,.72),transparent)',
    'opacity:0',
    'pointer-events:none'
  ].join(';');
  scoreCellV060.cell.appendChild(beam);
}

function triggerScoreShimmerV061() {
  shimmerUntilV061 = performance.now() + 820;
}

function runScoreShimmerV061() {
  installShimmerV061();
  const beam = typeof scoreCellV060 !== 'undefined' ? scoreCellV060.cell.querySelector('[data-score-shimmer-v061="true"]') : null;
  if (!beam) return;
  const left = shimmerUntilV061 - 820;
  const now = performance.now();
  if (now > shimmerUntilV061) {
    beam.style.opacity = '0';
    beam.style.left = '-70%';
    return;
  }
  const t = clamp((now - left) / 820, 0, 1);
  beam.style.opacity = String(Math.sin(t * Math.PI) * 0.85);
  beam.style.left = `${-65 + t * 170}%`;
}

function checkForBirdieScoreChangeV061() {
  if (typeof roundScoresV035 === 'undefined' || typeof ROUND_HOLES_V035 === 'undefined') return;
  const completed = roundScoresV035.filter(v => v != null).length;
  const score = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
  if (completed > lastCompletedCountV061) {
    const holeIndex = completed - 1;
    const strokesTaken = roundScoresV035[holeIndex];
    const par = ROUND_HOLES_V035[holeIndex] && ROUND_HOLES_V035[holeIndex].par ? ROUND_HOLES_V035[holeIndex].par : 4;
    if (strokesTaken != null && strokesTaken < par && score < lastRoundScoreV061) triggerScoreShimmerV061();
  }
  lastCompletedCountV061 = completed;
  lastRoundScoreV061 = score;
}

function styleUnifiedTopBarV061() {
  if (typeof topBarV060 === 'undefined') return;
  const p = themePaletteV061();
  topBarV060.style.height = '54px';
  topBarV060.style.borderRadius = '8px';
  topBarV060.style.gridTemplateColumns = '1.15fr .78fr 1fr 1.22fr';
  topBarV060.style.background = `linear-gradient(140deg, ${rgbaV061(p.rough, .96)} 0%, rgba(4,10,6,.91) 46%, ${rgbaV061(p.fairway, .82)} 140%)`;
  topBarV060.style.border = `1px solid ${rgbaV061(p.accent, .26)}`;
  topBarV060.style.boxShadow = `0 13px 30px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.10), inset 0 -2px 0 ${rgbaV061(p.accent, .08)}`;

  [holeCellV060, scoreCellV060, windCellV060, lieCellV060].forEach(part => {
    if (!part || !part.cell) return;
    part.cell.style.justifyContent = 'flex-start';
    part.cell.style.padding = '6px 8px 5px';
    part.cell.style.borderLeft = part === holeCellV060 ? '0' : `1px solid ${rgbaV061(p.accent, .12)}`;
    part.small.style.marginTop = '0';
    part.small.style.lineHeight = '1';
    part.small.style.color = 'rgba(238,248,216,.66)';
    part.main.style.marginTop = '6px';
    part.main.style.fontSize = '12px';
    part.main.style.lineHeight = '1.08';
    part.sub.style.marginTop = '3px';
    part.sub.style.lineHeight = '1';
  });
  if (lieCellV060 && lieCellV060.main) lieCellV060.main.style.fontSize = '11px';
}

function styleClubPanelV061() {
  const panel = document.querySelector('.club-panel');
  if (!panel) return;
  const p = themePaletteV061();
  panel.style.borderRadius = '8px';
  panel.style.background = `linear-gradient(140deg, ${rgbaV061(p.rough, .95)} 0%, rgba(4,10,6,.9) 52%, ${rgbaV061(p.fairway, .78)} 150%)`;
  panel.style.border = `1px solid ${rgbaV061(p.accent, .22)}`;
  panel.style.boxShadow = `0 13px 30px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.09)`;

  panel.querySelectorAll('button').forEach(btn => {
    const selected = btn.classList.contains('selected');
    btn.style.borderRadius = '6px';
    btn.style.minHeight = '34px';
    btn.style.font = '900 10px system-ui';
    btn.style.border = selected ? `1px solid ${rgbaV061(p.accent, .72)}` : `1px solid ${rgbaV061(p.accent, .12)}`;
    btn.style.background = selected ? `linear-gradient(180deg, ${p.accent}, ${p.green || p.fairway})` : 'linear-gradient(180deg,rgba(238,248,216,.12),rgba(238,248,216,.045))';
    btn.style.color = selected ? '#071007' : 'rgba(236,246,228,.88)';
  });
}

function resetDriverTracerForNewGameV061() {
  if (typeof driverTrailDoneHoleV038 !== 'undefined') driverTrailDoneHoleV038 = -1;
  if (typeof driverTrailArmedV038 !== 'undefined') driverTrailArmedV038 = false;
  if (typeof driverTrailActiveV038 !== 'undefined') driverTrailActiveV038 = false;
  if (typeof driverTrailUntilV038 !== 'undefined') driverTrailUntilV038 = 0;
  if (typeof driverTrailV038 !== 'undefined') driverTrailV038 = [];
}

if (typeof applyCourseV045 === 'function') {
  const applyCourseBeforeThemeV061 = applyCourseV045;
  applyCourseV045 = function applyCourseThemeTracerV061(course) {
    resetDriverTracerForNewGameV061();
    applyCourseBeforeThemeV061(course);
    setTimeout(() => { resetDriverTracerForNewGameV061(); styleUnifiedTopBarV061(); styleClubPanelV061(); }, 0);
  };
}

if (typeof exitToCourseMenuV049 === 'function') {
  const exitToMenuBeforeTracerV061 = exitToCourseMenuV049;
  exitToCourseMenuV049 = function exitToMenuTracerResetV061() {
    resetDriverTracerForNewGameV061();
    exitToMenuBeforeTracerV061();
  };
}

if (typeof resetRoundHoleV035 === 'function') {
  const resetRoundHoleBeforeTracerV061 = resetRoundHoleV035;
  resetRoundHoleV035 = function resetRoundHoleTracerV061(index = roundHoleIndexV035) {
    if (index === 0) resetDriverTracerForNewGameV061();
    resetRoundHoleBeforeTracerV061(index);
    styleUnifiedTopBarV061();
    styleClubPanelV061();
  };
}

const updateUnifiedTopBarBeforeV061 = typeof updateUnifiedTopBarV060 === 'function' ? updateUnifiedTopBarV060 : function() {};
updateUnifiedTopBarV060 = function updateUnifiedTopBarThemedV061() {
  updateUnifiedTopBarBeforeV061();
  styleUnifiedTopBarV061();
  checkForBirdieScoreChangeV061();
  runScoreShimmerV061();
};

const updateHudBeforeThemeV061 = updateHud;
updateHud = function updateHudThemeV061() {
  updateHudBeforeThemeV061();
  styleUnifiedTopBarV061();
  styleClubPanelV061();
  runScoreShimmerV061();
};

const drawBeforeThemeV061 = draw;
draw = function drawThemeV061() {
  drawBeforeThemeV061();
  runScoreShimmerV061();
};

setTimeout(() => { styleUnifiedTopBarV061(); styleClubPanelV061(); installShimmerV061(); }, 0);
setTimeout(() => { styleUnifiedTopBarV061(); styleClubPanelV061(); installShimmerV061(); }, 300);
