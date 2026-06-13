// Cup difficulty tuning.
// Loaded last so approach shots are harder to hole before the green zoom/putting phase.

const normalCupRadiusForPutting = course.hole.r;
const approachCupRadiusForUpdate = -2; // main engine adds +5px, so this gives ~3px capture before putting.
const fastPuttCupRadius = -3; // gives ~2px capture while the ball is moving too fast.
const mediumPuttCupRadius = 2; // gives ~7px capture for decent but firm pace.

function isGreenZoomPuttingPhase() {
  return selectedClub === "putter" && surfaceAt(ball.x, ball.y) === "green" && !ball.holed;
}

function getPuttingCupRadiusForSpeed() {
  const speed = Math.hypot(ball.vx, ball.vy);

  if (speed > 0.62) return fastPuttCupRadius;
  if (speed > 0.34) return mediumPuttCupRadius;
  return normalCupRadiusForPutting;
}

const baseUpdateBallForCupTuning = updateBall;

updateBall = function updateBallWithCupTuning() {
  const originalCupRadius = course.hole.r;
  const usePuttingCup = isGreenZoomPuttingPhase();

  // Make accidental/chip-in/approach hole-outs much rarer before zoomed putting.
  // During putting, the cup also becomes less forgiving if the ball is travelling too fast.
  // The visual cup radius is restored immediately after physics updates.
  course.hole.r = usePuttingCup ? getPuttingCupRadiusForSpeed() : approachCupRadiusForUpdate;

  baseUpdateBallForCupTuning();

  course.hole.r = originalCupRadius;
};
