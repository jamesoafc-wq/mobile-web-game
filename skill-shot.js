// Shot timing / difficulty layer.
// Loaded after game.js and sand-fix.js.

const skillClubDifficulty = {
  driver: 0.82,
  wood3: 0.68,
  iron5: 0.42,
  iron7: 0.34,
  wedgeP: 0.38,
  wedgeS: 0.58,
  putter: 0.24
};

const skillSurfaceDifficulty = {
  tee: 0.02,
  fairway: 0.12,
  rough: 0.38,
  sand: 0.62,
  green: 0.08,
  water: 1
};

let skillShot = null;
let skillFeedback = null;

function getSkillDifficulty(clubKey, surfaceKey, power) {
  const clubDifficulty = skillClubDifficulty[clubKey] ?? 0.5;
  const surfaceDifficulty = skillSurfaceDifficulty[surfaceKey] ?? 0.35;
  const powerDifficulty = power * 0.18;
  return clamp(clubDifficulty + surfaceDifficulty + powerDifficulty, 0.08, 1);
}

function getSweetSpotWidth(difficulty) {
  return clamp(0.34 - difficulty * 0.24, 0.07, 0.31);
}

function getSkillMarkerPosition() {
  if (!skillShot) return 0.5;

  const elapsed = (performance.now() - skillShot.startedAt) / 1000;
  const phase = (elapsed * skillShot.speed) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

function getSkillResult(marker) {
  const center = skillShot.center;
  const halfSweet = skillShot.sweetWidth / 2;
  const middleWidth = clamp(skillShot.sweetWidth + 0.28 - skillShot.difficulty * 0.06, skillShot.sweetWidth + 0.14, 0.48);
  const halfMiddle = middleWidth / 2;
  const error = marker - center;
  const absError = Math.abs(error);
  const side = Math.sign(error) || 1;
  const difficulty = skillShot.difficulty;

  if (absError <= halfSweet) {
    return {
      name: "Perfect strike",
      zone: "sweet",
      zoneLabel: "Sweet spot",
      carryMultiplier: 1,
      accuracyMultiplier: 0.32,
      timingDegrees: 0,
      curvePixels: 0,
      miss: 0
    };
  }

  const miss = clamp((absError - halfSweet) / (0.5 - halfSweet), 0, 1);
  const middleMiss = clamp((absError - halfSweet) / Math.max(0.01, halfMiddle - halfSweet), 0, 1);

  if (absError <= halfMiddle) {
    return {
      name: "Good contact",
      zone: "middle",
      zoneLabel: "Middle contact",
      carryMultiplier: clamp(0.98 - middleMiss * 0.08, 0.9, 0.98),
      accuracyMultiplier: clamp(0.85 + middleMiss * 0.8 + difficulty * 0.25, 0.85, 1.7),
      timingDegrees: side * (1 + middleMiss * 3 + difficulty * 1.5),
      curvePixels: side * middleMiss * difficulty * 7,
      miss
    };
  }

  const badMiss = clamp((absError - halfMiddle) / Math.max(0.01, 0.5 - halfMiddle), 0, 1);
  const severe = badMiss > 0.55;
  const name = severe ? (side < 0 ? "Hooked it" : "Sliced it") : "Poor contact";
  const curve = side * (12 + badMiss * 46 + difficulty * 24);

  return {
    name,
    zone: "bad",
    zoneLabel: severe ? "Bad miss" : "Poor contact",
    carryMultiplier: clamp(1 - miss * (0.18 + difficulty * 0.22), 0.58, 0.88),
    accuracyMultiplier: clamp(1.4 + miss * 2.2 + difficulty * 0.9, 1.2, 3.5),
    timingDegrees: side * (2.5 + badMiss * 7 + difficulty * 4),
    curvePixels: curve,
    miss
  };
}

function startSkillShot(pointer) {
  if (!drag || ball.moving || ball.holed || skillShot) return;

  const pullX = ball.x - pointer.x;
  const pullY = ball.y - pointer.y;
  const pullDistance = Math.hypot(pullX, pullY);
  const power = clamp(pullDistance / MAX_DRAG, 0, 1);

  drag = null;

  if (power < 0.06) {
    message = "Small pull cancelled. Pull farther back to hit the ball.";
    updateHud();
    return;
  }

  const surfaceKey = surfaceAt(ball.x, ball.y);
  const clubKey = selectedClub;
  const club = clubs[clubKey];
  const surface = surfaces[surfaceKey];
  const maxCarryYards = getMaxCarry(clubKey, surfaceKey);

  if (maxCarryYards <= 0) {
    message = `${club.name} has no playable distance from ${surface.label}. Choose another club.`;
    updateHud();
    return;
  }

  const difficulty = getSkillDifficulty(clubKey, surfaceKey, power);
  const sweetWidth = getSweetSpotWidth(difficulty);

  previousSafe = { x: ball.x, y: ball.y };

  skillShot = {
    clubKey,
    surfaceKey,
    power,
    maxCarryYards,
    baseAngle: Math.atan2(pullY, pullX),
    difficulty,
    sweetWidth,
    center: 0.5,
    speed: 0.72 + difficulty * 1.05,
    startedAt: performance.now()
  };

  message = `${club.name} from ${surface.label}: tap when the marker is in the green sweet spot.`;
  updateHud();
  powerEl.textContent = `Timing · ${Math.round(difficulty * 100)}% diff`;
}

function resolveSkillShot(marker) {
  if (!skillShot) return;

  const shot = skillShot;
  const result = getSkillResult(marker);
  const club = clubs[shot.clubKey];
  const surface = surfaces[shot.surfaceKey];
  const random = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  const randomMiss = degreesToRadians(
    random * club.accuracy * surface.accuracy * (0.35 + shot.power) * result.accuracyMultiplier
  );
  const timingMiss = degreesToRadians(result.timingDegrees);
  const angle = shot.baseAngle + randomMiss + timingMiss;
  const shotYards = shot.maxCarryYards * shot.power * result.carryMultiplier;

  skillShot = null;
  skillFeedback = {
    name: result.name,
    zone: result.zone,
    zoneLabel: result.zoneLabel,
    curvePixels: result.curvePixels,
    startedAt: performance.now()
  };
  strokes += 1;

  if (club.type === "putt") {
    launchRoll(angle, shotYards, shot.surfaceKey);
    message = `${result.name}. Putt roll: ${Math.round(shotYards)} yd.`;
    updateHud();
    return;
  }

  const carryPixels = shotYards / YARDS_PER_PIXEL;
  const landingX = ball.x + Math.cos(angle) * carryPixels;
  const landingY = ball.y + Math.sin(angle) * carryPixels;

  ball.moving = true;
  ball.visualScale = 1;
  ball.bounce = null;
  ball.flight = {
    startX: ball.x,
    startY: ball.y,
    landingX,
    landingY,
    progress: 0,
    duration: clamp(18 + carryPixels / 8, 20, 58),
    angle,
    carryYards: shotYards,
    clubKey: shot.clubKey,
    height: club.flightHeight,
    curvePixels: result.curvePixels
  };

  const curveNote = Math.abs(result.curvePixels) >= 18 ? " Curving hard." : "";
  message = `${result.name}. Carry: ${Math.round(shotYards)} yd.${curveNote}`;
  updateHud();
}

function drawSkillBar() {
  if (!skillShot) return;

  const marker = getSkillMarkerPosition();
  const panelW = 390;
  const panelH = 92;
  const panelX = (W - panelW) / 2;
  const panelY = H - 126;
  const barX = panelX + 28;
  const barY = panelY + 46;
  const barW = panelW - 56;
  const barH = 18;
  const sweetX = barX + (skillShot.center - skillShot.sweetWidth / 2) * barW;
  const sweetW = skillShot.sweetWidth * barW;
  const middleWidth = clamp(skillShot.sweetWidth + 0.28 - skillShot.difficulty * 0.06, skillShot.sweetWidth + 0.14, 0.48);
  const middleX = barX + (skillShot.center - middleWidth / 2) * barW;
  const middleW = middleWidth * barW;
  const markerX = barX + marker * barW;
  const club = clubs[skillShot.clubKey];
  const surface = surfaces[skillShot.surfaceKey];

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = "rgba(7, 13, 7, 0.9)";
  roundRect(panelX, panelY, panelW, panelH, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "800 15px system-ui";
  ctx.fillText(`${club.short} from ${surface.label} · tap green`, W / 2, panelY + 24);

  ctx.fillStyle = "rgba(255, 92, 92, 0.64)";
  roundRect(barX, barY, barW, barH, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 209, 92, 0.86)";
  roundRect(middleX, barY, middleW, barH, 10);
  ctx.fill();

  ctx.fillStyle = "#70e269";
  roundRect(sweetX, barY - 2, sweetW, barH + 4, 10);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(markerX, barY - 9);
  ctx.lineTo(markerX, barY + barH + 9);
  ctx.stroke();

  ctx.fillStyle = "#cfe8c8";
  ctx.font = "700 11px system-ui";
  ctx.fillText(`green = sweet · yellow = safe · red = bad`, W / 2, panelY + 76);

  ctx.restore();
}

function drawSkillFeedback() {
  if (!skillFeedback) return;

  const elapsed = performance.now() - skillFeedback.startedAt;
  if (elapsed > 1700) {
    skillFeedback = null;
    return;
  }

  const panelW = 238;
  const panelX = (W - panelW) / 2;
  const panelY = 58;
  const alpha = elapsed < 1250 ? 1 : 1 - (elapsed - 1250) / 450;
  const fill = skillFeedback.zone === "sweet"
    ? "rgba(43, 161, 69, 0.92)"
    : skillFeedback.zone === "middle"
      ? "rgba(177, 130, 32, 0.92)"
      : "rgba(165, 54, 54, 0.94)";

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = fill;
  roundRect(panelX, panelY, panelW, 48, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "900 16px system-ui";
  ctx.fillText(skillFeedback.name, W / 2, panelY + 21);
  ctx.font = "700 11px system-ui";
  const curveText = Math.abs(skillFeedback.curvePixels) >= 18 ? " · visible curve" : "";
  ctx.fillText(`${skillFeedback.zoneLabel}${curveText}`, W / 2, panelY + 38);
  ctx.restore();
}

const skillBaseUpdateFlight = updateFlight;
updateFlight = function updateFlightWithCurve() {
  if (!ball.flight) return false;

  const shot = ball.flight;
  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  const arc = Math.sin(t * Math.PI);
  const baseX = shot.startX + (shot.landingX - shot.startX) * ease;
  const baseY = shot.startY + (shot.landingY - shot.startY) * ease;
  const curveOffset = (shot.curvePixels || 0) * Math.sin(t * Math.PI);
  const perpX = -Math.sin(shot.angle);
  const perpY = Math.cos(shot.angle);

  ball.x = baseX + perpX * curveOffset;
  ball.y = baseY + perpY * curveOffset;
  ball.visualScale = 1 + arc * shot.height;

  if (t < 1) return true;

  ball.flight = null;
  ball.visualScale = 1;

  const landingSurfaceKey = surfaceAt(ball.x, ball.y);
  if (landingSurfaceKey === "water") {
    takePenalty("Water hazard. One-stroke penalty and ball returned to previous lie.");
    return true;
  }

  const landingSurface = surfaces[landingSurfaceKey];
  const club = clubs[shot.clubKey];
  const bounceLuck = 0.75 + Math.random() * 0.45;
  const rollYards = shot.carryYards * landingSurface.roll * club.rollBias * bounceLuck;

  if (startLandingBounce(shot, landingSurfaceKey, rollYards)) {
    message = `Landed on ${landingSurface.label}.`;
    updateHud();
    return true;
  }

  if (rollYards < 1) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    updateSuggestedClub(landingSurfaceKey);
    message = `Landed on ${landingSurface.label}. Almost no extra roll.`;
    updateHud();
    return true;
  }

  launchRoll(shot.angle, rollYards, landingSurfaceKey);
  message = `Landed on ${landingSurface.label}. Extra roll: ${Math.round(rollYards)} yd.`;
  updateHud();
  return true;
};

const skillBaseHitShot = hitShot;
hitShot = startSkillShot;

const skillBaseDraw = draw;
draw = function drawWithSkillBar() {
  skillBaseDraw();
  drawSkillBar();
  drawSkillFeedback();
};

canvas.addEventListener("pointerdown", (event) => {
  if (!skillShot) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  resolveSkillShot(getSkillMarkerPosition());
}, { capture: true });

resetShotButton.addEventListener("click", () => {
  skillShot = null;
  skillFeedback = null;
});

newHoleButton.addEventListener("click", () => {
  skillShot = null;
  skillFeedback = null;
});
