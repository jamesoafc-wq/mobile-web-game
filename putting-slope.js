// Putting slope layer.
// Adds readable green breaks using the same slope zones for arrows and ball physics.
// Future holes can swap in their own greenSlopeZones array while reusing this renderer/physics.

const greenSlopeZones = [
  {
    x: 214,
    y: 112,
    rx: 104,
    ry: 42,
    rotation: -0.22,
    dx: 0.72,
    dy: 0.02,
    strength: 0.0011,
    label: "Gentle fall right"
  },
  {
    x: 292,
    y: 78,
    rx: 78,
    ry: 36,
    rotation: 0.18,
    dx: -0.58,
    dy: 0.08,
    strength: 0.00095,
    label: "Upper shelf left"
  },
  {
    x: 245,
    y: 142,
    rx: 96,
    ry: 30,
    rotation: 0.08,
    dx: 0.08,
    dy: -0.44,
    strength: 0.00072,
    label: "Back-to-front grain"
  }
];

function ellipseFalloff(point, ellipse) {
  const rotation = ellipse.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = point.x - ellipse.x;
  const dy = point.y - ellipse.y;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  const amount = (localX * localX) / (ellipse.rx * ellipse.rx) + (localY * localY) / (ellipse.ry * ellipse.ry);

  if (amount > 1) return 0;
  return Math.pow(1 - amount, 1.15);
}

function getGreenSlopeAt(x, y) {
  const point = { x, y };
  if (!pointInEllipse(point, course.green)) return { x: 0, y: 0, strength: 0 };

  let slopeX = 0;
  let slopeY = 0;

  greenSlopeZones.forEach((zone) => {
    const falloff = ellipseFalloff(point, zone);
    if (falloff <= 0) return;

    const length = Math.hypot(zone.dx, zone.dy) || 1;
    slopeX += (zone.dx / length) * zone.strength * falloff;
    slopeY += (zone.dy / length) * zone.strength * falloff;
  });

  return {
    x: slopeX,
    y: slopeY,
    strength: Math.hypot(slopeX, slopeY)
  };
}

function settleSlowGreenRoll() {
  if (!ball.moving || ball.holed || ball.flight || ball.bounce) return;
  if (surfaceAt(ball.x, ball.y) !== "green") return;

  const speed = Math.hypot(ball.vx, ball.vy);

  // Prevent tiny slope nudges from creating near-endless trickle.
  if (speed < 0.052) {
    ball.vx = 0;
    ball.vy = 0;
    ball.visualScale = 1;
    ball.moving = false;
    lastSafe = { x: ball.x, y: ball.y };
    updateSuggestedClub("green");
    message = "On the green. Read the slope and pace.";
    updateHud();
    return;
  }

  if (speed < 0.095) {
    ball.vx *= 0.76;
    ball.vy *= 0.76;
  }
}

function applyGreenSlopeToPutt() {
  if (!ball.moving || ball.holed || ball.flight || ball.bounce) return;
  if (surfaceAt(ball.x, ball.y) !== "green") return;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed < 0.052) return;

  const slope = getGreenSlopeAt(ball.x, ball.y);
  if (slope.strength <= 0.00008) return;

  const lowSpeedBreak = clamp(0.62 - speed * 0.32, 0.16, 0.64);

  ball.vx += slope.x * lowSpeedBreak;
  ball.vy += slope.y * lowSpeedBreak;
}

function drawFlowSegment(x, y, ux, uy, strength, lanePhase) {
  const pathLength = clamp(17 + strength * 1900, 17, 25);
  const dashLength = clamp(5.5 + strength * 1100, 5.5, 9);
  const t = lanePhase;
  const edgeFade = Math.sin(t * Math.PI);
  if (edgeFade <= 0.04) return;

  const centerOffset = (t - 0.5) * pathLength;
  const cx = x + ux * centerOffset;
  const cy = y + uy * centerOffset;
  const startX = cx - ux * dashLength * 0.5;
  const startY = cy - uy * dashLength * 0.5;
  const endX = cx + ux * dashLength * 0.5;
  const endY = cy + uy * dashLength * 0.5;

  ctx.globalAlpha = clamp((0.12 + strength * 120) * edgeFade, 0.04, 0.38);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.globalAlpha *= 0.78;
  ctx.beginPath();
  ctx.arc(endX, endY, clamp(0.85 + strength * 280, 0.85, 1.45), 0, Math.PI * 2);
  ctx.fill();
}

function drawSlopeDash(x, y, slope, index) {
  const strength = slope.strength;
  if (strength <= 0.00008) return;

  const length = Math.hypot(slope.x, slope.y) || 1;
  const ux = slope.x / length;
  const uy = slope.y / length;
  const basePhase = (performance.now() / 2100 + index * 0.041) % 1;

  ctx.save();
  ctx.strokeStyle = "rgba(245, 255, 220, 0.92)";
  ctx.fillStyle = "rgba(245, 255, 220, 0.92)";
  ctx.lineWidth = clamp(0.9 + strength * 330, 0.9, 1.35);
  ctx.lineCap = "round";

  // Conveyor-style flow: segments fade in at the back and fade out at the front.
  // The reset happens only at zero alpha, avoiding the old snap-back look.
  for (let i = 0; i < 3; i += 1) {
    const lanePhase = (basePhase + i / 3) % 1;
    drawFlowSegment(x, y, ux, uy, strength, lanePhase);
  }

  ctx.restore();
}

function drawGreenSlopeArrows() {
  if (!isPuttingView()) return;

  const camera = getCamera();
  let index = 0;

  ctx.save();
  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.tx, camera.ty);

  drawEllipse(course.green, "rgba(255,255,255,0.014)", "rgba(255,255,255,0.1)", 1);

  // The grid walks the full green bounding box, so it scales to future green shapes.
  for (let y = course.green.y - course.green.ry + 10; y <= course.green.y + course.green.ry - 8; y += 16) {
    const rowOffset = index % 2 === 0 ? 0 : 10;
    for (let x = course.green.x - course.green.rx + 12 + rowOffset; x <= course.green.x + course.green.rx - 10; x += 20) {
      if (surfaceAt(x, y) !== "green") continue;
      const slope = getGreenSlopeAt(x, y);
      drawSlopeDash(x, y, slope, index);
      index += 1;
    }
  }

  ctx.restore();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(9, 22, 9, 0.58)";
  roundRect(W - 126, 14, 112, 28, 14);
  ctx.fill();
  ctx.fillStyle = "#eef8c8";
  ctx.font = "800 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Green read", W - 70, 32);
  ctx.restore();
}

const baseUpdateBallForPuttingSlope = updateBall;
updateBall = function updateBallWithPuttingSlope() {
  baseUpdateBallForPuttingSlope();
  applyGreenSlopeToPutt();
  settleSlowGreenRoll();
};

const baseDrawForPuttingSlope = draw;
draw = function drawWithPuttingSlopes() {
  baseDrawForPuttingSlope();
  drawGreenSlopeArrows();
};
