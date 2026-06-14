// Full-shot shape model for v0.31.
// Loaded after putting-physics-v027.js. Full shots now land where the visible hook/fade finishes.

const resolveSkillShotBeforeShotShapeV031 = resolveSkillShot;

function getFullShotShapeFromStrike(shot, marker) {
  const halfSweet = shot.sweetWidth / 2;
  const middleWidth = clamp(shot.sweetWidth + 0.28 - shot.difficulty * 0.06, shot.sweetWidth + 0.14, 0.48);
  const halfMiddle = middleWidth / 2;
  const error = marker - 0.5;
  const absError = Math.abs(error);
  const side = Math.sign(error) || 1;

  if (absError <= halfSweet) {
    return {
      zone: 'sweet',
      label: 'Perfect strike',
      carryMultiplier: 1,
      startLineDeg: 0,
      finalCurvePixels: side * shot.difficulty * 1.5
    };
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

resolveSkillShot = function resolveSkillShotWithShotShapeV031() {
  if (!pendingShot || clubs[pendingShot.clubKey].type === 'putt') {
    resolveSkillShotBeforeShotShapeV031();
    return;
  }

  const shot = pendingShot;
  const club = clubs[shot.clubKey];
  const marker = getSkillMarkerPosition();
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
    shapeV031: true,
    startX,
    startY,
    baseEndX,
    baseEndY,
    endX,
    endY,
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
};

const updateFlightBeforeShotShapeV031 = updateFlight;
updateFlight = function updateFlightWithShotShapeV031() {
  if (!ball.flight || !ball.flight.shapeV031) {
    updateFlightBeforeShotShapeV031();
    return;
  }

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
  ball.visualScale = 1 + arc * shot.height;

  if (t >= 1) {
    ball.x = shot.endX;
    ball.y = shot.endY;
    ball.flight = null;
    ball.visualScale = 1;
    startLandingRoll(shot.landingAngle, getLie(), shot.carryYards, shot.clubKey);
  }
};
