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

getCamera = function getCameraWithStrongerPuttingZoom() {
  if (!isPuttingView()) return { zoom: 1, tx: 0, ty: 0 };

  const zoom = 2.35;
  const centerX = ball.x * 0.46 + hole.cup.x * 0.54;
  const centerY = ball.y * 0.46 + hole.cup.y * 0.54;

  return {
    zoom,
    tx: clamp(canvas.width / 2 - centerX * zoom, canvas.width - canvas.width * zoom, 0),
    ty: clamp(canvas.height * 0.52 - centerY * zoom, canvas.height - canvas.height * zoom, 0)
  };
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
  // Let the normal strike result happen, then rescale only putter velocity to a softer intended roll distance.
  if (!shotBefore || shotBefore.clubKey !== 'putter' || !ball || ball.holed) return;

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const angle = currentSpeed > 0 ? Math.atan2(ball.vy, ball.vx) : shotBefore.baseAngle;
  const rollPixels = (shotBefore.maxCarry * shotBefore.power) / YARDS_PER_PIXEL;
  const friction = rollFriction[shotBefore.lie] ?? rollFriction.green;
  const correctedSpeed = rollPixels * (1 - friction) * 0.64;

  if (correctedSpeed <= 0.012) {
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

  ctx.fillStyle = 'rgba(8, 18, 9, 0.78)';
  roundRect(ctx, 8, 8, canvas.width - 16, 44, 16);
  ctx.fill();

  ctx.fillStyle = '#eef8c8';
  ctx.font = '900 11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`${hole.name} · Par ${hole.par}`, 22, 23);
  ctx.font = '800 10px system-ui';
  ctx.fillText(`${surfaceLabels[getLie()]} · ${clubs[selectedClub].short}`, 22, 40);

  ctx.textAlign = 'center';
  ctx.font = '900 12px system-ui';
  ctx.fillText(`${getDistanceToCupYards()} yd`, canvas.width / 2, 31);

  ctx.textAlign = 'right';
  ctx.font = '900 11px system-ui';
  ctx.fillText(`Strokes ${strokes}`, canvas.width - 22, 31);

  if (isPuttingView()) {
    ctx.fillStyle = 'rgba(238,248,200,0.16)';
    roundRect(ctx, canvas.width - 118, 56, 104, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#eef8c8';
    ctx.textAlign = 'center';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Putting zoom', canvas.width - 66, 72);
  }

  ctx.restore();
};
