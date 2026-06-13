// Minimal putting and UI hotfix layer.
// Keep this small: wrap the original game functions instead of replacing full shot logic.

function isPuttingLieNow() {
  const lie = getLie();
  return lie === 'green' || lie === 'fringe';
}

const originalIsPuttingViewHotfix = isPuttingView;
isPuttingView = function isPuttingViewByLieHotfix() {
  try {
    return isPuttingLieNow() && !ball.holed;
  } catch (error) {
    return originalIsPuttingViewHotfix();
  }
};

function selectPutterOnSettledGreen() {
  if (!ball || ball.moving || ball.flight || ball.holed) return;
  if (!isPuttingLieNow()) return;
  if (selectedClub !== 'putter') {
    selectedClub = 'putter';
    updateClubButtons();
  }
}

function forceStopDeadPutt() {
  if (!ball || !ball.moving || ball.flight || ball.holed) return;
  if (!isPuttingLieNow()) return;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < 0.018) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    message = 'Ball has settled on the green. Read the slope and pace.';
    selectPutterOnSettledGreen();
    updateHud();
  }
}

const originalResolveSkillShotHotfix = resolveSkillShot;
resolveSkillShot = function resolveSkillShotWithScaledPutterHotfix() {
  const shotBefore = pendingShot ? {
    clubKey: pendingShot.clubKey,
    lie: pendingShot.lie,
    maxCarry: pendingShot.maxCarry,
    power: pendingShot.power,
    baseAngle: pendingShot.baseAngle
  } : null;

  originalResolveSkillShotHotfix();

  // The visual build's original putter speed used a fixed multiplier that made short putts too hot.
  // Let the normal strike result happen, then rescale only putter velocity to the intended roll distance.
  if (!shotBefore || shotBefore.clubKey !== 'putter' || !ball || ball.holed) return;

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const angle = currentSpeed > 0 ? Math.atan2(ball.vy, ball.vx) : shotBefore.baseAngle;
  const rollPixels = (shotBefore.maxCarry * shotBefore.power) / YARDS_PER_PIXEL;
  const friction = rollFriction[shotBefore.lie] ?? rollFriction.green;
  const correctedSpeed = rollPixels * (1 - friction) * 1.05;

  if (correctedSpeed <= 0.018) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    message = 'Ball has settled on the green. Read the slope and pace.';
    selectPutterOnSettledGreen();
  } else {
    ball.vx = Math.cos(angle) * correctedSpeed;
    ball.vy = Math.sin(angle) * correctedSpeed;
    ball.moving = true;
  }

  updateHud();
};

const originalUpdateRollHotfix = updateRoll;
updateRoll = function updateRollWithPuttingSettleHotfix() {
  originalUpdateRollHotfix();
  forceStopDeadPutt();
  selectPutterOnSettledGreen();
};

const originalStartLandingRollHotfix = startLandingRoll;
startLandingRoll = function startLandingRollWithAutoPutterHotfix(angle, lie, carryYards, clubKey) {
  originalStartLandingRollHotfix(angle, lie, carryYards, clubKey);
  selectPutterOnSettledGreen();
};

drawOverlayInfo = function drawInCanvasHudHotfix() {
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
