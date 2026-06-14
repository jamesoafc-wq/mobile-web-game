// v0.35 round, scoring and visual feedback layer.

const ROUND_BASE_HOLE_V035 = JSON.parse(JSON.stringify(HOLES[0]));
const COURSE_W_V035 = 420;
const COURSE_H_V035 = 760;
let roundHoleIndexV035 = 0;
let roundScoresV035 = Array(9).fill(null);
let roundCompleteV035 = false;
let waterRipplesV035 = [];

function cloneV035(value) {
  return JSON.parse(JSON.stringify(value));
}

function roundScoreTextV035(score) {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function rectAroundV035(x, y, w = 82, h = 58) {
  return [
    { x: x - w / 2, y: y + h / 2 },
    { x: x + w / 2, y: y + h / 2 },
    { x: x + w / 2, y: y - h / 2 },
    { x: x - w / 2, y: y - h / 2 }
  ];
}

function transformHoleV035(template, cfg) {
  const h = cloneV035(template);
  const amp = cfg.amp || 0;
  const phase = cfg.phase || 0;
  const tilt = cfg.tilt || 0;
  const mirror = !!cfg.mirror;

  function mapPoint(p) {
    let x = mirror ? COURSE_W_V035 - p.x : p.x;
    const y = p.y;
    x += Math.sin(y * 0.015 + phase) * amp;
    x += ((y - 380) / 380) * tilt;
    return { x: clamp(x, 38, COURSE_W_V035 - 38), y: clamp(y, 58, COURSE_H_V035 - 38) };
  }

  function mapPoly(poly) { return poly.map(mapPoint); }
  h.id = cfg.id;
  h.name = `Hole ${cfg.id}`;
  h.par = cfg.par;
  h.start = cfg.tee ? { ...cfg.tee } : mapPoint(h.start);
  h.cup = mapPoint(h.cup);
  if (cfg.cupShift) {
    h.cup.x = clamp(h.cup.x + cfg.cupShift.x, 80, 340);
    h.cup.y = clamp(h.cup.y + cfg.cupShift.y, 90, 245);
  }
  h.tee = cfg.tee ? rectAroundV035(cfg.tee.x, cfg.tee.y) : mapPoly(h.tee);
  h.fairway = mapPoly(h.fairway);
  h.greenRing = mapPoly(h.greenRing);
  h.green = mapPoly(h.green);
  h.water = mapPoly(h.water);
  h.bunkers = h.bunkers.map(mapPoly);
  h.trees = h.trees.map(t => ({ ...t, ...mapPoint(t) }));
  h.props = h.props.map(p => {
    const mapped = { ...p, ...mapPoint(p) };
    if (mapped.type === 'tee_sign_small') mapped.text = `Hole ${cfg.id}`;
    return mapped;
  });
  h.slopeZones = h.slopeZones.map(z => {
    const p = mapPoint(z);
    return {
      ...z,
      x: p.x,
      y: p.y,
      rotation: mirror ? -z.rotation : z.rotation,
      dx: mirror ? -z.dx : z.dx
    };
  });
  return h;
}

const ROUND_HOLES_V035 = [
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 1, par: 4, amp: 0 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 2, par: 4, mirror: true, amp: 12, phase: 0.7, tilt: -8 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 3, par: 3, amp: -8, phase: 1.4, tee: { x: 214, y: 392 }, cupShift: { x: -8, y: 22 } }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 4, par: 5, amp: 38, phase: 0.5, tilt: -34 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 5, par: 4, mirror: true, amp: 24, phase: 2.2, tee: { x: 212, y: 638 }, cupShift: { x: 10, y: 8 } }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 6, par: 3, mirror: true, amp: 10, phase: 1.1, tee: { x: 205, y: 360 }, cupShift: { x: -14, y: 32 } }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 7, par: 5, amp: -36, phase: 2.5, tilt: 32 }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 8, par: 4, amp: 18, phase: 3.1, tee: { x: 180, y: 628 }, cupShift: { x: 22, y: 14 } }),
  transformHoleV035(ROUND_BASE_HOLE_V035, { id: 9, par: 4, mirror: true, amp: -28, phase: 1.8, tee: { x: 238, y: 646 }, cupShift: { x: -16, y: 12 } })
];

function copyHoleV035(index) {
  const src = cloneV035(ROUND_HOLES_V035[index]);
  Object.keys(hole).forEach(key => delete hole[key]);
  Object.assign(hole, src);
}

function resetRoundHoleV035(index = roundHoleIndexV035) {
  roundHoleIndexV035 = clamp(index, 0, ROUND_HOLES_V035.length - 1);
  copyHoleV035(roundHoleIndexV035);
  strokes = 0;
  ball = {
    x: hole.start.x,
    y: hole.start.y,
    vx: 0,
    vy: 0,
    moving: false,
    flight: null,
    holed: false,
    visualScale: 1,
    radius: 4.6,
    prevX: hole.start.x,
    prevY: hole.start.y
  };
  lastSafe = { x: ball.x, y: ball.y };
  drag = null;
  pendingShot = null;
  skillFeedback = null;
  selectedClub = 'driver';
  message = `Hole ${roundHoleIndexV035 + 1} of 9. Par ${hole.par}.`;
  roundCompleteV035 = false;
  updateClubButtons();
  updateHud();
}

function roundTotalParV035() {
  return ROUND_HOLES_V035.reduce((sum, h) => sum + h.par, 0);
}

function roundCompletedParV035() {
  return ROUND_HOLES_V035.reduce((sum, h, i) => sum + (roundScoresV035[i] == null ? 0 : h.par), 0);
}

function roundCompletedStrokesV035() {
  return roundScoresV035.reduce((sum, value) => sum + (value || 0), 0);
}

function getRoundScoreV035() {
  return roundCompletedStrokesV035() - roundCompletedParV035();
}

function scoreNameV035(strokesTaken, par) {
  const diff = strokesTaken - par;
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double bogey';
  return `+${diff}`;
}

function goNextHoleV035() {
  if (roundCompleteV035) {
    roundScoresV035 = Array(9).fill(null);
    resetRoundHoleV035(0);
    return;
  }
  if (roundHoleIndexV035 >= ROUND_HOLES_V035.length - 1) {
    roundCompleteV035 = true;
    message = `Round complete. ${roundCompletedStrokesV035()} strokes, ${roundScoreTextV035(getRoundScoreV035())} vs par ${roundTotalParV035()}.`;
    updateHud();
    return;
  }
  resetRoundHoleV035(roundHoleIndexV035 + 1);
}

const scoreCardLabelV035 = document.querySelector('.score-card span');
const roundSummaryElV035 = document.createElement('p');
roundSummaryElV035.className = 'round-summary-v035';
roundSummaryElV035.style.margin = '6px 0 0';
roundSummaryElV035.style.fontSize = '11px';
roundSummaryElV035.style.fontWeight = '800';
roundSummaryElV035.style.color = 'rgba(232,246,222,.78)';
document.querySelector('.top-panel > div:first-child').appendChild(roundSummaryElV035);
if (scoreCardLabelV035) scoreCardLabelV035.textContent = 'Hole strokes';

const updateHudBeforeRoundV035 = updateHud;
updateHud = function updateHudRoundV035() {
  updateHudBeforeRoundV035();
  const currentDiff = strokes - hole.par;
  const roundScore = getRoundScoreV035();
  holeLabelEl.textContent = `${hole.name} of 9 · Par ${hole.par} · Hole ${roundScoreTextV035(currentDiff)}`;
  roundSummaryElV035.textContent = `Round ${roundScoreTextV035(roundScore)} · ${roundCompletedStrokesV035()} strokes through ${roundScoresV035.filter(v => v != null).length} holes · Total par ${roundTotalParV035()}`;
  newHoleButton.textContent = roundCompleteV035 ? 'Restart round' : ball.holed ? 'Next hole' : 'Restart hole';
};

const maybeHoleOutBeforeRoundV035 = maybeHoleOut;
maybeHoleOut = function maybeHoleOutRoundV035() {
  const wasHoled = maybeHoleOutBeforeRoundV035();
  if (!wasHoled) return false;
  if (roundScoresV035[roundHoleIndexV035] == null) {
    roundScoresV035[roundHoleIndexV035] = strokes;
    const result = scoreNameV035(strokes, hole.par);
    message = `${result}. Holed in ${strokes} on a par ${hole.par}. ${roundHoleIndexV035 === 8 ? 'Tap to finish the round.' : 'Tap Next hole.'}`;
    updateHud();
  }
  return true;
};

newHoleButton.addEventListener('click', event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (ball.holed || roundCompleteV035) goNextHoleV035();
  else resetRoundHoleV035(roundHoleIndexV035);
}, true);

function aimColourV035(lie, club) {
  if (club.type === 'putt') return { stroke: 'rgba(88,224,255,0.8)', fill: 'rgba(88,224,255,0.72)' };
  if (lie === 'sand') return { stroke: 'rgba(255,215,116,0.82)', fill: 'rgba(255,215,116,0.74)' };
  return { stroke: 'rgba(255,255,255,0.78)', fill: 'rgba(255,255,255,0.72)' };
}

drawAimLine = function drawAimLineV035() {
  if (!drag || pendingShot || ball.moving || ball.holed) return;
  const lie = getLie();
  const club = clubs[selectedClub];
  let lineYards = getMaxCarry(selectedClub, lie) * drag.power;
  if (selectedClub === 'putter' && typeof getPuttRollYards === 'function') lineYards = getPuttRollYards(lie, drag.power, 1);
  if (lineYards <= 0) return;
  const carryPixels = lineYards / YARDS_PER_PIXEL;
  const endX = ball.x + Math.cos(drag.angle) * carryPixels;
  const endY = ball.y + Math.sin(drag.angle) * carryPixels;
  const colour = aimColourV035(lie, club);
  ctx.save();
  ctx.strokeStyle = colour.stroke;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colour.fill;
  ctx.beginPath();
  ctx.arc(endX, endY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

drawSlopeRead = function drawSlopeReadV035(ctx, hole, timeMs) {
  hole.slopeZones.forEach((z, zi) => {
    const pl = Math.hypot(z.dx, z.dy) || 1;
    const px = z.dx / pl;
    const py = z.dy / pl;
    const r = z.rotation || 0;
    const a = { x: Math.cos(r), y: Math.sin(r), span: z.rx };
    const b = { x: -Math.sin(r), y: Math.cos(r), span: z.ry };
    let ax = Math.abs(a.x * px + a.y * py) >= Math.abs(b.x * px + b.y * py) ? a : b;
    if (ax.x * px + ax.y * py < 0) ax = { x: -ax.x, y: -ax.y, span: ax.span };
    const sx = -ax.y;
    const sy = ax.x;
    const angle = Math.atan2(ax.y, ax.x);
    const strength = clamp((z.strength - 0.00045) / 0.00045, 0.15, 1);
    const area = Math.sqrt(Math.max(1, z.rx * z.ry));
    const lanes = Math.round(clamp(area / 19, 2, 5));
    const count = Math.round(clamp(ax.span / 16 + lanes * 0.4, 4, 8));
    const speed = 0.0002 + strength * 0.00024;
    const len = clamp(ax.span * 1.42, 32, ax.span * 1.55);
    const spread = Math.min(z.ry * 0.96, area * 1.08);
    for (let li = 0; li < lanes; li++) {
      const offset = ((lanes === 1 ? 0.5 : li / (lanes - 1)) - 0.5) * spread;
      for (let mi = 0; mi < count; mi++) {
        const phase = (timeMs * speed + mi / count + li * 0.061 + zi * 0.109) % 1;
        const travel = (phase - 0.5) * len;
        const fade = Math.sin(phase * Math.PI);
        const cx = z.x + ax.x * travel + sx * offset;
        const cy = z.y + ax.y * travel + sy * offset;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.globalAlpha = (0.063 + strength * 0.063) * fade;
        ctx.fillStyle = '#f7fff2';
        ctx.font = '800 9.2px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('›', 0, 0);
        ctx.restore();
      }
    }
  });
};

const applyPenaltyBeforeRoundV035 = applyPenalty;
applyPenalty = function applyPenaltyRoundV035(text) {
  if (String(text).toLowerCase().includes('water')) waterRipplesV035.push({ x: ball.x, y: ball.y, startedAt: performance.now() });
  applyPenaltyBeforeRoundV035(text);
};

function drawWaterRipplesV035() {
  if (!waterRipplesV035.length) return;
  const cam = getCamera();
  const now = performance.now();
  waterRipplesV035 = waterRipplesV035.filter(ripple => now - ripple.startedAt < 900);
  waterRipplesV035.forEach(ripple => {
    const t = clamp((now - ripple.startedAt) / 900, 0, 1);
    const x = ripple.x * cam.zoom + cam.tx;
    const y = ripple.y * cam.zoom + cam.ty;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = (1 - t) * 0.36;
    ctx.strokeStyle = 'rgba(210,244,255,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, 8 + t * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, 3 + t * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

const drawBeforeRoundV035 = draw;
draw = function drawRoundV035() {
  drawBeforeRoundV035();
  drawWaterRipplesV035();
};

const drawOverlayBeforeBuildV035 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV035() {
  drawOverlayBeforeBuildV035();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = canvas.width / 2;
  const y = 17;
  const w = 48;
  const h = 14;
  ctx.fillStyle = 'rgba(4,10,6,0.86)';
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(221,238,210,0.88)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.35', x, y + 0.5);
  ctx.restore();
};

resetRoundHoleV035(0);
