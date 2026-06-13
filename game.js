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

const clubs = {
  driver: { short: 'Driver', type: 'full', accuracy: 12, flightHeight: 0.28, rollBias: 1.1, carry: { tee: 285, fairway: 45, rough: 15, sand: 0, fringe: 8, green: 8 } },
  wood3: { short: '3W', type: 'full', accuracy: 10.5, flightHeight: 0.24, rollBias: 1.02, carry: { tee: 245, fairway: 75, rough: 25, sand: 0, fringe: 10, green: 10 } },
  iron5: { short: '5I', type: 'full', accuracy: 7.4, flightHeight: 0.22, rollBias: 0.88, carry: { tee: 185, fairway: 175, rough: 125, sand: 35, fringe: 18, green: 18 } },
  iron7: { short: '7I', type: 'full', accuracy: 6.2, flightHeight: 0.24, rollBias: 0.78, carry: { tee: 155, fairway: 145, rough: 110, sand: 45, fringe: 16, green: 16 } },
  wedgeP: { short: 'PW', type: 'full', accuracy: 5.2, flightHeight: 0.3, rollBias: 0.48, carry: { tee: 108, fairway: 102, rough: 82, sand: 55, fringe: 12, green: 12 } },
  wedgeS: { short: 'SW', type: 'full', accuracy: 6.6, flightHeight: 0.34, rollBias: 0.24, carry: { tee: 84, fairway: 78, rough: 62, sand: 70, fringe: 10, green: 10 } },
  putter: { short: 'Putter', type: 'putt', accuracy: 2.5, flightHeight: 0, rollBias: 1, carry: { tee: 24, fairway: 22, rough: 8, sand: 0, fringe: 26, green: 45 } }
};

const surfaceLabels = {
  tee: 'Tee', fairway: 'Fairway', rough: 'Rough', fringe: 'Fringe', green: 'Green', sand: 'Bunker', water: 'Water'
};

const rollFriction = {
  rough: 0.972,
  fairway: 0.982,
  tee: 0.982,
  fringe: 0.973,
  green: 0.989,
  sand: 0.72,
  water: 1
};

const clubDifficulty = {
  driver: 0.92,
  wood3: 0.82,
  iron5: 0.44,
  iron7: 0.34,
  wedgeP: 0.38,
  wedgeS: 0.58,
  putter: 0.24
};

const surfaceDifficulty = {
  tee: 0.02,
  fairway: 0.12,
  rough: 0.38,
  sand: 0.62,
  fringe: 0.12,
  green: 0.08,
  water: 1
};

const hole = HOLES[0];
let selectedClub = 'driver';
let strokes = 0;
let message = 'Play the hole.';
let ball;
let lastSafe;
let drag = null;
let pendingShot = null;
let skillFeedback = null;

function resetHole() {
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
  message = 'Pull back from the ball to line up your tee shot.';
  updateClubButtons();
  updateHud();
}

function getLie() {
  return getSurfaceAtPoint(hole, ball.x, ball.y);
}

function getDistanceToCupYards() {
  return Math.round(dist(ball.x, ball.y, hole.cup.x, hole.cup.y) * YARDS_PER_PIXEL);
}

function getMaxCarry(clubKey, lie) {
  return clubs[clubKey].carry[lie] ?? clubs[clubKey].carry.fairway ?? 0;
}

function isPuttingView() {
  const lie = getLie();
  return selectedClub === 'putter' && (lie === 'green' || lie === 'fringe') && !ball.holed;
}

function getCamera() {
  if (!isPuttingView()) return { zoom: 1, tx: 0, ty: 0 };
  const targetX = lerp(ball.x, hole.cup.x, 0.3);
  const targetY = lerp(ball.y, hole.cup.y, 0.35);
  const zoom = 1.68;
  return {
    zoom,
    tx: canvas.width / 2 - targetX * zoom,
    ty: canvas.height * 0.56 - targetY * zoom
  };
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
  else if (pendingShot) powerEl.textContent = `Timing`;
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

function getCupCaptureRadius() {
  const speed = Math.hypot(ball.vx, ball.vy);
  const putting = isPuttingView();
  if (!putting) return 1.4;
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
    message = 'Ball has settled on the green.';
    updateHud();
  } else if (speed < 0.095) {
    ball.vx *= 0.76;
    ball.vy *= 0.76;
  }
}

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

function resolveSkillShot() {
  if (!pendingShot) return;
  const marker = getSkillMarkerPosition();
  const halfSweet = pendingShot.sweetWidth / 2;
  const middleWidth = clamp(pendingShot.sweetWidth + 0.28 - pendingShot.difficulty * 0.06, pendingShot.sweetWidth + 0.14, 0.48);
  const halfMiddle = middleWidth / 2;
  const error = marker - 0.5;
  const absError = Math.abs(error);
  const side = Math.sign(error) || 1;
  let zone = 'sweet';
  let label = 'Perfect strike';
  let carryMultiplier = 1;
  let angleOffsetDeg = 0;
  let curvePixels = 0;
  if (absError <= halfSweet) {
    zone = 'sweet'; label = 'Perfect strike';
  } else if (absError <= halfMiddle) {
    zone = 'middle';
    const middleMiss = clamp((absError - halfSweet) / Math.max(0.01, halfMiddle - halfSweet), 0, 1);
    label = 'Good contact';
    carryMultiplier = clamp(0.98 - middleMiss * 0.08, 0.9, 0.98);
    angleOffsetDeg = side * (1 + middleMiss * 2.4 + pendingShot.difficulty * 1.2);
    curvePixels = side * middleMiss * pendingShot.difficulty * 7;
  } else {
    zone = 'bad';
    const badMiss = clamp((absError - halfMiddle) / Math.max(0.01, 0.5 - halfMiddle), 0, 1);
    label = badMiss > 0.55 ? (side < 0 ? 'Hooked it' : 'Sliced it') : 'Poor contact';
    carryMultiplier = clamp(1 - badMiss * (0.18 + pendingShot.difficulty * 0.22), 0.58, 0.88);
    angleOffsetDeg = side * (2.5 + badMiss * 7 + pendingShot.difficulty * 4);
    curvePixels = side * (12 + badMiss * 44 + pendingShot.difficulty * 20);
  }

  const club = clubs[pendingShot.clubKey];
  const random = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  const lieFactor = surfaceDifficulty[pendingShot.lie] ?? 0.2;
  const randomOffset = radians(random * club.accuracy * (0.35 + pendingShot.power) * (0.7 + lieFactor));
  const angle = pendingShot.baseAngle + randomOffset + radians(angleOffsetDeg);
  const carryYards = pendingShot.maxCarry * pendingShot.power * carryMultiplier;

  skillFeedback = { label, zone, startedAt: performance.now() };
  strokes += 1;
  const carryPixels = carryYards / YARDS_PER_PIXEL;
  lastSafe = { x: ball.x, y: ball.y };

  if (club.type === 'putt') {
    const speed = carryPixels * 0.1;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.moving = true;
    ball.flight = null;
    message = `${label}. Putt for ${Math.round(carryYards)} yd.`;
  } else {
    ball.moving = true;
    ball.flight = {
      startX: ball.x,
      startY: ball.y,
      endX: ball.x + Math.cos(angle) * carryPixels,
      endY: ball.y + Math.sin(angle) * carryPixels,
      angle,
      progress: 0,
      duration: clamp(20 + carryPixels / 7, 20, 60),
      carryYards,
      curvePixels,
      height: club.flightHeight,
      clubKey: pendingShot.clubKey
    };
    message = `${label}. Carry ${Math.round(carryYards)} yd.`;
  }
  pendingShot = null;
  updateHud();
}

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
  const rollYards = carryYards * (club.rollBias || 0.5) * ({ tee: 0.22, fairway: 0.2, rough: 0.06, fringe: 0.08, green: 0.03 }[lie] ?? 0.08) * (0.85 + Math.random() * 0.3);
  const speed = (rollYards / YARDS_PER_PIXEL) * 0.11;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.moving = true;
}

function updateFlight() {
  if (!ball.flight) return;
  const shot = ball.flight;
  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  const arc = Math.sin(t * Math.PI);
  const baseX = lerp(shot.startX, shot.endX, ease);
  const baseY = lerp(shot.startY, shot.endY, ease);
  const curveOffset = (shot.curvePixels || 0) * Math.sin(t * Math.PI);
  const perpX = -Math.sin(shot.angle);
  const perpY = Math.cos(shot.angle);
  ball.x = baseX + perpX * curveOffset;
  ball.y = baseY + perpY * curveOffset;
  ball.visualScale = 1 + arc * shot.height;
  if (t >= 1) {
    ball.flight = null;
    ball.visualScale = 1;
    startLandingRoll(shot.angle, getLie(), shot.carryYards, shot.clubKey);
  }
}

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
  if (lie === 'green' || lie === 'fringe') {
    const slope = getGreenSlopeAt(hole, ball.x, ball.y);
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0.052 && slope.strength > 0.00004) {
      const breakForce = clamp(0.62 - speed * 0.32, 0.16, 0.64);
      ball.vx += slope.x * breakForce;
      ball.vy += slope.y * breakForce;
    }
  }
  const friction = rollFriction[lie] ?? 0.98;
  ball.vx *= friction;
  ball.vy *= friction;
  if (maybeHoleOut()) return;
  stopBallOnGreenIfSlow();
  if (Math.hypot(ball.vx, ball.vy) < 0.025 && !ball.holed) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
  }
}

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
  const club = clubs[selectedClub];
  const maxCarry = getMaxCarry(selectedClub, getLie());
  if (maxCarry <= 0) return;
  const carryPixels = (maxCarry * drag.power) / YARDS_PER_PIXEL;
  const endX = ball.x + Math.cos(drag.angle) * carryPixels;
  const endY = ball.y + Math.sin(drag.angle) * carryPixels;
  ctx.save();
  ctx.strokeStyle = club.type === 'putt' ? 'rgba(255,255,255,0.55)' : 'rgba(255,247,167,0.78)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(endX, endY, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSkillBar() {
  if (!pendingShot) return;
  const marker = getSkillMarkerPosition();
  const panelW = 350;
  const panelH = 88;
  const panelX = (canvas.width - panelW) / 2;
  const panelY = canvas.height - 112;
  const barX = panelX + 24;
  const barY = panelY + 42;
  const barW = panelW - 48;
  const barH = 18;
  const middleWidth = clamp(pendingShot.sweetWidth + 0.28 - pendingShot.difficulty * 0.06, pendingShot.sweetWidth + 0.14, 0.48);
  const middleX = barX + (0.5 - middleWidth / 2) * barW;
  const sweetX = barX + (0.5 - pendingShot.sweetWidth / 2) * barW;
  const markerX = barX + marker * barW;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(7, 13, 7, 0.92)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 14px system-ui';
  ctx.fillText(`${clubs[pendingShot.clubKey].short} from ${surfaceLabels[pendingShot.lie]} · tap green`, canvas.width / 2, panelY + 22);
  ctx.fillStyle = 'rgba(255,92,92,0.58)'; roundRect(ctx, barX, barY, barW, barH, 9); ctx.fill();
  ctx.fillStyle = 'rgba(255,205,86,0.78)'; roundRect(ctx, middleX, barY, middleWidth * barW, barH, 9); ctx.fill();
  ctx.fillStyle = '#72dd66'; roundRect(ctx, sweetX, barY - 2, pendingShot.sweetWidth * barW, barH + 4, 9); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(markerX, barY - 8); ctx.lineTo(markerX, barY + barH + 8); ctx.stroke();
  ctx.fillStyle = '#d7eac8'; ctx.font = '700 11px system-ui';
  ctx.fillText('green = sweet · yellow = safe · red = bad', canvas.width / 2, panelY + 72);
  ctx.restore();
}

function drawSkillFeedback() {
  if (!skillFeedback) return;
  const elapsed = performance.now() - skillFeedback.startedAt;
  if (elapsed > 1500) { skillFeedback = null; return; }
  const alpha = elapsed < 1100 ? 1 : 1 - (elapsed - 1100) / 400;
  const fill = skillFeedback.zone === 'sweet' ? 'rgba(43,161,69,0.92)' : skillFeedback.zone === 'middle' ? 'rgba(177,130,32,0.92)' : 'rgba(165,54,54,0.92)';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = fill;
  roundRect(ctx, (canvas.width - 220) / 2, 56, 220, 46, 16); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 15px system-ui';
  ctx.fillText(skillFeedback.label, canvas.width / 2, 84);
  ctx.restore();
}

function drawOverlayInfo() {
  if (!isPuttingView()) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(9,22,9,0.62)';
  roundRect(ctx, canvas.width - 118, 14, 104, 28, 14); ctx.fill();
  ctx.fillStyle = '#eef8c8'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Green read', canvas.width - 66, 32);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cam = getCamera();
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
  drawCourse(ctx, hole, canvas.width, canvas.height, performance.now(), isPuttingView());
  if (isPuttingView()) drawSlopeRead(ctx, hole, performance.now());
  drawAimLine();
  drawBall();
  ctx.restore();
  drawOverlayInfo();
  drawSkillBar();
  drawSkillFeedback();
}

function loop() {
  updateFlight();
  updateRoll();
  updateHud();
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', (event) => {
  if (pendingShot) {
    event.preventDefault();
    resolveSkillShot();
    return;
  }
  if (ball.moving || ball.holed) return;
  const point = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  drag = { startX: point.x, startY: point.y, angle: 0, power: 0 };
  updateHud();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag || pendingShot || ball.moving || ball.holed) return;
  const point = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  const pullX = ball.x - point.x;
  const pullY = ball.y - point.y;
  drag.angle = Math.atan2(pullY, pullX);
  drag.power = clamp(Math.hypot(pullX, pullY) / 120, 0, 1);
  updateHud();
});

canvas.addEventListener('pointerup', (event) => {
  if (!drag || pendingShot || ball.moving || ball.holed) return;
  const point = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  startSkillShot(point);
});

canvas.addEventListener('pointercancel', () => { if (drag && !pendingShot) drag = null; });

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

newHoleButton.addEventListener('click', resetHole);

resetHole();
requestAnimationFrame(loop);
