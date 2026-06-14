// Gameplay balance patch for v0.26.
// Keeps visuals unchanged: only putter pace and green break are tuned here.

function getEffectivePuttYards(lie) {
  // Previous active tuning used 100y on greens, which became too hot after moving the cup forward.
  if (lie === 'green') return 70;
  if (lie === 'fringe') return 58;
  return (clubs.putter.carry && clubs.putter.carry[lie]) || 34;
}

function getPuttPowerCurve(power) {
  // Less front-loaded than the previous 0.82 curve, so half pulls no longer jump like big putts.
  return Math.pow(clamp(power, 0, 1), 1.05);
}

const updateRollBeforeGreenBreakBoost = updateRoll;
updateRoll = function updateRollWithGreenBreakBoost() {
  updateRollBeforeGreenBreakBoost();

  if (!ball || !ball.moving || ball.flight || ball.holed) return;
  const lie = getLie();
  if (lie !== 'green' && lie !== 'fringe') return;

  const slope = getGreenSlopeAt(hole, ball.x, ball.y);
  if (!slope || slope.strength <= 0.00004) return;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed <= 0.006) return;

  // Extra break is strongest on slow putts, lighter on faster putts.
  const extraBreak = clamp(0.42 - speed * 0.34, 0.08, 0.34);
  ball.vx += slope.x * extraBreak;
  ball.vy += slope.y * extraBreak;
};
