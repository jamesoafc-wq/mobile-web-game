// ============================================================================
// engine-core.js  ·  Stage A of the clean rewrite
// ----------------------------------------------------------------------------
// Replaces the tangled physics chain previously spread across FOUR files:
//   game.js + active-tuning.js + putting-physics-v027.js + shot-shape-v031.js
//
// It reproduces the SETTLED runtime behaviour of those four (the values that
// actually won at load order), but as ONE coherent system instead of three
// putting engines re-scaling each other every frame.
//
// ARCHITECTURE NOTE
// -----------------
// The rest of the game (round-*, course-*, camera-*, wind-*, graphics-*) is
// built by reassigning bare global functions, e.g.:
//     const before = updateHud; updateHud = function(){ before(); ... };
// and by reading/writing bare global state (hole, ball, strokes, ...).
// That only works if those names live at GLOBAL scope (classic script, not a
// module, not an IIFE). So this file deliberately declares the same globals the
// old game.js did, the same way, so all ~40 later layers remain valid drop-ins.
// The loop dispatches through the CURRENT global functions each frame, so later
// wrappers keep taking effect exactly as before. The "clean" part is that the
// physics/putting logic is now one organised system, not a contradictory pile.
// ============================================================================

// ---- DOM --------------------------------------------------------------------
const canvas = document.getElementById('course');
const ctx = canvas.getContext('2d');
const holeLabelEl = document.getElementById('holeLabel');
const strokesEl = document.getElementById('strokes');
const lieEl = document.getElementById('lie');
const clubEl = document.getElementById('club');
const distanceEl = document.getElementById('distance');
const powerEl = document.getElementById('power');
const hintEl = document.getElementById('hint');
const resetShotButton = document.getElementById('resetShot');
const newHoleButton = document.getElementById('newHole');
const clubButtons = [...document.querySelectorAll('.club-panel button')];

// ---- Static tables (carried over verbatim) ---------------------------------
const clubs = {
  driver: { short: 'Driver', type: 'full', accuracy: 12,   flightHeight: 0.28, rollBias: 1.1,  carry: { tee: 285, fairway: 45,  rough: 15,  sand: 0,  fringe: 8,  green: 8 } },
  wood3:  { short: '3W',     type: 'full', accuracy: 10.5, flightHeight: 0.24, rollBias: 1.02, carry: { tee: 245, fairway: 75,  rough: 25,  sand: 0,  fringe: 10, green: 10 } },
  iron5:  { short: '5I',     type: 'full', accuracy: 7.4,  flightHeight: 0.22, rollBias: 0.88, carry: { tee: 185, fairway: 175, rough: 125, sand: 35, fringe: 18, green: 18 } },
  iron7:  { short: '7I',     type: 'full', accuracy: 6.2,  flightHeight: 0.24, rollBias: 0.78, carry: { tee: 155, fairway: 145, rough: 110, sand: 45, fringe: 16, green: 16 } },
  wedgeP: { short: 'PW',     type: 'full', accuracy: 5.2,  flightHeight: 0.3,  rollBias: 0.48, carry: { tee: 108, fairway: 102, rough: 82,  sand: 55, fringe: 12, green: 12 } },
  wedgeS: { short: 'SW',     type: 'full', accuracy: 6.6,  flightHeight: 0.34, rollBias: 0.24, carry: { tee: 84,  fairway: 78,  rough: 62,  sand: 70, fringe: 10, green: 10 } },
  putter: { short: 'Putter', type: 'putt', accuracy: 2.5,  flightHeight: 0,    rollBias: 1,    carry: { tee: 24,  fairway: 22,  rough: 8,   sand: 0,  fringe: 26, green: 45 } }
};

const surfaceLabels = {
  tee: 'Tee', fairway: 'Fairway', rough: 'Rough', fringe: 'Fringe',
  green: 'Green', sand: 'Bunker', water: 'Water'
};

const rollFriction = {
  rough: 0.972, fairway: 0.982, tee: 0.982, fringe: 0.973,
  green: 0.989, sand: 0.72, water: 1
};

const clubDifficulty = {
  driver: 0.92, wood3: 0.82, iron5: 0.44, iron7: 0.34,
  wedgeP: 0.38, wedgeS: 0.58, putter: 0.24
};

const surfaceDifficulty = {
  tee: 0.02, fairway: 0.12, rough: 0.38, sand: 0.62,
  fringe: 0.12, green: 0.08, water: 1
};

// ---- Mutable game state (bare globals, exactly like old game.js) ------------
// `hole` is a single object whose CONTENTS are swapped in place by the round
// engine (copyHoleV035 deletes keys then Object.assigns). The binding must
// never change, so it stays `const` and is seeded from HOLES[0].
const hole = HOLES[0];
let selectedClub = 'driver';
let strokes = 0;
let message = 'Play the hole.';
let ball;
let lastSafe;
let drag = null;
let pendingShot = null;
let skillFeedback = null;
let virtualDrag = null;

// ---- Geometry / lie helpers -------------------------------------------------
function getLie() {
  return getSurfaceAtPoint(hole, ball.x, ball.y);
}
function surfaceAt(x, y) {
  return getSurfaceAtPoint(hole, x, y);
}
function isPuttingLieNow() {
  const lie = getLie();
  return lie === 'green' || lie === 'fringe';
}
function getDistanceToCupYards() {
  return Math.round(dist(ball.x, ball.y, hole.cup.x, hole.cup.y) * YARDS_PER_PIXEL);
}
function getMaxCarry(clubKey, lie) {
  return clubs[clubKey].carry[lie] ?? clubs[clubKey].carry.fairway ?? 0;
}

// ---- Canonical green-slope sampler (single signature: hole, x, y) -----------
// The old code had two conflicting definitions. This is the authoritative one;
// surface-rendering.js already uses this signature.
function getGreenSlopeAt(holeRef, x, y) {
  const point = { x, y };
  if (!pointInPolygon(point, holeRef.green)) return { x: 0, y: 0, strength: 0 };
  let slopeX = 0;
  let slopeY = 0;
  (holeRef.slopeZones || []).forEach(zone => {
    const cos = Math.cos(zone.rotation || 0);
    const sin = Math.sin(zone.rotation || 0);
    const dx = x - zone.x;
    const dy = y - zone.y;
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    const amount = (localX * localX) / (zone.rx * zone.rx) + (localY * localY) / (zone.ry * zone.ry);
    if (amount > 1) return;
    const falloff = Math.pow(1 - amount, 1.2);
    const len = Math.hypot(zone.dx, zone.dy) || 1;
    slopeX += (zone.dx / len) * zone.strength * falloff;
    slopeY += (zone.dy / len) * zone.strength * falloff;
  });
  return { x: slopeX, y: slopeY, strength: Math.hypot(slopeX, slopeY) };
}

// ---- Camera (active-tuning live values: lie-based view, zoom 2.35) ----------
function isPuttingView() {
  return isPuttingLieNow() && !ball.holed;
}
function getCamera() {
  if (!isPuttingView()) return { zoom: 1, tx: 0, ty: 0 };
  const zoom = 2.35;
  const centerX = ball.x * 0.46 + hole.cup.x * 0.54;
  const centerY = ball.y * 0.46 + hole.cup.y * 0.54;
  return {
    zoom,
    tx: clamp(canvas.width / 2 - centerX * zoom, canvas.width - canvas.width * zoom, 0),
    ty: clamp(canvas.height * 0.52 - centerY * zoom, canvas.height - canvas.height * zoom, 0)
  };
}

// ============================================================================
// UNIFIED PUTTING MODEL
// One source of truth for putt distance and launch. Values match the model
// that was actually LIVE at runtime — putting-physics-v027.js, which loaded
// last and overrode the earlier active-tuning numbers. The whole point of the
// old chain's bug was that active-tuning computed a putt with one set of
// numbers (green 100 / fringe 84, exp 0.82) and then v027 recomputed it with
// another (green 65 / fringe 52, exp 1.2, boost 0.99). v027 won. Here it is
// computed exactly once, with v027's settled values.
// ============================================================================
function getEffectivePuttYards(lie) {
  if (lie === 'green') return 65;
  if (lie === 'fringe') return 52;
  return (clubs.putter.carry && clubs.putter.carry[lie]) || 29;
}
function getPuttPowerCurve(power) {
  return Math.pow(clamp(power, 0, 1), 1.2);
}
function getPuttRollYards(lie, power, contactMultiplier = 1) {
  return getEffectivePuttYards(lie) * getPuttPowerCurve(power) * contactMultiplier;
}
function getPuttLaunchSpeed(lie, rollYards) {
  const friction = rollFriction[lie] ?? rollFriction.green;
  const rollPixels = rollYards / YARDS_PER_PIXEL;
  return rollPixels * (1 - friction) * 0.99;
}
function getPuttBreakForce(speed) {
  return clamp(0.92 - speed * 0.75, 0.16, 0.76);
}

// ---- Cup capture ------------------------------------------------------------
function getCupCaptureRadius() {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (!isPuttingView()) return 1.4;
  if (speed > 0.58) return 0.6;
  if (speed > 0.28) return 2.8;
  return 6.2;
}
function maybeHoleOut() {
  const radius = getCupCaptureRadius();
  const d = dist(ball.x, ball.y, hole.cup.x, hole.cup.y);
  if (d <= radius) {
    ball.holed = true;
    ball.moving = false;
    ball.vx = 0;
    ball.vy = 0;
    ball.flight = null;
    ball.x = hole.cup.x;
    ball.y = hole.cup.y;
    message = `Holed out in ${strokes} ${strokes === 1 ? 'stroke' : 'strokes'}!`;
    updateHud();
    return true;
  }
  return false;
}

// ---- Shot setup + skill timing ----------------------------------------------
function startSkillShot(pointer) {
  if (!drag || ball.moving || ball.holed || pendingShot) return;
  const pullX = ball.x - pointer.x;
  const pullY = ball.y - pointer.y;
  const power = clamp(Math.hypot(pullX, pullY) / 120, 0, 1);
  drag = null;
  if (power < 0.06) {
    message = 'Pull farther back to take a shot.';
    updateHud();
    return;
  }
  const lie = getLie();
  const maxCarry = getMaxCarry(selectedClub, lie);
  if (maxCarry <= 0) {
    message = `${clubs[selectedClub].short} is not usable from ${surfaceLabels[lie]}.`;
    updateHud();
    return;
  }
  const difficulty = clamp((clubDifficulty[selectedClub] ?? 0.5) + (surfaceDifficulty[lie] ?? 0.2) + power * 0.18, 0.08, 1);
  pendingShot = {
    power,
    baseAngle: Math.atan2(pullY, pullX),
    lie,
    clubKey: selectedClub,
    maxCarry,
    difficulty,
    sweetWidth: clamp(0.34 - difficulty * 0.24, 0.07, 0.31),
    startedAt: performance.now(),
    speed: 0.72 + difficulty * 1.05
  };
  message = `${clubs[selectedClub].short} from ${surfaceLabels[lie]}: tap the strike marker in the green zone.`;
  updateHud();
}

function getSkillMarkerPosition() {
  if (!pendingShot) return 0.5;
  const elapsed = (performance.now() - pendingShot.startedAt) / 1000;
  const phase = (elapsed * pendingShot.speed) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

// Full-shot shape model (shot-shape-v031 — the live full-shot resolver).
function getFullShotShapeFromStrike(shot, marker) {
  const halfSweet = shot.sweetWidth / 2;
  const middleWidth = clamp(shot.sweetWidth + 0.28 - shot.difficulty * 0.06, shot.sweetWidth + 0.14, 0.48);
  const halfMiddle = middleWidth / 2;
  const error = marker - 0.5;
  const absError = Math.abs(error);
  const side = Math.sign(error) || 1;

  if (absError <= halfSweet) {
    return { zone: 'sweet', label: 'Perfect strike', carryMultiplier: 1, startLineDeg: 0, finalCurvePixels: side * shot.difficulty * 1.5 };
  }
  if (absError <= halfMiddle) {
    const miss = clamp((absError - halfSweet) / Math.max(0.01, halfMiddle - halfSweet), 0, 1);
    const movingRight = side > 0;
    return {
      zone: 'middle',
      label: movingRight ? 'Gentle fade' : 'Gentle draw',
      carryMultiplier: clamp(0.99 - miss * 0.07, 0.9, 0.99),
      startLineDeg: side * (0.8 + miss * 1.5),
      finalCurvePixels: side * (6 + miss * 18 + shot.difficulty * 6)
    };
  }
  const miss = clamp((absError - halfMiddle) / Math.max(0.01, 0.5 - halfMiddle), 0, 1);
  const movingRight = side > 0;
  return {
    zone: 'bad',
    label: miss > 0.55 ? (movingRight ? 'Big slice' : 'Big hook') : (movingRight ? 'Leaky fade' : 'Strong draw'),
    carryMultiplier: clamp(0.9 - miss * (0.14 + shot.difficulty * 0.16), 0.58, 0.88),
    startLineDeg: side * (1.4 + miss * 3.6 + shot.difficulty * 1.4),
    finalCurvePixels: side * (18 + miss * 58 + shot.difficulty * 28)
  };
}

// SINGLE resolver. Branches once on club type. No post-hoc re-scaling pass.
function resolveSkillShot() {
  if (!pendingShot) return;
  const shot = pendingShot;
  const club = clubs[shot.clubKey];
  const marker = getSkillMarkerPosition();
  if (club.type === 'putt') resolvePutt(shot, marker);
  else resolveFullShot(shot, marker);
}

// --- Putt resolution (replaces the v027 + active-tuning double-resolve) ------
function resolvePutt(shot, marker) {
  const halfSweet = shot.sweetWidth / 2;
  const middleWidth = clamp(shot.sweetWidth + 0.28 - shot.difficulty * 0.06, shot.sweetWidth + 0.14, 0.48);
  const halfMiddle = middleWidth / 2;
  const error = marker - 0.5;
  const absError = Math.abs(error);
  const side = Math.sign(error) || 1;

  let label = 'Perfect pace';
  let contactMultiplier = 1;
  let angleOffsetDeg = 0;
  let zone = 'sweet';

  if (absError <= halfSweet) {
    label = 'Perfect pace';
    zone = 'sweet';
  } else if (absError <= halfMiddle) {
    const miss = clamp((absError - halfSweet) / Math.max(0.01, halfMiddle - halfSweet), 0, 1);
    label = 'Slight misread';
    zone = 'middle';
    contactMultiplier = 0.94 - miss * 0.08;
    angleOffsetDeg = side * (0.45 + miss * 1.35);
  } else {
    const miss = clamp((absError - halfMiddle) / Math.max(0.01, 0.5 - halfMiddle), 0, 1);
    label = side < 0 ? 'Pulled putt' : 'Pushed putt';
    zone = 'bad';
    contactMultiplier = clamp(0.82 - miss * 0.16, 0.62, 0.82);
    angleOffsetDeg = side * (1.7 + miss * 3.8);
  }

  const random = (Math.random() + Math.random()) / 2 - 0.5;
  const angle = shot.baseAngle + radians(angleOffsetDeg + random * 0.45);
  const rollYards = getPuttRollYards(shot.lie, shot.power, contactMultiplier);
  const speed = getPuttLaunchSpeed(shot.lie, rollYards);

  skillFeedback = { label, zone, startedAt: performance.now() };
  strokes += 1;
  lastSafe = { x: ball.x, y: ball.y };

  if (speed <= 0.006) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    message = 'Barely tapped it. Read the slope and try again.';
  } else {
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.moving = true;
    ball.flight = null;
    message = `${label}. Putt for ${Math.round(rollYards)} yd.`;
  }
  pendingShot = null;
  updateHud();
}

// --- Full-shot resolution (shot-shape-v031 model) ----------------------------
function resolveFullShot(shot, marker) {
  const club = clubs[shot.clubKey];
  const shape = getFullShotShapeFromStrike(shot, marker);
  const random = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  const lieFactor = surfaceDifficulty[shot.lie] ?? 0.2;
  const randomOffset = random * club.accuracy * (0.25 + shot.power * 0.55) * (0.65 + lieFactor);
  const baseAngle = shot.baseAngle + radians(shape.startLineDeg + randomOffset);
  const carryYards = shot.maxCarry * shot.power * shape.carryMultiplier;
  const carryPixels = carryYards / YARDS_PER_PIXEL;
  const startX = ball.x;
  const startY = ball.y;
  const baseEndX = startX + Math.cos(baseAngle) * carryPixels;
  const baseEndY = startY + Math.sin(baseAngle) * carryPixels;
  const perpX = -Math.sin(baseAngle);
  const perpY = Math.cos(baseAngle);
  const finalCurvePixels = shape.finalCurvePixels;
  const endX = baseEndX + perpX * finalCurvePixels;
  const endY = baseEndY + perpY * finalCurvePixels;
  const landingAngle = Math.atan2(endY - startY, endX - startX);

  skillFeedback = { label: shape.label, zone: shape.zone, startedAt: performance.now() };
  strokes += 1;
  lastSafe = { x: startX, y: startY };
  ball.moving = true;
  ball.flight = {
    shapeV031: true,   // kept so wind-flight-v058 recognises the flight object
    startX, startY,
    baseEndX, baseEndY,
    endX, endY,
    angle: baseAngle,
    landingAngle,
    progress: 0,
    duration: clamp(22 + carryPixels / 7, 22, 68),
    carryYards,
    finalCurvePixels,
    height: club.flightHeight,
    clubKey: shot.clubKey
  };
  message = `${shape.label}. Carry ${Math.round(carryYards)} yd.`;
  pendingShot = null;
  updateHud();
}

// ---- Landing roll (active-tuning approach-release model) --------------------
function startLandingRoll(angle, lie, carryYards, clubKey) {
  const club = clubs[clubKey];
  if (lie === 'water') {
    applyPenalty('Water hazard. One-stroke penalty.');
    return;
  }
  if (lie === 'sand') {
    ball.moving = false;
    ball.vx = 0;
    ball.vy = 0;
    message = 'Plugged in the bunker. Almost no bounce or roll.';
    updateHud();
    return;
  }
  const approachRollFactor = ({ tee: 0.16, fairway: 0.18, rough: 0.065, fringe: 0.16, green: 0.24 }[lie] ?? 0.11);
  const clubRelease = club.rollBias || 0.5;
  const randomness = 0.88 + Math.random() * 0.24;
  const rollYards = carryYards * clubRelease * approachRollFactor * randomness;
  const rollPixels = rollYards / YARDS_PER_PIXEL;
  const surfaceFriction = rollFriction[lie] ?? 0.98;
  const releaseBoost = lie === 'green' ? 1.28 : lie === 'fringe' ? 1.18 : 1.08;
  const speed = rollPixels * (1 - surfaceFriction) * releaseBoost;

  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.moving = speed > 0.012;

  if (!ball.moving) {
    lastSafe = { x: ball.x, y: ball.y };
  } else if (lie === 'green' || lie === 'fringe') {
    message = 'Landed on the green and released.';
    updateHud();
  }
}

// ---- Flight integrator (shot-shape-v031 curved flight) ----------------------
function updateFlight() {
  if (!ball.flight) return;
  const shot = ball.flight;
  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  const arc = Math.sin(t * Math.PI);
  const baseX = lerp(shot.startX, shot.baseEndX, ease);
  const baseY = lerp(shot.startY, shot.baseEndY, ease);
  const bend = Math.pow(ease, 1.65);
  const perpX = -Math.sin(shot.angle);
  const perpY = Math.cos(shot.angle);

  ball.x = baseX + perpX * shot.finalCurvePixels * bend;
  ball.y = baseY + perpY * shot.finalCurvePixels * bend;

  // WIND DRIFT: applied progressively so the ball is gradually carried. The
  // drift grows with the square of flight progress (negligible at first, full
  // by landing), which reads as a natural "taken by the wind" path and blends
  // smoothly with the shot's own hook/slice curve above.
  if (shot.windX || shot.windY) {
    const wind = ease * ease;
    ball.x += shot.windX * wind;
    ball.y += shot.windY * wind;
  }
  ball.visualScale = 1 + arc * shot.height;

  if (t >= 1) {
    ball.x = clamp(shot.endX + (shot.windX || 0), 18, canvas.width - 18);
    ball.y = clamp(shot.endY + (shot.windY || 0), 34, canvas.height - 18);
    ball.flight = null;
    ball.visualScale = 1;
    startLandingRoll(shot.landingAngle, getLie(), shot.carryYards, shot.clubKey);
  }
}

// ---- Roll integrator -------------------------------------------------------
// Reproduces the EXACT per-frame ordering the original chain produced across
// three layers (game.js base updateRoll -> active-tuning settle -> v027
// applyPuttBreak), but in one readable function:
//   1. integrate position
//   2. hazard checks (water / sand)
//   3. break component 1 (base game.js formula)
//   4. friction
//   5. hole-out check
//   6. settle on green (0.052 stop / 0.095 damp), then hard stop < 0.025
//   7. break component 2 (v027 applyPuttBreak) — applied AFTER friction, so it
//      is not frictioned until the next frame, exactly as the wrapper did.
function updateRoll() {
  if (!ball.moving || ball.flight || ball.holed) return;
  ball.prevX = ball.x;
  ball.prevY = ball.y;
  ball.x += ball.vx;
  ball.y += ball.vy;

  const lie = getLie();
  if (lie === 'water') {
    applyPenalty('Water hazard. One-stroke penalty.');
    return;
  }
  if (lie === 'sand') {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    message = 'Ball stopped in the bunker.';
    updateHud();
    return;
  }

  // (3) green break — single, gravity-style, speed-scaled.
  // Uses the height-field model (slope-field.js) when present: the ball rolls
  // down the gradient of the green's surface, and fast putts hold their line
  // while dying putts take the full break. Falls back to the legacy sampler if
  // the field module hasn't loaded.
  if (lie === 'green' || lie === 'fringe') {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0.004) {
      if (typeof greenBreakAccel === 'function') {
        const a = greenBreakAccel(hole, ball.x, ball.y, speed, ball.vx, ball.vy);
        ball.vx += a.x;
        ball.vy += a.y;
      } else {
        const slope = getGreenSlopeAt(hole, ball.x, ball.y);
        if (slope.strength > 0.00004 && speed > 0.052) {
          const breakForce = clamp(0.62 - speed * 0.32, 0.16, 0.64);
          ball.vx += slope.x * breakForce;
          ball.vy += slope.y * breakForce;
        }
      }
    }
  }

  // (4) friction.
  const friction = rollFriction[lie] ?? 0.98;
  ball.vx *= friction;
  ball.vy *= friction;

  // (5) hole-out.
  if (maybeHoleOut()) return;

  // (6) settle on green.
  stopBallOnGreenIfSlow();
  if (ball.moving && Math.hypot(ball.vx, ball.vy) < 0.025 && !ball.holed) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
  }

  // (7) legacy second break — only used as a fallback when the height-field
  // model is NOT loaded (it reproduced the original game's double-break). With
  // slope-field.js present, break is fully handled once in step (3), so this is
  // skipped to avoid double-applying.
  if (typeof greenBreakAccel !== 'function' && ball.moving && !ball.flight && !ball.holed) {
    const lie2 = getLie();
    if (lie2 === 'green' || lie2 === 'fringe') {
      const slope = getGreenSlopeAt(hole, ball.x, ball.y);
      const speed = Math.hypot(ball.vx, ball.vy);
      if (slope && slope.strength > 0.000025 && speed > 0.004) {
        const force = getPuttBreakForce(speed);
        ball.vx += slope.x * force;
        ball.vy += slope.y * force;
      }
    }
  }
}

// Settle thresholds carried verbatim from the original base game.js.
function stopBallOnGreenIfSlow() {
  if (!ball.moving || ball.holed || ball.flight) return;
  const lie = getLie();
  if (lie !== 'green' && lie !== 'fringe') return;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < 0.052) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    message = 'Ball has settled on the green. Read the slope and pace.';
    updateHud();
  } else if (speed < 0.095) {
    ball.vx *= 0.76;
    ball.vy *= 0.76;
  }
}

// ---- HUD + penalties --------------------------------------------------------
// Score-phrase helpers. These originally lived in active-tuning.js (which this
// module replaced) and are consumed by later HUD layers such as ui-polish.js
// via getTopRightScoreText(). Reproduced verbatim so those layers keep working.
function getScorePhrase(scoreToPar) {
  if (scoreToPar <= -3) return 'For Albatross';
  if (scoreToPar === -2) return 'For Eagle';
  if (scoreToPar === -1) return 'For Birdie';
  if (scoreToPar === 0) return 'For Par';
  if (scoreToPar === 1) return 'For Bogey';
  if (scoreToPar === 2) return 'For Double Bogey';
  if (scoreToPar === 3) return 'For Triple Bogey';
  return `For +${scoreToPar}`;
}
function getCurrentScorePhrase(scoreToPar) {
  if (scoreToPar <= -3) return 'Albatross';
  if (scoreToPar === -2) return 'Eagle';
  if (scoreToPar === -1) return 'Birdie';
  if (scoreToPar === 0) return 'Par';
  if (scoreToPar === 1) return 'Bogey';
  if (scoreToPar === 2) return 'Double Bogey';
  if (scoreToPar === 3) return 'Triple Bogey';
  return `+${scoreToPar}`;
}
function getTopRightScoreText() {
  if (ball && ball.holed) return getCurrentScorePhrase(strokes - hole.par);
  return getScorePhrase((strokes + 1) - hole.par);
}

function updateClubButtons() {
  clubButtons.forEach(btn => btn.classList.toggle('selected', btn.dataset.club === selectedClub));
}
function updateHud() {
  holeLabelEl.textContent = `${hole.name} · Par ${hole.par}`;
  strokesEl.textContent = String(strokes);
  lieEl.textContent = surfaceLabels[getLie()];
  clubEl.textContent = clubs[selectedClub].short;
  distanceEl.textContent = `${getDistanceToCupYards()} yd`;
  if (drag) powerEl.textContent = `${Math.round(drag.power * 100)}%`;
  else if (pendingShot) powerEl.textContent = 'Timing';
  else powerEl.textContent = '0%';
  hintEl.textContent = message;
}
function applyPenalty(text) {
  strokes += 1;
  ball.x = lastSafe.x;
  ball.y = lastSafe.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.moving = false;
  ball.flight = null;
  ball.visualScale = 1;
  ball.prevX = ball.x;
  ball.prevY = ball.y;
  message = text;
  updateHud();
}

// ---- Drawing (base layer; later layers wrap draw/drawOverlayInfo/etc) --------
function drawBall() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + 5, ball.radius * 1.1, ball.radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * ball.visualScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(ball.x - 1.3, ball.y - 1.6, Math.max(1.3, ball.radius * 0.24), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAimLine() {
  if (!drag || pendingShot || ball.moving || ball.holed) return;
  const lie = getLie();
  const club = clubs[selectedClub];
  let lineYards = getMaxCarry(selectedClub, lie) * drag.power;
  if (selectedClub === 'putter') {
    lineYards = getEffectivePuttYards(lie) * getPuttPowerCurve(drag.power) * 1.08;
  }
  if (lineYards <= 0) return;
  const carryPixels = lineYards / YARDS_PER_PIXEL;
  const endX = ball.x + Math.cos(drag.angle) * carryPixels;
  const endY = ball.y + Math.sin(drag.angle) * carryPixels;
  ctx.save();
  ctx.strokeStyle = club.type === 'putt' ? 'rgba(255,255,255,0.7)' : 'rgba(255,247,167,0.78)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(endX, endY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getSkillPanelRect() {
  const panelW = Math.min(350, canvas.width - 24);
  const panelH = 94;
  const panelX = (canvas.width - panelW) / 2;
  const panelY = Math.max(84, canvas.height - 198);
  return { x: panelX, y: panelY, w: panelW, h: panelH };
}
function getStrikeCancelButton() {
  const panel = getSkillPanelRect();
  // sit just ABOVE the meter panel, right-aligned, so it never overlaps the
  // track, zones, marker or legend of the redesigned swing meter.
  const w = 74, h = 22;
  return { x: panel.x + panel.w - w, y: panel.y - h - 8, w: w, h: h };
}
function drawStrikeCancelButton() {
  if (!pendingShot) return;
  const button = getStrikeCancelButton();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(28, 38, 31, 0.94)';
  roundRect(ctx, button.x, button.y, button.w, button.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  ctx.fillStyle = '#f6e6d8';
  ctx.font = '800 9.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cancel', button.x + button.w / 2, button.y + button.h / 2 + 0.5);
  ctx.restore();
}
function drawSkillBar() {
  if (!pendingShot) return;
  const marker = getSkillMarkerPosition();
  const panel = getSkillPanelRect();
  const barX = panel.x + 22;
  const barY = panel.y + 38;
  const barW = panel.w - 44;
  const barH = 16;
  const middleWidth = clamp(pendingShot.sweetWidth + 0.28 - pendingShot.difficulty * 0.06, pendingShot.sweetWidth + 0.14, 0.48);
  const middleX = barX + (0.5 - middleWidth / 2) * barW;
  const sweetX = barX + (0.5 - pendingShot.sweetWidth / 2) * barW;
  const markerX = barX + marker * barW;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(7, 13, 7, 0.93)';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '800 13px system-ui';
  ctx.fillText(`${clubs[pendingShot.clubKey].short} from ${surfaceLabels[pendingShot.lie]} · tap green`, canvas.width / 2, panel.y + 21);

  ctx.fillStyle = 'rgba(255,92,92,0.58)';
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,205,86,0.78)';
  roundRect(ctx, middleX, barY, middleWidth * barW, barH, 8);
  ctx.fill();
  ctx.fillStyle = '#72dd66';
  roundRect(ctx, sweetX, barY - 2, pendingShot.sweetWidth * barW, barH + 4, 9);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(markerX, barY - 8);
  ctx.lineTo(markerX, barY + barH + 8);
  ctx.stroke();

  ctx.fillStyle = '#d7eac8';
  ctx.font = '700 10px system-ui';
  ctx.fillText('green = sweet · yellow = safe · red = bad', canvas.width / 2 + 34, panel.y + 77);
  ctx.restore();

  drawStrikeCancelButton();
}

function drawSkillFeedback() {
  if (!skillFeedback) return;
  const age = performance.now() - skillFeedback.startedAt;
  if (age > 1400) { skillFeedback = null; return; }
  const t = clamp(age / 1400, 0, 1);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = skillFeedback.zone === 'sweet' ? '#9cf28f' : skillFeedback.zone === 'middle' ? '#ffd074' : '#ff8f8f';
  ctx.font = '900 18px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(skillFeedback.label, canvas.width / 2, canvas.height / 2 - 40 - t * 18);
  ctx.restore();
}

// Base in-canvas HUD (active-tuning version). Later layers wrap this.
function drawOverlayInfo() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(8, 18, 9, 0.78)';
  roundRect(ctx, 8, 8, canvas.width - 16, 54, 16);
  ctx.fill();
  ctx.fillStyle = '#eef8c8';
  ctx.font = '900 11px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${hole.name} · Par ${hole.par}`, 22, 23);
  ctx.font = '800 10px system-ui';
  ctx.fillText(`${surfaceLabels[getLie()]} · ${clubs[selectedClub].short}`, 22, 42);
  ctx.textAlign = 'center';
  ctx.font = '900 12px system-ui';
  ctx.fillText(`${getDistanceToCupYards()} yd`, canvas.width / 2, 32);
  ctx.textAlign = 'right';
  ctx.font = '900 11px system-ui';
  ctx.fillText(`Strokes ${strokes}`, canvas.width - 22, 24);
  if (isPuttingView()) {
    ctx.fillStyle = 'rgba(238,248,200,0.16)';
    roundRect(ctx, canvas.width - 118, 66, 104, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#eef8c8';
    ctx.textAlign = 'center';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Putting zoom', canvas.width - 66, 82);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cam = getCamera();
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
  drawCourse(ctx, hole, canvas.width, canvas.height, performance.now(), isPuttingView());
  // (slope read is now drawn inside drawCourse — full when putting, subtle when
  // approaching off the green — so no separate call is needed here.)
  drawAimLine();
  drawBall();
  ctx.restore();
  drawOverlayInfo();
  drawSkillBar();
  drawSkillFeedback();
}

// The loop dispatches through the CURRENT global functions each frame, so any
// later layer that reassigns updateRoll/updateFlight/updateHud/draw still wins.
function loop() {
  updateFlight();
  updateRoll();
  updateHud();
  draw();
  requestAnimationFrame(loop);
}

// ---- Hole reset -------------------------------------------------------------
function resetHole() {
  strokes = 0;
  ball = {
    x: hole.start.x, y: hole.start.y,
    vx: 0, vy: 0,
    moving: false, flight: null, holed: false,
    visualScale: 1, radius: 4.6,
    prevX: hole.start.x, prevY: hole.start.y
  };
  lastSafe = { x: ball.x, y: ball.y };
  drag = null;
  pendingShot = null;
  skillFeedback = null;
  selectedClub = 'driver';
  message = 'Pull back from the ball to line up your tee shot.';
  updateClubButtons();
  updateHud();
}

// ---- Input (single clean handler set) ---------------------------------------
function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}
function cancelPendingShot() {
  pendingShot = null;
  drag = null;
  virtualDrag = null;
  message = 'Shot cancelled. Choose a club or pull back again.';
  updateHud();
}

canvas.addEventListener('pointerdown', (event) => {
  if (pendingShot) {
    const point = canvasPointFromEvent(event);
    const button = getStrikeCancelButton();
    const inside = point.x >= button.x && point.x <= button.x + button.w && point.y >= button.y && point.y <= button.y + button.h;
    event.preventDefault();
    if (inside) cancelPendingShot();
    else resolveSkillShot();
    return;
  }
  if (ball.moving || ball.holed) return;
  const worldPoint = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  virtualDrag = { anchorX: worldPoint.x, anchorY: worldPoint.y, pointerId: event.pointerId };
  drag = { startX: worldPoint.x, startY: worldPoint.y, angle: 0, power: 0, virtual: true };
  message = selectedClub === 'putter' ? 'Pull farther for putt pace.' : 'Pull back from anywhere to aim.';
  updateHud();
  event.preventDefault();
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!virtualDrag || pendingShot || ball.moving || ball.holed) return;
  if (event.pointerId !== virtualDrag.pointerId) return;
  const point = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  const pullX = virtualDrag.anchorX - point.x;
  const pullY = virtualDrag.anchorY - point.y;
  const pullDistance = Math.hypot(pullX, pullY);
  const isPutterDrag = selectedClub === 'putter' && isPuttingLieNow();
  const powerDivisor = isPutterDrag ? 165 : 105;
  drag.angle = Math.atan2(pullY, pullX);
  drag.power = clamp(pullDistance / powerDivisor, 0, 1);
  updateHud();
  event.preventDefault();
});

canvas.addEventListener('pointerup', (event) => {
  if (!virtualDrag || pendingShot || ball.moving || ball.holed) return;
  if (event.pointerId !== virtualDrag.pointerId) return;
  const angle = drag.angle;
  const power = drag.power;
  const fakePointer = { x: ball.x - Math.cos(angle) * power * 120, y: ball.y - Math.sin(angle) * power * 120 };
  virtualDrag = null;
  startSkillShot(fakePointer);
  event.preventDefault();
  if (canvas.releasePointerCapture) canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener('pointercancel', (event) => {
  if (!virtualDrag || event.pointerId !== virtualDrag.pointerId) return;
  virtualDrag = null;
  drag = null;
  updateHud();
});

clubButtons.forEach(button => button.addEventListener('click', () => {
  selectedClub = button.dataset.club;
  updateClubButtons();
  message = `${clubs[selectedClub].short} selected.`;
  updateHud();
}));

resetShotButton.addEventListener('click', () => {
  ball.x = lastSafe.x;
  ball.y = lastSafe.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.moving = false;
  ball.flight = null;
  ball.holed = false;
  drag = null;
  pendingShot = null;
  skillFeedback = null;
  message = 'Ball reset to last safe position.';
  updateHud();
});

// Single-hole fallback; the round layer attaches a capturing listener that
// stops propagation and drives multi-hole progression instead.
newHoleButton.addEventListener('click', resetHole);

// ---- Boot -------------------------------------------------------------------
resetHole();
requestAnimationFrame(loop);
