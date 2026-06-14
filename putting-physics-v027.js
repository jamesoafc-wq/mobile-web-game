// Putting physics rewrite for v0.32.
// Owns putter distance, aim line and green break.

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
  // Slightly livelier than v0.31 so putts do not die quite as early.
  return rollPixels * (1 - friction) * 0.99;
}

function getPuttBreakForce(speed) {
  // More break at dying pace, still present while the putt is rolling at medium speed.
  return clamp(0.92 - speed * 0.75, 0.16, 0.76);
}

function applyPuttBreak() {
  if (!ball || !ball.moving || ball.flight || ball.holed) return;
  const lie = getLie();
  if (lie !== 'green' && lie !== 'fringe') return;

  const slope = getGreenSlopeAt(hole, ball.x, ball.y);
  const speed = Math.hypot(ball.vx, ball.vy);
  if (!slope || slope.strength <= 0.000025 || speed <= 0.004) return;

  const force = getPuttBreakForce(speed);
  ball.vx += slope.x * force;
  ball.vy += slope.y * force;
}

const updateRollBeforePuttingPhysicsV027 = updateRoll;
updateRoll = function updateRollWithPuttingPhysicsV027() {
  updateRollBeforePuttingPhysicsV027();
  applyPuttBreak();
};

const resolveSkillShotBeforePuttingPhysicsV027 = resolveSkillShot;
resolveSkillShot = function resolveSkillShotWithPuttingPhysicsV027() {
  if (!pendingShot || pendingShot.clubKey !== 'putter') {
    resolveSkillShotBeforePuttingPhysicsV027();
    return;
  }

  const shot = pendingShot;
  const marker = getSkillMarkerPosition();
  const halfSweet = shot.sweetWidth / 2;
  const middleWidth = clamp(shot.sweetWidth + 0.28 - shot.difficulty * 0.06, shot.sweetWidth + 0.14, 0.48);
  const halfMiddle = middleWidth / 2;
  const error = marker - 0.5;
  const absError = Math.abs(error);
  const side = Math.sign(error) || 1;

  let label = 'Perfect pace';
  let contactMultiplier = 1;
  let angleOffsetDeg = 0;

  if (absError <= halfSweet) {
    label = 'Perfect pace';
  } else if (absError <= halfMiddle) {
    const miss = clamp((absError - halfSweet) / Math.max(0.01, halfMiddle - halfSweet), 0, 1);
    label = 'Slight misread';
    contactMultiplier = 0.94 - miss * 0.08;
    angleOffsetDeg = side * (0.45 + miss * 1.35);
  } else {
    const miss = clamp((absError - halfMiddle) / Math.max(0.01, 0.5 - halfMiddle), 0, 1);
    label = side < 0 ? 'Pulled putt' : 'Pushed putt';
    contactMultiplier = clamp(0.82 - miss * 0.16, 0.62, 0.82);
    angleOffsetDeg = side * (1.7 + miss * 3.8);
  }

  const random = (Math.random() + Math.random()) / 2 - 0.5;
  const angle = shot.baseAngle + radians(angleOffsetDeg + random * 0.45);
  const rollYards = getPuttRollYards(shot.lie, shot.power, contactMultiplier);
  const speed = getPuttLaunchSpeed(shot.lie, rollYards);

  skillFeedback = { label, zone: absError <= halfSweet ? 'sweet' : absError <= halfMiddle ? 'middle' : 'bad', startedAt: performance.now() };
  strokes += 1;
  lastSafe = { x: ball.x, y: ball.y };

  if (speed <= 0.004) {
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
};

drawAimLine = function drawAimLinePuttingPhysicsV027() {
  if (!drag || pendingShot || ball.moving || ball.holed) return;

  const lie = getLie();
  const club = clubs[selectedClub];
  let lineYards = getMaxCarry(selectedClub, lie) * drag.power;

  if (selectedClub === 'putter') {
    lineYards = getPuttRollYards(lie, drag.power, 1);
  }

  if (lineYards <= 0) return;

  const carryPixels = lineYards / YARDS_PER_PIXEL;
  const endX = ball.x + Math.cos(drag.angle) * carryPixels;
  const endY = ball.y + Math.sin(drag.angle) * carryPixels;

  ctx.save();
  ctx.strokeStyle = club.type === 'putt' ? 'rgba(255,255,255,0.72)' : 'rgba(255,247,167,0.78)';
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
};
