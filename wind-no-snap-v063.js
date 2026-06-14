// v0.63 wind no-snap fix: wind drift persists into touchdown instead of vanishing at landing.

const resolveSkillShotBaseV063 = typeof resolveSkillShotBaseV062 === 'function'
  ? resolveSkillShotBaseV062
  : (typeof resolveSkillShotBaseV058 === 'function'
    ? resolveSkillShotBaseV058
    : (typeof resolveSkillShotBeforeWindV057 === 'function' ? resolveSkillShotBeforeWindV057 : resolveSkillShot));

resolveSkillShot = function resolveSkillShotWindNoSnapV063() {
  const shotInfo = pendingShot ? { clubKey: pendingShot.clubKey, power: pendingShot.power } : null;
  resolveSkillShotBaseV063();
  if (!shotInfo || !ball || !ball.flight) return;
  const club = clubs[shotInfo.clubKey];
  if (!club || club.type === 'putt') return;
  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  if (mph <= 0) return;

  const shot = ball.flight;
  const shotAngle = shot.angle || 0;
  const windAngle = windStateV057.angle || 0;
  const power = shotInfo.power || 0.5;
  const cross = Math.sin(windAngle - shotAngle);
  const tail = Math.cos(windAngle - shotAngle);
  const push = mph * (0.34 + power * 0.68);

  shot.windV063 = {
    driftX: Math.cos(windAngle) * push,
    driftY: Math.sin(windAngle) * push * 0.66 - Math.max(0, tail) * mph * 0.14,
    lateralX: -Math.sin(shotAngle) * cross * mph * (0.95 + power * 0.75),
    lateralY: Math.cos(shotAngle) * cross * mph * (0.95 + power * 0.75),
    rollAngle: shotAngle + cross * mph * 0.006
  };
};

updateFlight = function updateFlightWindNoSnapV063() {
  if (!ball.flight) return;
  const shot = ball.flight;
  shot.progress += 1;
  const t = clamp(shot.progress / shot.duration, 0, 1);
  const ease = 1 - Math.pow(1 - t, 2);
  const arc = Math.sin(t * Math.PI);
  const baseX = lerp(shot.startX, shot.endX, ease);
  const baseY = lerp(shot.startY, shot.endY, ease);
  const curveOffset = (shot.curvePixels || 0) * Math.sin(t * Math.PI);
  const perpX = -Math.sin(shot.angle);
  const perpY = Math.cos(shot.angle);

  let windX = 0;
  let windY = 0;
  if (shot.windV063) {
    const windEase = t * t * (3 - 2 * t); // reaches 1 at touchdown, so no landing snap.
    const airCurve = Math.sin(t * Math.PI * 0.92) * Math.sin(t * Math.PI * 0.5);
    windX = shot.windV063.driftX * windEase + shot.windV063.lateralX * airCurve;
    windY = shot.windV063.driftY * windEase + shot.windV063.lateralY * airCurve;
  }

  ball.x = clamp(baseX + perpX * curveOffset + windX, 18, canvas.width - 18);
  ball.y = clamp(baseY + perpY * curveOffset + windY, 24, canvas.height - 18);
  ball.visualScale = 1 + arc * shot.height;

  if (t >= 1) {
    const rollAngle = shot.windV063 ? shot.windV063.rollAngle : shot.angle;
    ball.flight = null;
    ball.visualScale = 1;
    startLandingRoll(rollAngle, getLie(), shot.carryYards, shot.clubKey);
  }
};
