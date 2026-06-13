// Cup difficulty tuning.
// Loaded last so approach shots are harder to hole before the green zoom/putting phase.

const originalVisualCupRadius = course.hole.r;
const slowPuttCupRadius = 1.2; // main engine adds +5px, so slow putts get ~6.2px capture.
const approachCupRadiusForUpdate = -3.6; // approach/chip-ins get ~1.4px capture before putting.
const fastPuttCupRadius = -4.4; // fast putts get ~0.6px capture: nearly dead-centre only.
const mediumPuttCupRadius = -2.2; // medium putts get ~2.8px capture.
const zoomedVisualCupRadius = 4.2;

function isGreenZoomPuttingPhase() {
  return selectedClub === "putter" && surfaceAt(ball.x, ball.y) === "green" && !ball.holed;
}

function getPuttingCupRadiusForSpeed() {
  const speed = Math.hypot(ball.vx, ball.vy);

  if (speed > 0.58) return fastPuttCupRadius;
  if (speed > 0.28) return mediumPuttCupRadius;
  return slowPuttCupRadius;
}

const baseUpdateBallForCupTuning = updateBall;

updateBall = function updateBallWithCupTuning() {
  const originalCupRadius = course.hole.r;
  const usePuttingCup = isGreenZoomPuttingPhase();

  // Make accidental/chip-in/approach hole-outs much rarer before zoomed putting.
  // During putting, the cup also becomes much less forgiving if the ball is travelling too fast.
  // The visual cup radius is restored immediately after physics updates.
  course.hole.r = usePuttingCup ? getPuttingCupRadiusForSpeed() : approachCupRadiusForUpdate;

  baseUpdateBallForCupTuning();

  course.hole.r = originalCupRadius;
};

// Draw a smaller-looking cup during putting zoom without changing the normal course view.
drawCup = function drawCupWithPuttingTuning() {
  const { x, y } = course.hole;
  const visualRadius = isPuttingView() ? zoomedVisualCupRadius : originalVisualCupRadius;

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
  ctx.arc(x, y, visualRadius, 0, Math.PI * 2);
  ctx.fill();
};
