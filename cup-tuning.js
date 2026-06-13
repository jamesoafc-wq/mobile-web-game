// Cup difficulty tuning.
// Loaded last so approach shots are harder to hole before the green zoom/putting phase.

const normalCupRadiusForPutting = course.hole.r;
const approachCupRadiusForUpdate = -2; // main engine adds +5px, so this gives ~3px capture before putting.

function isGreenZoomPuttingPhase() {
  return selectedClub === "putter" && surfaceAt(ball.x, ball.y) === "green" && !ball.holed;
}

const baseUpdateBallForCupTuning = updateBall;

updateBall = function updateBallWithCupTuning() {
  const originalCupRadius = course.hole.r;
  const usePuttingCup = isGreenZoomPuttingPhase();

  // Make accidental/chip-in/approach hole-outs much rarer before zoomed putting.
  // The visual cup radius is restored immediately after physics updates.
  course.hole.r = usePuttingCup ? normalCupRadiusForPutting : approachCupRadiusForUpdate;

  baseUpdateBallForCupTuning();

  course.hole.r = originalCupRadius;
};
