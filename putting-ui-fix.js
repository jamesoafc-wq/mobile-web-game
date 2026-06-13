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

function getSkillPanelRect() {
  const panelW = Math.min(350, canvas.width - 24);
  const panelH = 88;
  const panelX = (canvas.width - panelW) / 2;
  const panelY = Math.max(84, canvas.height - 190);
  return { x: panelX, y: panelY, w: panelW, h: panelH };
}

function getStrikeCancelButton() {
  const panel = getSkillPanelRect();
  return {
    x: panel.x + panel.w - 112,
    y: panel.y + 52,
    w: 96,
    h: 26
  };
}

function drawStrikeCancelButton() {
  if (!pendingShot) return;
  const button = getStrikeCancelButton();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(96, 32, 24, 0.92)';
  roundRect(ctx, button.x, button.y, button.w, button.h, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  ctx.fillStyle = '#ffe8df';
  ctx.font = '900 10px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cancel shot', button.x + button.w / 2, button.y + button.h / 2 + 0.5);
  ctx.restore();
}

drawSkillBar = function drawSkillBarAboveClubOverlay() {
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
  ctx.fillText('green = sweet · yellow = safe · red = bad', canvas.width / 2 - 34, panel.y + 72);
  ctx.restore();

  drawStrikeCancelButton();
};

let virtualDrag = null;

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
    if (!inside) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    cancelPendingShot();
    return;
  }

  if (ball.moving || ball.holed) return;

  const worldPoint = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  virtualDrag = {
    anchorX: worldPoint.x,
    anchorY: worldPoint.y,
    pointerId: event.pointerId
  };
  drag = { startX: worldPoint.x, startY: worldPoint.y, angle: 0, power: 0, virtual: true };
  message = 'Pull back from anywhere to aim.';
  updateHud();

  event.preventDefault();
  event.stopImmediatePropagation();
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
}, true);

canvas.addEventListener('pointermove', (event) => {
  if (!virtualDrag || pendingShot || ball.moving || ball.holed) return;
  if (event.pointerId !== virtualDrag.pointerId) return;

  const point = screenToWorld(canvas, getCamera(), event.clientX, event.clientY);
  const pullX = virtualDrag.anchorX - point.x;
  const pullY = virtualDrag.anchorY - point.y;
  drag.angle = Math.atan2(pullY, pullX);
  drag.power = clamp(Math.hypot(pullX, pullY) / 105, 0, 1);
  updateHud();

  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

canvas.addEventListener('pointerup', (event) => {
  if (!virtualDrag || pendingShot || ball.moving || ball.holed) return;
  if (event.pointerId !== virtualDrag.pointerId) return;

  const angle = drag.angle;
  const power = drag.power;
  const fakePointer = {
    x: ball.x - Math.cos(angle) * power * 120,
    y: ball.y - Math.sin(angle) * power * 120
  };

  virtualDrag = null;
  startSkillShot(fakePointer);

  event.preventDefault();
  event.stopImmediatePropagation();
  if (canvas.releasePointerCapture) canvas.releasePointerCapture(event.pointerId);
}, true);

canvas.addEventListener('pointercancel', (event) => {
  if (!virtualDrag) return;
  if (event.pointerId !== virtualDrag.pointerId) return;
  virtualDrag = null;
  drag = null;
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
