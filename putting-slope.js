// Putting slope layer.
// Adds readable green breaks using the same slope zones for arrows and ball physics.

const greenSlopeZones = [
  {
    x: 212,
    y: 103,
    rx: 88,
    ry: 44,
    rotation: -0.35,
    dx: 0.72,
    dy: 0.08,
    strength: 0.0058,
    label: "Falls right"
  },
  {
    x: 286,
    y: 88,
    rx: 74,
    ry: 38,
    rotation: 0.25,
    dx: -0.68,
    dy: 0.18,
    strength: 0.0054,
    label: "Feeds left"
  },
  {
    x: 252,
    y: 128,
    rx: 82,
    ry: 34,
    rotation: 0.05,
    dx: 0.2,
    dy: -0.62,
    strength: 0.0044,
    label: "Back tier"
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
  return Math.pow(1 - amount, 0.72);
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

function applyGreenSlopeToPutt() {
  if (!ball.moving || ball.holed || ball.flight || ball.bounce) return;
  if (surfaceAt(ball.x, ball.y) !== "green") return;

  const slope = getGreenSlopeAt(ball.x, ball.y);
  if (slope.strength <= 0.0002) return;

  const speed = Math.hypot(ball.vx, ball.vy);
  const lowSpeedBreak = clamp(1.65 - speed, 0.45, 1.85);

  ball.vx += slope.x * lowSpeedBreak;
  ball.vy += slope.y * lowSpeedBreak;
}

function drawSlopeArrow(x, y, slope, index) {
  const strength = slope.strength;
  if (strength <= 0.0003) return;

  const length = Math.hypot(slope.x, slope.y) || 1;
  const ux = slope.x / length;
  const uy = slope.y / length;
  const phase = (performance.now() / 850 + index * 0.17) % 1;
  const arrowLength = clamp(14 + strength * 2400, 14, 27);
  const drift = (phase - 0.5) * 9;
  const startX = x - ux * arrowLength * 0.5 + ux * drift;
  const startY = y - uy * arrowLength * 0.5 + uy * drift;
  const endX = x + ux * arrowLength * 0.5 + ux * drift;
  const endY = y + uy * arrowLength * 0.5 + uy * drift;
  const head = clamp(4 + strength * 850, 4, 8);
  const px = -uy;
  const py = ux;

  ctx.save();
  ctx.globalAlpha = clamp(0.28 + strength * 95, 0.28, 0.72);
  ctx.strokeStyle = "rgba(255, 248, 173, 0.95)";
  ctx.fillStyle = "rgba(255, 248, 173, 0.95)";
  ctx.lineWidth = clamp(1.2 + strength * 260, 1.2, 2.6);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - ux * head + px * head * 0.58, endY - uy * head + py * head * 0.58);
  ctx.lineTo(endX - ux * head - px * head * 0.58, endY - uy * head - py * head * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGreenSlopeArrows() {
  if (!isPuttingView()) return;

  const camera = getCamera();
  let index = 0;

  ctx.save();
  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.tx, camera.ty);

  ctx.fillStyle = "rgba(7, 24, 8, 0.24)";
  drawEllipse(course.green, "rgba(255,255,255,0.035)", "rgba(255,255,255,0.18)", 1);

  for (let y = course.green.y - course.green.ry + 12; y <= course.green.y + course.green.ry - 8; y += 20) {
    for (let x = course.green.x - course.green.rx + 14; x <= course.green.x + course.green.rx - 10; x += 24) {
      if (surfaceAt(x, y) !== "green") continue;
      const slope = getGreenSlopeAt(x, y);
      drawSlopeArrow(x, y, slope, index);
      index += 1;
    }
  }

  ctx.restore();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(9, 22, 9, 0.78)";
  roundRect(W - 138, 14, 124, 30, 15);
  ctx.fill();
  ctx.fillStyle = "#fff7a8";
  ctx.font = "800 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Slope arrows", W - 76, 34);
  ctx.restore();
}

const baseUpdateBallForPuttingSlope = updateBall;
updateBall = function updateBallWithPuttingSlope() {
  baseUpdateBallForPuttingSlope();
  applyGreenSlopeToPutt();
};

const baseDrawForPuttingSlope = draw;
draw = function drawWithPuttingSlopes() {
  baseDrawForPuttingSlope();
  drawGreenSlopeArrows();
};
