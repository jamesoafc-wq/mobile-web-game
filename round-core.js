// ============================================================================
// round-core.js  ·  Stage B of the clean rewrite
// ----------------------------------------------------------------------------
// Consolidates the round/course DATA + STATE engine that was previously spread
// across round-v035.js and the data half of round-v036.js into one coherent
// module:
//   * base hole + clone/util helpers
//   * the hole generator (transformHole) and the par-3 builder
//   * the 9-hole front nine (ROUND_HOLES_V035)
//   * the in-place hole swap (copyHole) that lets a single `hole` object show
//     18 different holes — the mechanism the whole game depends on
//   * scoring + round progression
//   * the slope-read overlay + aim colour (owned here originally; later UI
//     layers wrap them, so they must exist at this point in load order)
//   * water-ripple penalty hook, and the round HUD wrapper
//
// WHAT THIS MODULE DELIBERATELY DOES NOT TOUCH
// --------------------------------------------
// The course MENU (course-menu-v045) and the themed RENDERING + the four extra
// courses (courses-v046) keep loading AFTER this file and keep calling the
// functions defined here (transformHoleV035, makePar3HoleV036,
// getCourseByIdV045 lives in the menu, etc). Their data-build calls still work
// because every public name below is preserved exactly. The per-version UI
// wrappers (scorecard, tracker, driver trail, ball menu, splash, compact score
// in round-v036..v044) also keep loading after and wrapping draw/updateHud as
// before. Those are rendering concerns for Stage C, not round logic.
//
// ARCHITECTURE NOTE (same contract as Stage A engine-core.js)
// -----------------------------------------------------------
// This is a classic global-scope script, NOT a module/IIFE. Later files wrap
// these globals with `const before = fn; fn = function(){ before(); ... }` and
// read bare globals like roundHoleIndexV035 / ROUND_HOLES_V035 directly. All of
// that only works if the names live at the shared script global scope, so we
// declare them exactly as round-v035.js did. The names and their settled
// behaviour are preserved 1:1; the win is that the round engine is now one
// organised file instead of a base file + a partial override file.
// ============================================================================

// ---- Canvas dims + round state (verbatim names) -----------------------------
const ROUND_BASE_HOLE_V035 = JSON.parse(JSON.stringify(HOLES[0]));
const COURSE_W_V035 = 420;
const COURSE_H_V035 = 760;
let roundHoleIndexV035 = 0;
let roundScoresV035 = Array(9).fill(null);
let roundCompleteV035 = false;
let waterRipplesV035 = [];

// ---- Small helpers ----------------------------------------------------------
function cloneV035(value) {
  return JSON.parse(JSON.stringify(value));
}

function roundScoreTextV035(score) {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function rectAroundV035(x, y, w = 82, h = 58) {
  return [
    { x: x - w / 2, y: y + h / 2 },
    { x: x + w / 2, y: y + h / 2 },
    { x: x + w / 2, y: y - h / 2 },
    { x: x - w / 2, y: y - h / 2 }
  ];
}

// ============================================================================
// HOLE GENERATOR
// transformHole warps the base hole into a new layout (sine bend + mirror +
// tilt), repositions tee/cup, and remaps every polygon and prop. Carried over
// verbatim from round-v035 — this is what builds the front nine here and the
// themed courses over in courses-v046.
// ============================================================================
function transformHoleV035(template, cfg) {
  const h = cloneV035(template);
  const amp = cfg.amp || 0;
  const phase = cfg.phase || 0;
  const tilt = cfg.tilt || 0;
  const mirror = !!cfg.mirror;

  function mapPoint(p) {
    let x = mirror ? COURSE_W_V035 - p.x : p.x;
    const y = p.y;
    x += Math.sin(y * 0.015 + phase) * amp;
    x += ((y - 380) / 380) * tilt;
    return { x: clamp(x, 38, COURSE_W_V035 - 38), y: clamp(y, 58, COURSE_H_V035 - 38) };
  }
  function mapPoly(poly) { return poly.map(mapPoint); }

  h.id = cfg.id;
  h.name = `Hole ${cfg.id}`;
  h.par = cfg.par;
  h.start = cfg.tee ? { ...cfg.tee } : mapPoint(h.start);
  h.cup = mapPoint(h.cup);
  if (cfg.cupShift) {
    h.cup.x = clamp(h.cup.x + cfg.cupShift.x, 80, 340);
    h.cup.y = clamp(h.cup.y + cfg.cupShift.y, 90, 245);
  }
  h.tee = cfg.tee ? rectAroundV035(cfg.tee.x, cfg.tee.y) : mapPoly(h.tee);
  h.fairway = mapPoly(h.fairway);
  h.greenRing = mapPoly(h.greenRing);
  h.green = mapPoly(h.green);
  h.water = mapPoly(h.water);
  h.bunkers = h.bunkers.map(mapPoly);
  h.trees = h.trees.map(t => ({ ...t, ...mapPoint(t) }));
  h.props = h.props.map(p => {
    const mapped = { ...p, ...mapPoint(p) };
    if (mapped.type === 'tee_sign_small') mapped.text = `Hole ${cfg.id}`;
    return mapped;
  });
  h.slopeZones = h.slopeZones.map(z => {
    const p = mapPoint(z);
    return {
      ...z,
      x: p.x,
      y: p.y,
      rotation: mirror ? -z.rotation : z.rotation,
      dx: mirror ? -z.dx : z.dx
    };
  });
  return h;
}

// Par-3 hole builder (was defined in round-v036.js; folded here so the round
// engine owns all hole generation in one place). courses-v046 + the willow
// back-nine both call this, so it must exist by this point in load order.
function makePar3HoleV036(id, mirror = false) {
  const sx = x => mirror ? COURSE_W_V035 - x : x;
  const h = cloneV035(ROUND_BASE_HOLE_V035);
  h.id = id;
  h.name = `Hole ${id}`;
  h.par = 3;
  h.start = { x: sx(210), y: 646 };
  h.cup = { x: sx(214), y: 292, r: 4.2 };
  h.tee = rectAroundV035(h.start.x, h.start.y, 82, 56);
  h.fairway = [
    { x: sx(166), y: 666 }, { x: sx(254), y: 666 }, { x: sx(270), y: 616 }, { x: sx(258), y: 558 },
    { x: sx(238), y: 505 }, { x: sx(247), y: 448 }, { x: sx(270), y: 392 }, { x: sx(258), y: 342 },
    { x: sx(231), y: 308 }, { x: sx(198), y: 302 }, { x: sx(169), y: 323 }, { x: sx(152), y: 366 },
    { x: sx(164), y: 424 }, { x: sx(150), y: 486 }, { x: sx(164), y: 552 }, { x: sx(150), y: 616 }
  ];
  h.greenRing = [
    { x: sx(156), y: 314 }, { x: sx(173), y: 284 }, { x: sx(198), y: 264 }, { x: sx(228), y: 258 },
    { x: sx(258), y: 267 }, { x: sx(281), y: 289 }, { x: sx(291), y: 318 }, { x: sx(282), y: 347 },
    { x: sx(258), y: 368 }, { x: sx(226), y: 376 }, { x: sx(195), y: 370 }, { x: sx(170), y: 350 }
  ];
  h.green = [
    { x: sx(169), y: 315 }, { x: sx(184), y: 292 }, { x: sx(205), y: 278 }, { x: sx(228), y: 276 },
    { x: sx(251), y: 284 }, { x: sx(268), y: 302 }, { x: sx(275), y: 324 }, { x: sx(267), y: 344 },
    { x: sx(247), y: 358 }, { x: sx(222), y: 362 }, { x: sx(198), y: 356 }, { x: sx(178), y: 340 }
  ];
  h.bunkers = [
    [ { x: sx(126), y: 302 }, { x: sx(140), y: 276 }, { x: sx(164), y: 268 }, { x: sx(178), y: 286 }, { x: sx(166), y: 312 }, { x: sx(142), y: 320 } ],
    [ { x: sx(270), y: 365 }, { x: sx(293), y: 352 }, { x: sx(318), y: 360 }, { x: sx(326), y: 384 }, { x: sx(306), y: 402 }, { x: sx(279), y: 392 } ]
  ];
  h.water = [
    { x: sx(58), y: 500 }, { x: sx(82), y: 466 }, { x: sx(118), y: 458 }, { x: sx(143), y: 480 },
    { x: sx(146), y: 518 }, { x: sx(124), y: 548 }, { x: sx(88), y: 552 }, { x: sx(60), y: 530 }
  ];
  h.slopeZones = [
    { x: sx(218), y: 315, rx: 76, ry: 36, rotation: mirror ? 0.08 : -0.08, dx: mirror ? -0.32 : 0.32, dy: 0.08, strength: 0.00068 },
    { x: sx(244), y: 288, rx: 44, ry: 22, rotation: mirror ? -0.18 : 0.18, dx: mirror ? 0.28 : -0.28, dy: 0.1, strength: 0.00058 }
  ];
  h.props = [
    { type: 'tee_sign_small', x: sx(136), y: 654, text: `Hole ${id}` },
    { type: 'tee_marker_blue', x: sx(195), y: 648 },
    { type: 'tee_marker_white', x: sx(225), y: 648 },
    { type: 'yardage_marker_100', x: sx(292), y: 458 },
    { type: 'shrub_cluster_a', x: sx(88), y: 506 },
    { type: 'reeds_small', x: sx(77), y: 536 },
    { type: 'rock_small_a', x: sx(319), y: 430 }
  ];
  h.trees = [
    { x: sx(82), y: 650, variant: 'tree_round_oak_a', scale: 1 },
    { x: sx(332), y: 646, variant: 'tree_round_oak_b', scale: 0.96 },
    { x: sx(66), y: 412, variant: 'tree_round_oak_a', scale: 1.08 },
    { x: sx(346), y: 452, variant: 'tree_round_oak_b', scale: 1.02 },
    { x: sx(86), y: 230, variant: 'tree_round_oak_a', scale: 0.98 },
    { x: sx(336), y: 246, variant: 'tree_round_oak_b', scale: 1.06 }
  ];
  return h;
}

// ---- Front nine -------------------------------------------------------------
// Holes 3 and 6 use the dedicated par-3 layout (this is what round-v036 did via
// a post-hoc ROUND_HOLES_V035[2]/[5] reassignment; folded inline here so the
// final nine is correct in one place from the start).
const ROUND_HOLES_V035 = [
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 1, par: 4, amp: 0 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 2, par: 4, mirror: true, amp: 12, phase: 0.7, tilt: -8 }),
  makePar3HoleV036(3, false),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 4, par: 5, amp: 38, phase: 0.5, tilt: -34 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 5, par: 4, mirror: true, amp: 24, phase: 2.2, tee: { x: 212, y: 638 }, cupShift: { x: 10, y: 8 } }),
  makePar3HoleV036(6, true),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 7, par: 5, amp: -36, phase: 2.5, tilt: 32 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 8, par: 4, amp: 18, phase: 3.1, tee: { x: 180, y: 628 }, cupShift: { x: 22, y: 14 } }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 9, par: 4, mirror: true, amp: -28, phase: 1.8, tee: { x: 238, y: 646 }, cupShift: { x: -16, y: 12 } })
];

// ---- In-place hole swap -----------------------------------------------------
// THE critical mechanism: `hole` (declared in engine-core) is a const object
// that is never reassigned. We mutate its CONTENTS so one binding can display
// 18 different holes. Everything downstream reads the same `hole`.
function copyHoleV035(index) {
  const src = cloneV035(ROUND_HOLES_V035[index]);
  Object.keys(hole).forEach(key => delete hole[key]);
  Object.assign(hole, src);
}

function resetRoundHoleV035(index = roundHoleIndexV035) {
  roundHoleIndexV035 = clamp(index, 0, ROUND_HOLES_V035.length - 1);
  copyHoleV035(roundHoleIndexV035);
  strokes = 0;
  ball = {
    x: hole.start.x,
    y: hole.start.y,
    vx: 0,
    vy: 0,
    moving: false,
    flight: null,
    holed: false,
    visualScale: 1,
    radius: 4.6,
    prevX: hole.start.x,
    prevY: hole.start.y
  };
  lastSafe = { x: ball.x, y: ball.y };
  drag = null;
  pendingShot = null;
  skillFeedback = null;
  selectedClub = 'driver';
  message = `Hole ${roundHoleIndexV035 + 1} of 9. Par ${hole.par}.`;
  roundCompleteV035 = false;
  updateClubButtons();
  updateHud();
}

// ---- Scoring ----------------------------------------------------------------
function roundTotalParV035() {
  return ROUND_HOLES_V035.reduce((sum, h) => sum + h.par, 0);
}
function roundCompletedParV035() {
  return ROUND_HOLES_V035.reduce((sum, h, i) => sum + (roundScoresV035[i] == null ? 0 : h.par), 0);
}
function roundCompletedStrokesV035() {
  return roundScoresV035.reduce((sum, value) => sum + (value || 0), 0);
}
function getRoundScoreV035() {
  return roundCompletedStrokesV035() - roundCompletedParV035();
}
function scoreNameV035(strokesTaken, par) {
  const diff = strokesTaken - par;
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double bogey';
  return `+${diff}`;
}

// ---- Progression ------------------------------------------------------------
function goNextHoleV035() {
  if (roundCompleteV035) {
    roundScoresV035 = Array(9).fill(null);
    resetRoundHoleV035(0);
    return;
  }
  if (roundHoleIndexV035 >= ROUND_HOLES_V035.length - 1) {
    roundCompleteV035 = true;
    message = `Round complete. ${roundCompletedStrokesV035()} strokes, ${roundScoreTextV035(getRoundScoreV035())} vs par ${roundTotalParV035()}.`;
    updateHud();
    return;
  }
  resetRoundHoleV035(roundHoleIndexV035 + 1);
}

// ---- Scorecard label + round summary element (DOM, verbatim) ---------------
const scoreCardLabelV035 = document.querySelector('.score-card span');
const roundSummaryElV035 = document.createElement('p');
roundSummaryElV035.className = 'round-summary-v035';
roundSummaryElV035.style.margin = '6px 0 0';
roundSummaryElV035.style.fontSize = '11px';
roundSummaryElV035.style.fontWeight = '800';
roundSummaryElV035.style.color = 'rgba(232,246,222,.78)';
document.querySelector('.top-panel > div:first-child').appendChild(roundSummaryElV035);
if (scoreCardLabelV035) scoreCardLabelV035.textContent = 'Hole strokes';

// ---- Round HUD wrapper ------------------------------------------------------
const updateHudBeforeRoundV035 = updateHud;
updateHud = function updateHudRoundV035() {
  updateHudBeforeRoundV035();
  const currentDiff = strokes - hole.par;
  const roundScore = getRoundScoreV035();
  holeLabelEl.textContent = `${hole.name} of 9 · Par ${hole.par} · Hole ${roundScoreTextV035(currentDiff)}`;
  roundSummaryElV035.textContent = `Round ${roundScoreTextV035(roundScore)} · ${roundCompletedStrokesV035()} strokes through ${roundScoresV035.filter(v => v != null).length} holes · Total par ${roundTotalParV035()}`;
  newHoleButton.textContent = roundCompleteV035 ? 'Restart round' : ball.holed ? 'Next hole' : 'Restart hole';
};

// ---- Score-on-holeout wrapper ----------------------------------------------
const maybeHoleOutBeforeRoundV035 = maybeHoleOut;
maybeHoleOut = function maybeHoleOutRoundV035() {
  const wasHoled = maybeHoleOutBeforeRoundV035();
  if (!wasHoled) return false;
  if (roundScoresV035[roundHoleIndexV035] == null) {
    roundScoresV035[roundHoleIndexV035] = strokes;
    const result = scoreNameV035(strokes, hole.par);
    message = `${result}. Holed in ${strokes} on a par ${hole.par}. ${roundHoleIndexV035 === 8 ? 'Tap to finish the round.' : 'Tap Next hole.'}`;
    updateHud();
  }
  return true;
};

// ---- New-hole button (capturing handler drives progression) ----------------
newHoleButton.addEventListener('click', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (ball.holed || roundCompleteV035) goNextHoleV035();
  else resetRoundHoleV035(roundHoleIndexV035);
}, true);

// ---- Aim colour + slope read (owned here; later UI layers wrap these) -------
function aimColourV035(lie, club) {
  if (club.type === 'putt') return { stroke: 'rgba(88,224,255,0.8)', fill: 'rgba(88,224,255,0.72)' };
  if (lie === 'sand') return { stroke: 'rgba(255,215,116,0.82)', fill: 'rgba(255,215,116,0.74)' };
  return { stroke: 'rgba(255,255,255,0.78)', fill: 'rgba(255,255,255,0.72)' };
}

drawAimLine = function drawAimLineV035() {
  if (!drag || pendingShot || ball.moving || ball.holed) return;
  const lie = getLie();
  const club = clubs[selectedClub];
  let lineYards = getMaxCarry(selectedClub, lie) * drag.power;
  if (selectedClub === 'putter' && typeof getPuttRollYards === 'function') lineYards = getPuttRollYards(lie, drag.power, 1);
  if (lineYards <= 0) return;
  const carryPixels = lineYards / YARDS_PER_PIXEL;
  const endX = ball.x + Math.cos(drag.angle) * carryPixels;
  const endY = ball.y + Math.sin(drag.angle) * carryPixels;
  const colour = aimColourV035(lie, club);
  ctx.save();
  ctx.strokeStyle = colour.stroke;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colour.fill;
  ctx.beginPath();
  ctx.arc(endX, endY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

drawSlopeRead = function drawSlopeReadV035(ctx, hole, timeMs) {
  hole.slopeZones.forEach((z, zi) => {
    const pl = Math.hypot(z.dx, z.dy) || 1;
    const px = z.dx / pl;
    const py = z.dy / pl;
    const r = z.rotation || 0;
    const a = { x: Math.cos(r), y: Math.sin(r), span: z.rx };
    const b = { x: -Math.sin(r), y: Math.cos(r), span: z.ry };
    let ax = Math.abs(a.x * px + a.y * py) >= Math.abs(b.x * px + b.y * py) ? a : b;
    if (ax.x * px + ax.y * py < 0) ax = { x: -ax.x, y: -ax.y, span: ax.span };
    const sx = -ax.y;
    const sy = ax.x;
    const angle = Math.atan2(ax.y, ax.x);
    const strength = clamp((z.strength - 0.00045) / 0.00045, 0.15, 1);
    const area = Math.sqrt(Math.max(1, z.rx * z.ry));
    const lanes = Math.round(clamp(area / 19, 2, 5));
    const count = Math.round(clamp(ax.span / 16 + lanes * 0.4, 4, 8));
    const speed = 0.0002 + strength * 0.00024;
    const len = clamp(ax.span * 1.42, 32, ax.span * 1.55);
    const spread = Math.min(z.ry * 0.96, area * 1.08);
    for (let li = 0; li < lanes; li++) {
      const offset = ((lanes === 1 ? 0.5 : li / (lanes - 1)) - 0.5) * spread;
      for (let mi = 0; mi < count; mi++) {
        const phase = (timeMs * speed + mi / count + li * 0.061 + zi * 0.109) % 1;
        const travel = (phase - 0.5) * len;
        const fade = Math.sin(phase * Math.PI);
        const cx = z.x + ax.x * travel + sx * offset;
        const cy = z.y + ax.y * travel + sy * offset;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.globalAlpha = (0.063 + strength * 0.063) * fade;
        ctx.fillStyle = '#f7fff2';
        ctx.font = '800 9.2px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('›', 0, 0);
        ctx.restore();
      }
    }
  });
};

// ---- Water-ripple penalty hook + draw wrapper ------------------------------
const applyPenaltyBeforeRoundV035 = applyPenalty;
applyPenalty = function applyPenaltyRoundV035(text) {
  if (String(text).toLowerCase().includes('water')) waterRipplesV035.push({ x: ball.x, y: ball.y, startedAt: performance.now() });
  applyPenaltyBeforeRoundV035(text);
};

function drawWaterRipplesV035() {
  if (!waterRipplesV035.length) return;
  const cam = getCamera();
  const now = performance.now();
  waterRipplesV035 = waterRipplesV035.filter(ripple => now - ripple.startedAt < 900);
  waterRipplesV035.forEach(ripple => {
    const t = clamp((now - ripple.startedAt) / 900, 0, 1);
    const x = ripple.x * cam.zoom + cam.tx;
    const y = ripple.y * cam.zoom + cam.ty;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = (1 - t) * 0.36;
    ctx.strokeStyle = 'rgba(210,244,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 8 + t * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, 3 + t * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

const drawBeforeRoundV035 = draw;
draw = function drawRoundV035() {
  drawBeforeRoundV035();
  drawWaterRipplesV035();
};

// ---- v0.35 build badge (kept; later versions stack their own) --------------
const drawOverlayBeforeBuildV035 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV035() {
  drawOverlayBeforeBuildV035();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = canvas.width / 2;
  const y = 17;
  const w = 48;
  const h = 14;
  ctx.fillStyle = 'rgba(4,10,6,0.86)';
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(221,238,210,0.88)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.35', x, y + 0.5);
  ctx.restore();
};

// ---- Boot the first hole ----------------------------------------------------
resetRoundHoleV035(0);
