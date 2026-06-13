// Bunker behaviour tuning.
// Loaded after game.js so we can tune bunker physics without rewriting the full prototype engine.

surfaces.sand.friction = 0.45;
surfaces.sand.roll = 0;
surfaces.sand.bounce = 0.01;

let lastRollingPositionForSand = { x: ball.x, y: ball.y };

function findSandCrossingPoint(from, to) {
  const steps = Math.max(8, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 2));

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;

    if (surfaceAt(x, y) === "sand") {
      return { x, y };
    }
  }

  return null;
}

function stopBallInSand(point) {
  ball.x = point.x;
  ball.y = point.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.visualScale = 1;
  ball.moving = false;
  ball.flight = null;
  ball.bounce = null;
  lastSafe = { x: ball.x, y: ball.y };
  updateSuggestedClub("sand");
  message = "Plugged in the bunker. No bounce or roll from sand.";
  updateHud();
}

const baseUpdateBallForSand = updateBall;

updateBall = function updateBallWithDeadSand() {
  const before = { x: ball.x, y: ball.y };
  const wasRolling = ball.moving && !ball.holed && !ball.flight && !ball.bounce;

  baseUpdateBallForSand();

  if (ball.holed) {
    lastRollingPositionForSand = { x: ball.x, y: ball.y };
    return;
  }

  if (ball.flight || ball.bounce) {
    lastRollingPositionForSand = { x: ball.x, y: ball.y };
    return;
  }

  const after = { x: ball.x, y: ball.y };
  const startedRolling = wasRolling ? before : lastRollingPositionForSand;
  const crossing = findSandCrossingPoint(startedRolling, after);

  if (crossing) {
    stopBallInSand(crossing);
    lastRollingPositionForSand = { x: ball.x, y: ball.y };
    return;
  }

  lastRollingPositionForSand = after;
};
