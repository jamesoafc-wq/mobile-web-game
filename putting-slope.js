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
    strength: 0.00125,
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
    strength: 0.00105,
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
    strength: 0.00082,
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

function applyGreenSlopeToPutt() {
  if (!ball.moving || ball.holed || ball.flight || ball.bounce) return;
  if (surfaceAt(ball.x, ball.y) !== "green") return;

  const slope = getGreenSlopeAt(ball.x, ball.y);
  if (slope.strength <= 0.00008) return;

  const speed = Math.hypot(ball.vx, ball.vy);
  const lowSpeedBreak = clamp(0.78 - speed * 0.38, 0.22, 0.82);

  ball.vx += slope.x * lowSpeedBreak;
  ball.vy += slope.y * lowSpeedBreak;
}

function drawSlopeDash(x, y, slope, index) {
  const strength = slope.strength;
  if (strength <= 0.00008) return;

  const length = Math.hypot(slope.x, slope.y) || 1;
  const ux = slope.x / length;
  const uy = slope.y / length;
  const phase = (performance.now() / 1550 + index * 0.07) % 1;
  const dashLength = clamp(9 + strength * 2200, 9, 15);
  const drift = (phase - 0.5) * 5;
  const cx = x + ux * drift;
  const cy = y + uy * drift;
  const startX = cx - ux * dashLength * 0.5;
  const startY = cy - uy * dashLength * 0.5;
  const endX = cx + ux * dashLength * 0.5;
  const endY = cy + uy * dashLength * 0.5;

  ctx.save();
  ctx.globalAlpha = clamp(0.18 + strength * 170, 0.18, 0.46);
  ctx.strokeStyle = "rgba(245, 255, 215, 0.92)";
  ctx.lineWidth = clamp(1 + strength * 520, 1, 1.8);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Tiny leading dot gives direction without ugly arrowheads.
  ctx.globalAlpha *= 0.78;
  ctx.fillStyle = "rgba(245, 255, 215, 0.92)";
  ctx.beginPath();
  ctx.arc(endX, endY, clamp(1 + strength * 380, 1, 1.8), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGreenSlopeArrows() {
  if (!isPuttingView()) return;

  const camera = getCamera();
  let index = 0;

  ctx.save();
  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.tx, camera.ty);

  drawEllipse(course.green, "rgba(255,255,255,0.018)", "rgba(255,255,255,0.12)", 1);

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
  ctx.fillStyle = "rgba(9, 22, 9, 0.64)";
  roundRect(W - 128, 14, 114, 28, 14);
  ctx.fill();
  ctx.fillStyle = "#eef8c8";
  ctx.font = "800 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Green read", W - 71, 32);
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
