// Bunker behaviour tuning.
// Loaded after game.js so we can tune bunker physics without rewriting the full prototype engine.

surfaces.sand.friction = 0.45;
surfaces.sand.roll = 0;
surfaces.sand.bounce = 0.01;

const baseUpdateBallForSand = updateBall;

updateBall = function updateBallWithDeadSand() {
  baseUpdateBallForSand();

  if (!ball.moving || ball.holed || ball.flight || ball.bounce) return;

  const surfaceKey = surfaceAt(ball.x, ball.y);
  if (surfaceKey !== "sand") return;

  ball.vx = 0;
  ball.vy = 0;
  ball.visualScale = 1;
  ball.moving = false;
  lastSafe = { x: ball.x, y: ball.y };
  updateSuggestedClub("sand");
  message = "Plugged in the bunker. No bounce or roll from sand.";
  updateHud();
};
