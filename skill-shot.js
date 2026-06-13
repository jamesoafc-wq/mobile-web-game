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
  const error = marker - center;
  const absError = Math.abs(error);

  if (absError <= halfSweet) {
    return {
      name: "Perfect strike",
      carryMultiplier: 1,
      accuracyMultiplier: 0.32,
      timingDegrees: 0,
      miss: 0
    };
  }

  const miss = clamp((absError - halfSweet) / (0.5 - halfSweet), 0, 1);
  const side = Math.sign(error) || 1;
  const difficulty = skillShot.difficulty;

  let name = "Good contact";
  if (miss > 0.35) name = "Poor contact";
  if (miss > 0.68) name = side < 0 ? "Hooked it" : "Sliced it";

  return {
    name,
    carryMultiplier: clamp(1 - miss * (0.18 + difficulty * 0.22), 0.58, 0.98),
    accuracyMultiplier: clamp(0.8 + miss * 2.2 + difficulty * 0.7, 0.8, 3.2),
    timingDegrees: side * (1.5 + miss * 12 + difficulty * 6),
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
    height: club.flightHeight
  };

  message = `${result.name}. Carry: ${Math.round(shotYards)} yd.`;
  updateHud();
}

function drawSkillBar() {
  if (!skillShot) return;

  const marker = getSkillMarkerPosition();
  const panelW = 390;
  const panelH = 82;
  const panelX = (W - panelW) / 2;
  const panelY = H - 116;
  const barX = panelX + 28;
  const barY = panelY + 43;
  const barW = panelW - 56;
  const barH = 18;
  const sweetX = barX + (skillShot.center - skillShot.sweetWidth / 2) * barW;
  const sweetW = skillShot.sweetWidth * barW;
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

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  roundRect(barX, barY, barW, barH, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 209, 92, 0.75)";
  roundRect(barX + barW * 0.28, barY, barW * 0.44, barH, 10);
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
  ctx.fillText(`Sweet spot: ${Math.round(skillShot.sweetWidth * 100)}%`, W / 2, panelY + 73);

  ctx.restore();
}

const skillBaseHitShot = hitShot;
hitShot = startSkillShot;

const skillBaseDraw = draw;
draw = function drawWithSkillBar() {
  skillBaseDraw();
  drawSkillBar();
};

canvas.addEventListener("pointerdown", (event) => {
  if (!skillShot) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  resolveSkillShot(getSkillMarkerPosition());
}, { capture: true });

resetShotButton.addEventListener("click", () => {
  skillShot = null;
});

newHoleButton.addEventListener("click", () => {
  skillShot = null;
});
