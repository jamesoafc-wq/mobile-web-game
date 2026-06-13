const canvas = document.querySelector("#course");
const ctx = canvas.getContext("2d");

const strokesEl = document.querySelector("#strokes");
const lieEl = document.querySelector("#lie");
const clubEl = document.querySelector("#club");
const distanceEl = document.querySelector("#distance");
const powerEl = document.querySelector("#power");
const hintEl = document.querySelector("#hint");
const clubButtons = [...document.querySelectorAll("[data-club]")];
const resetShotButton = document.querySelector("#resetShot");
const newHoleButton = document.querySelector("#newHole");

const W = canvas.width;
const H = canvas.height;
const YARDS_PER_PIXEL = 0.72;
const MAX_DRAG = 105;

const clubs = {
  driver: {
    name: "Driver",
    short: "DR",
    accuracy: 10,
    type: "full",
    rollBias: 1.25,
    carry: { tee: 300, fairway: 235, rough: 75, sand: 0, green: 35 }
  },
  wood3: {
    name: "3 Wood",
    short: "3W",
    accuracy: 8,
    type: "full",
    rollBias: 1.1,
    carry: { tee: 255, fairway: 225, rough: 95, sand: 0, green: 30 }
  },
  iron5: {
    name: "5 Iron",
    short: "5I",
    accuracy: 6,
    type: "full",
    rollBias: 0.75,
    carry: { tee: 190, fairway: 180, rough: 130, sand: 35, green: 22 }
  },
  iron7: {
    name: "7 Iron",
    short: "7I",
    accuracy: 4.8,
    type: "full",
    rollBias: 0.55,
    carry: { tee: 160, fairway: 150, rough: 115, sand: 45, green: 18 }
  },
  wedgeP: {
    name: "Pitching Wedge",
    short: "PW",
    accuracy: 3.7,
    type: "full",
    rollBias: 0.32,
    carry: { tee: 110, fairway: 105, rough: 85, sand: 55, green: 14 }
  },
  wedgeS: {
    name: "Sand Wedge",
    short: "SW",
    accuracy: 4.2,
    type: "full",
    rollBias: 0.2,
    carry: { tee: 85, fairway: 80, rough: 65, sand: 70, green: 12 }
  },
  putter: {
    name: "Putter",
    short: "PT",
    accuracy: 1.2,
    type: "putt",
    rollBias: 1,
    carry: { tee: 30, fairway: 25, rough: 10, sand: 0, green: 55 }
  }
};

const surfaces = {
  tee: { label: "Tee", accuracy: 1, friction: 0.982, roll: 0.16 },
  fairway: { label: "Fairway", accuracy: 1, friction: 0.982, roll: 0.18 },
  rough: { label: "Rough", accuracy: 1.65, friction: 0.955, roll: 0.06 },
  sand: { label: "Sand", accuracy: 2.15, friction: 0.92, roll: 0.015 },
  green: { label: "Green", accuracy: 0.78, friction: 0.988, roll: 0.28 },
  water: { label: "Water", accuracy: 10, friction: 0.85, roll: 0 }
};

const course = {
  tee: { x: 198, y: 556, w: 84, h: 45 },
  fairway: [
    { x: 230, y: 620 },
    { x: 326, y: 582 },
    { x: 356, y: 508 },
    { x: 316, y: 420 },
    { x: 254, y: 336 },
    { x: 288, y: 238 },
    { x: 315, y: 145 },
    { x: 256, y: 82 },
    { x: 175, y: 126 },
    { x: 164, y: 226 },
    { x: 190, y: 327 },
    { x: 126, y: 429 },
    { x: 151, y: 535 }
  ],
  green: { x: 246, y: 86, rx: 76, ry: 53 },
  hole: { x: 252, y: 82, r: 7 },
  water: { x: 362, y: 430, rx: 58, ry: 76, rotation: -0.1 },
  bunkers: [
    { x: 164, y: 94, rx: 43, ry: 24, rotation: -0.38 },
    { x: 326, y: 116, rx: 45, ry: 24, rotation: 0.32 },
    { x: 118, y: 399, rx: 42, ry: 29, rotation: 0.18 }
  ],
  trees: [
    { x: 64, y: 112 }, { x: 92, y: 174 }, { x: 393, y: 152 }, { x: 414, y: 224 },
    { x: 61, y: 290 }, { x: 84, y: 510 }, { x: 405, y: 585 }, { x: 384, y: 658 }
  ]
};

const ball = {
  x: 240,
  y: 579,
  vx: 0,
  vy: 0,
  r: 6,
  moving: false,
  holed: false,
  flight: null
};

let selectedClub = "driver";
let strokes = 0;
let message = "Pull back from the ball, aim, then release.";
let previousSafe = { x: ball.x, y: ball.y };
let lastSafe = { x: ball.x, y: ball.y };
let drag = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInEllipse(point, ellipse) {
  const rotation = ellipse.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = point.x - ellipse.x;
  const dy = point.y - ellipse.y;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  return (localX * localX) / (ellipse.rx * ellipse.rx) + (localY * localY) / (ellipse.ry * ellipse.ry) <= 1;
}

function surfaceAt(x, y) {
  const point = { x, y };
  if (x < 0 || x > W || y < 0 || y > H) return "water";
  if (pointInEllipse(point, course.water)) return "water";
  if (pointInEllipse(point, course.green)) return "green";
  if (course.bunkers.some((bunker) => pointInEllipse(point, bunker))) return "sand";
  if (pointInRect(point, course.tee)) return "tee";
  if (pointInPolygon(point, course.fairway)) return "fairway";
  return "rough";
}

function getMaxCarry(clubKey = selectedClub, surfaceKey = surfaceAt(ball.x, ball.y)) {
  return clubs[clubKey].carry[surfaceKey] ?? 0;
}

function getCurrentPower() {
  if (!drag) return 0;
  return clamp(distance(ball, drag) / MAX_DRAG, 0, 1);
}

function drawEllipse(shape, fillStyle, strokeStyle = null, lineWidth = 1) {
  ctx.save();
  ctx.translate(shape.x, shape.y);
  ctx.rotate(shape.rotation || 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, shape.rx, shape.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCourse() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#2f6b28";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#163612";
  ctx.lineWidth = 8;
  for (let y = -20; y < H + 40; y += 36) {
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(W + 20, y + 24);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  course.fairway.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fillStyle = "#69b856";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();

  drawEllipse(course.green, "#86d56d", "rgba(255,255,255,0.25)", 2);

  course.bunkers.forEach((bunker) => {
    drawEllipse(bunker, "#dcc479", "rgba(84, 66, 24, 0.28)", 2);
  });

  drawEllipse(course.water, "#3c89c9", "rgba(207,238,255,0.4)", 2);

  ctx.fillStyle = "#75d064";
  roundRect(course.tee.x, course.tee.y, course.tee.w, course.tee.h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.stroke();

  drawTrees();
  drawCup();
}

function drawTrees() {
  for (const tree of course.trees) {
    ctx.fillStyle = "#174d1c";
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f3513";
    ctx.beginPath();
    ctx.arc(tree.x + 5, tree.y + 3, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCup() {
  const { x, y, r } = course.hole;
  ctx.strokeStyle = "#f7f7f7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 32);
  ctx.stroke();

  ctx.fillStyle = "#f44848";
  ctx.beginPath();
  ctx.moveTo(x, y - 32);
  ctx.lineTo(x + 22, y - 24);
  ctx.lineTo(x, y - 17);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall() {
  if (ball.holed) return;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAim() {
  if (!drag || ball.moving || ball.holed) return;

  const surfaceKey = surfaceAt(ball.x, ball.y);
  const maxCarryYards = getMaxCarry(selectedClub, surfaceKey);
  const power = getCurrentPower();
  const pullX = ball.x - drag.x;
  const pullY = ball.y - drag.y;
  const pullDistance = Math.hypot(pullX, pullY);
  if (pullDistance < 4) return;

  const club = clubs[selectedClub];
  const angle = Math.atan2(pullY, pullX);
  const carryYards = maxCarryYards * power;
  const lineLength = carryYards / YARDS_PER_PIXEL;
  const targetX = ball.x + Math.cos(angle) * lineLength;
  const targetY = ball.y + Math.sin(angle) * lineLength;

  ctx.save();

  if (maxCarryYards <= 0) {
    ctx.strokeStyle = "rgba(255, 105, 105, 0.92)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "800 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("No carry", ball.x, ball.y - 36);
  } else {
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = club.type === "putt" ? "rgba(255,245,170,0.9)" : "rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(targetX, targetY, club.type === "putt" ? 6 : 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(14, 27, 11, 0.82)";
    roundRect(targetX - 43, targetY - 36, 86, 24, 12);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 12px system-ui";
    ctx.textAlign = "center";
    const label = club.type === "putt" ? "Roll" : "Carry";
    ctx.fillText(`${label} ${Math.round(carryYards)}y`, targetX, targetY - 20);
  }

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(drag.x, drag.y, 12 + power * 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#10200c";
  ctx.font = "700 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(power * 100)}%`, drag.x, drag.y + 6);
  ctx.restore();
}

function draw() {
  drawCourse();
  drawAim();
  drawBall();

  if (ball.holed) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 34px system-ui";
    ctx.fillText("Holed out!", W / 2, H / 2 - 12);
    ctx.font = "600 18px system-ui";
    ctx.fillText(`Score: ${strokes} strokes`, W / 2, H / 2 + 24);
    ctx.restore();
  }
}

function hitShot(pointer) {
  if (!drag || ball.moving || ball.holed) return;

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
  const surface = surfaces[surfaceKey];
  const club = clubs[selectedClub];
  const maxCarryYards = getMaxCarry(selectedClub, surfaceKey);

  if (maxCarryYards <= 0) {
    message = `${club.name} has no playable distance from ${surface.label}. Choose another club.`;
    updateHud();
    return;
  }

  previousSafe = { x: ball.x, y: ball.y };

  const baseAngle = Math.atan2(pullY, pullX);
  const random = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  const missAngle = degreesToRadians(random * club.accuracy * surface.accuracy * (0.35 + power));
  const angle = baseAngle + missAngle;

  strokes += 1;

  if (club.type === "putt") {
    const rollYards = maxCarryYards * power;
    launchRoll(angle, rollYards, surfaceKey);
    message = `Putter from ${surface.label}. Max roll here: ${maxCarryYards} yd.`;
    updateHud();
    return;
  }

  const carryYards = maxCarryYards * power;
  const carryPixels = carryYards / YARDS_PER_PIXEL;
  const landingX = ball.x + Math.cos(angle) * carryPixels;
  const landingY = ball.y + Math.sin(angle) * carryPixels;

  ball.moving = true;
  ball.flight = {
    startX: ball.x,
    startY: ball.y,
    landingX,
    landingY,
    progress: 0,
    duration: clamp(18 + carryPixels / 9, 20, 58),
    angle,
    carryYards,
    clubKey: selectedClub
  };

  message = `${club.name} from ${surface.label}. Carry target: ${Math.round(carryYards)} yd.`;
  updateHud();
}

function launchRoll(angle, rollYards, surfaceKey) {
  const surface = surfaces[surfaceKey];
  const rollPixels = Math.max(0, rollYards / YARDS_PER_PIXEL);
  const initialSpeed = rollPixels * (1 - surface.friction) * 1.35;

  ball.vx = Math.cos(angle) * initialSpeed;
  ball.vy = Math.sin(angle) * initialSpeed;
  ball.moving = true;
  ball.flight = null;
}

function updateFlight() {
  if (!ball.flight) return false;

  const shot = ball.flight;
  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  ball.x = shot.startX + (shot.landingX - shot.startX) * ease;
  ball.y = shot.startY + (shot.landingY - shot.startY) * ease;

  if (t < 1) return true;

  ball.flight = null;

  const landingSurfaceKey = surfaceAt(ball.x, ball.y);
  if (landingSurfaceKey === "water") {
    takePenalty("Water hazard. One-stroke penalty and ball returned to previous lie.");
    return true;
  }

  const landingSurface = surfaces[landingSurfaceKey];
  const club = clubs[shot.clubKey];
  const bounceLuck = 0.75 + Math.random() * 0.45;
  const rollYards = shot.carryYards * landingSurface.roll * club.rollBias * bounceLuck;

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
}

function updateBall() {
  if (!ball.moving || ball.holed) return;

  if (updateFlight()) return;

  ball.x += ball.vx;
  ball.y += ball.vy;

  const surfaceKey = surfaceAt(ball.x, ball.y);

  if (surfaceKey === "water") {
    takePenalty("Water hazard. One-stroke penalty and ball returned to previous lie.");
    return;
  }

  const surface = surfaces[surfaceKey];
  ball.vx *= surface.friction;
  ball.vy *= surface.friction;

  const speed = Math.hypot(ball.vx, ball.vy);
  const distToCup = distance(ball, course.hole);

  if (surfaceKey === "green" && distToCup <= course.hole.r + 5 && speed < 1.25) {
    ball.holed = true;
    ball.moving = false;
    ball.vx = 0;
    ball.vy = 0;
    message = `Holed out in ${strokes}.`;
    updateHud();
    return;
  }

  if (speed < 0.045) {
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    updateSuggestedClub(surfaceKey);
    message = nextLieMessage(surfaceKey);
    updateHud();
  }
}

function takePenalty(text) {
  strokes += 1;
  ball.x = previousSafe.x;
  ball.y = previousSafe.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.moving = false;
  ball.flight = null;
  message = text;
  updateHud();
}

function nextLieMessage(surfaceKey) {
  if (surfaceKey === "green") return "On the green. Putter selected for a putting stroke.";
  if (surfaceKey === "sand") return "In the bunker. Sand wedge is usually safest; Driver and 3W have no carry here.";
  if (surfaceKey === "rough") return "In the rough. Longer clubs lose a lot of carry and accuracy here.";
  if (surfaceKey === "fairway") return "Fairway lie. Full clubs carry much better from here.";
  if (surfaceKey === "tee") return "Tee shot. Driver has its full carry from here.";
  return "Ready for the next shot.";
}

function updateSuggestedClub(surfaceKey) {
  if (surfaceKey === "green") setClub("putter", false);
  if (surfaceKey === "sand") setClub("wedgeS", false);
}

function updateHud() {
  const surfaceKey = surfaceAt(ball.x, ball.y);
  const surface = surfaces[surfaceKey];
  const club = clubs[selectedClub];
  const pinDistance = Math.round(distance(ball, course.hole) * YARDS_PER_PIXEL);
  const maxCarry = getMaxCarry(selectedClub, surfaceKey);
  const power = getCurrentPower();
  const projected = Math.round(maxCarry * power);

  strokesEl.textContent = strokes;
  lieEl.textContent = surface.label;
  clubEl.textContent = club.name;
  distanceEl.textContent = `${pinDistance} yd`;
  hintEl.textContent = message;

  if (drag) {
    const label = club.type === "putt" ? "roll" : "carry";
    powerEl.textContent = `${Math.round(power * 100)}% · ${projected}y ${label}`;
  } else {
    const label = club.type === "putt" ? "roll" : "carry";
    powerEl.textContent = maxCarry > 0 ? `Max ${maxCarry}y ${label}` : "No shot";
  }
}

function getPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * W, 0, W),
    y: clamp(((event.clientY - rect.top) / rect.height) * H, 0, H)
  };
}

function setClub(clubKey, updateMessage = true) {
  selectedClub = clubKey;
  clubButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.club === clubKey);
  });

  if (updateMessage) {
    const surfaceKey = surfaceAt(ball.x, ball.y);
    const maxCarry = getMaxCarry(clubKey, surfaceKey);
    const label = clubs[clubKey].type === "putt" ? "max roll" : "max carry";
    message = maxCarry > 0
      ? `${clubs[clubKey].name} selected. ${label}: ${maxCarry} yd from ${surfaces[surfaceKey].label}.`
      : `${clubs[clubKey].name} selected. No playable distance from ${surfaces[surfaceKey].label}.`;
  }

  updateHud();
}

function resetBallToSafe() {
  ball.x = lastSafe.x;
  ball.y = lastSafe.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.moving = false;
  ball.holed = false;
  ball.flight = null;
  message = "Ball reset to last safe resting spot.";
  updateHud();
}

function restartHole() {
  ball.x = 240;
  ball.y = 579;
  ball.vx = 0;
  ball.vy = 0;
  ball.moving = false;
  ball.holed = false;
  ball.flight = null;
  strokes = 0;
  selectedClub = "driver";
  previousSafe = { x: ball.x, y: ball.y };
  lastSafe = { x: ball.x, y: ball.y };
  message = "Pull back from the ball, aim, then release. The dotted line now shows carry distance, not total roll.";
  clubButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.club === selectedClub);
  });
  updateHud();
}

canvas.addEventListener("pointerdown", (event) => {
  if (ball.moving || ball.holed) return;
  canvas.setPointerCapture(event.pointerId);
  drag = getPointer(event);
  updateHud();
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag || ball.moving || ball.holed) return;
  drag = getPointer(event);
  updateHud();
});

canvas.addEventListener("pointerup", (event) => {
  if (!drag) return;
  hitShot(getPointer(event));
});

canvas.addEventListener("pointercancel", () => {
  drag = null;
  updateHud();
});

clubButtons.forEach((button) => {
  button.addEventListener("click", () => setClub(button.dataset.club));
});

resetShotButton.addEventListener("click", resetBallToSafe);
newHoleButton.addEventListener("click", restartHole);

function loop() {
  updateBall();
  draw();
  requestAnimationFrame(loop);
}

restartHole();
loop();
