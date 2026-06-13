// Putting and UI hotfix layer.
// Loaded after game.js so the visual build can be tuned without rewriting the full file.

function isPuttingLie(lie = getLie()) {
  return lie === 'green' || lie === 'fringe';
}

isPuttingView = function isPuttingViewByLie() {
  return isPuttingLie() && !ball.holed;
};

function autoSelectPutterIfOnGreen() {
  if (!isPuttingLie() || ball.moving || ball.flight || ball.holed) return;
  if (selectedClub !== 'putter') {
    selectedClub = 'putter';
    updateClubButtons();
  }
}

const baseStopBallOnGreenIfSlowForPuttingFix = stopBallOnGreenIfSlow;
stopBallOnGreenIfSlow = function stopBallOnGreenIfSlowWithAutoPutter() {
  baseStopBallOnGreenIfSlowForPuttingFix();
  autoSelectPutterIfOnGreen();
};

startLandingRoll = function startLandingRollWithControlledRollout(angle, lie, carryYards, clubKey) {
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

  const rollFactor = ({ tee: 0.14, fairway: 0.12, rough: 0.035, fringe: 0.045, green: 0.018 }[lie] ?? 0.05);
  const rollYards = carryYards * (club.rollBias || 0.5) * rollFactor * (0.82 + Math.random() * 0.22);
  const rollPixels = rollYards / YARDS_PER_PIXEL;
  const surfaceFriction = rollFriction[lie] ?? 0.98;
  const speed = rollPixels * (1 - surfaceFriction) * 1.12;

  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.moving = speed > 0.025;

  if (!ball.moving) {
    lastSafe = { x: ball.x, y: ball.y };
    autoSelectPutterIfOnGreen();
  }
};

resolveSkillShot = function resolveSkillShotWithPuttScale() {
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
    zone = 'sweet';
    label = 'Perfect strike';
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
    const lieFriction = rollFriction[pendingShot.lie] ?? rollFriction.green;
    const speed = carryPixels * (1 - lieFriction) * 1.08;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.moving = speed > 0.018;
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
};

const baseUpdateRollForPuttingFix = updateRoll;
updateRoll = function updateRollWithAutoPutter() {
  baseUpdateRollForPuttingFix();
  autoSelectPutterIfOnGreen();
};

drawOverlayInfo = function drawInCanvasHud() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = 'rgba(8, 18, 9, 0.76)';
  roundRect(ctx, 10, 10, canvas.width - 20, 38, 16);
  ctx.fill();

  ctx.fillStyle = '#eef8c8';
  ctx.font = '800 11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`${surfaceLabels[getLie()]} · ${clubs[selectedClub].short}`, 24, 25);

  ctx.textAlign = 'center';
  ctx.fillText(`${getDistanceToCupYards()} yd`, canvas.width / 2, 25);

  ctx.textAlign = 'right';
  ctx.fillText(`Strokes ${strokes}`, canvas.width - 24, 25);

  if (isPuttingView()) {
    ctx.fillStyle = 'rgba(238,248,200,0.16)';
    roundRect(ctx, canvas.width - 116, 52, 102, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#eef8c8';
    ctx.textAlign = 'center';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Putting view', canvas.width - 65, 68);
  }

  ctx.restore();
};
