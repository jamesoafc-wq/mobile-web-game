// Active gameplay/UI tuning layer.
// Loaded after game.js. Owns current balancing and mobile controls.

function isPuttingLieNow() {
  const lie = getLie();
  return lie === 'green' || lie === 'fringe';
}

function getEffectivePuttYards(lie) {
  if (lie === 'green') return 100;
  if (lie === 'fringe') return 84;
  return clubs.putter.carry[lie] ?? 45;
}

function getPuttPowerCurve(power) {
  return Math.pow(clamp(power, 0, 1), 0.82);
}

isPuttingView = function isPuttingViewByLieTuned() {
  return isPuttingLieNow() && !ball.holed;
};

getCamera = function getCameraWithPuttingZoom() {
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
  if (speed < 0.006) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    message = 'Ball has settled on the green. Read the slope and pace.';
    selectPutterOnSettledGreen();
    updateHud();
  }
}

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

startLandingRoll = function startLandingRollWithApproachRelease(angle, lie, carryYards, clubKey) {
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

  const approachRollFactor = ({
    tee: 0.16,
    fairway: 0.18,
    rough: 0.065,
    fringe: 0.16,
    green: 0.24
  }[lie] ?? 0.11);

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
    selectPutterOnSettledGreen();
  } else if (lie === 'green' || lie === 'fringe') {
    message = 'Landed on the green and released.';
    updateHud();
  }
};

const originalResolveSkillShotTuned = resolveSkillShot;
resolveSkillShot = function resolveSkillShotWithScaledPutter() {
  const shotBefore = pendingShot ? {
    clubKey: pendingShot.clubKey,
    lie: pendingShot.lie,
    maxCarry: pendingShot.maxCarry,
    power: pendingShot.power,
    baseAngle: pendingShot.baseAngle
  } : null;

  originalResolveSkillShotTuned();

  if (!shotBefore || shotBefore.clubKey !== 'putter' || !ball || ball.holed) return;

  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const angle = currentSpeed > 0 ? Math.atan2(ball.vy, ball.vx) : shotBefore.baseAngle;
  const responsivePower = getPuttPowerCurve(shotBefore.power);
  const rollPixels = (getEffectivePuttYards(shotBefore.lie) * responsivePower) / YARDS_PER_PIXEL;
  const friction = rollFriction[shotBefore.lie] ?? rollFriction.green;
  const correctedSpeed = rollPixels * (1 - friction) * 1.15;

  if (correctedSpeed <= 0.006) {
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

const originalUpdateRollTuned = updateRoll;
updateRoll = function updateRollWithPuttingSettle() {
  originalUpdateRollTuned();
  forceStopDeadPutt();
  selectPutterOnSettledGreen();
};

function getSkillPanelRect() {
  const panelW = Math.min(350, canvas.width - 24);
  const panelH = 94;
  const panelX = (canvas.width - panelW) / 2;
  const panelY = Math.max(84, canvas.height - 198);
  return { x: panelX, y: panelY, w: panelW, h: panelH };
}

function getStrikeCancelButton() {
  const panel = getSkillPanelRect();
  return {
    x: panel.x + 16,
    y: panel.y + 62,
    w: 84,
    h: 24
  };
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
  ctx.fillText('green = sweet · yellow = safe · red = bad', canvas.width / 2 + 34, panel.y + 77);
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
  message = selectedClub === 'putter' ? 'Pull farther for putt pace.' : 'Pull back from anywhere to aim.';
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
  const pullDistance = Math.hypot(pullX, pullY);
  const isPutterDrag = selectedClub === 'putter' && isPuttingLieNow();
  const powerDivisor = isPutterDrag ? 165 : 105;

  drag.angle = Math.atan2(pullY, pullX);
  drag.power = clamp(pullDistance / powerDivisor, 0, 1);
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

drawAimLine = function drawAimLineTuned() {
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
};

drawOverlayInfo = function drawInCanvasHudHotfix() {
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
  ctx.font = '800 9.5px system-ui';
  ctx.fillText(getTopRightScoreText(), canvas.width - 22, 43);

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
};
