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
  if (speed < 0.012) {
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
  // Let the normal strike result happen, then rescale only putter velocity to a responsive roll distance.
  if (!shotBefore || shotBefore.clubKey !== 'putter' || !ball || ball.holed) return;

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const angle = currentSpeed > 0 ? Math.atan2(ball.vy, ball.vx) : shotBefore.baseAngle;
  const responsivePower = Math.pow(clamp(shotBefore.power, 0, 1), 0.82);
  const rollPixels = (shotBefore.maxCarry * responsivePower) / YARDS_PER_PIXEL;
  const friction = rollFriction[shotBefore.lie] ?? rollFriction.green;
  const correctedSpeed = rollPixels * (1 - friction) * 0.88;

  if (correctedSpeed <= 0.008) {
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

function getStrikeCancelButton() {
  return {
    x: canvas.width - 112,
    y: canvas.height - 108,
    w: 96,
    h: 30
  };
}

function drawStrikeCancelButton() {
  if (!pendingShot) return;
  const button = getStrikeCancelButton();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(96, 32, 24, 0.92)';
  roundRect(ctx, button.x, button.y, button.w, button.h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  ctx.fillStyle = '#ffe8df';
  ctx.font = '900 11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cancel shot', button.x + button.w / 2, button.y + button.h / 2 + 0.5);
  ctx.restore();
}

const originalDrawSkillBarHotfix = drawSkillBar;
drawSkillBar = function drawSkillBarWithCancelHotfix() {
  originalDrawSkillBarHotfix();
  drawStrikeCancelButton();
};

canvas.addEventListener('pointerdown', (event) => {
  if (!pendingShot) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const button = getStrikeCancelButton();
  const inside = x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;

  if (!inside) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  pendingShot = null;
  drag = null;
  message = 'Shot cancelled. Choose a club or pull back again.';
  updateHud();
}, true);

drawOverlayInfo = function drawInCanvasHudHotfix() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = 'rgba(8, 18, 9, 0.78)';
  roundRect(ctx, 8, 8, canvas.width - 16, 44, 16);
  ctx.fill();

  ctx.fillStyle = '#eef8c8';
  ctx.font = '900 11px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
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
