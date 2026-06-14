// v0.36 round polish: scorecard, par-3 layouts, aim colours and clearer slope markers.

function makePar3HoleV036(id, mirror = false) {
  const sx = x => mirror ? COURSE_W_V035 - x : x;
  const h = cloneV035(ROUND_BASE_HOLE_V035);
  h.id = id;
  h.name = `Hole ${id}`;
  h.par = 3;
  h.start = { x: sx(210), y: 646 };
  h.cup = { x: sx(214), y: 292, r: 4.2 };
  h.tee = rectAroundV035(h.start.x, h.start.y, 82, 56);
  h.fairway = [
    { x: sx(166), y: 666 }, { x: sx(254), y: 666 }, { x: sx(270), y: 616 }, { x: sx(258), y: 558 },
    { x: sx(238), y: 505 }, { x: sx(247), y: 448 }, { x: sx(270), y: 392 }, { x: sx(258), y: 342 },
    { x: sx(231), y: 308 }, { x: sx(198), y: 302 }, { x: sx(169), y: 323 }, { x: sx(152), y: 366 },
    { x: sx(164), y: 424 }, { x: sx(150), y: 486 }, { x: sx(164), y: 552 }, { x: sx(150), y: 616 }
  ];
  h.greenRing = [
    { x: sx(156), y: 314 }, { x: sx(173), y: 284 }, { x: sx(198), y: 264 }, { x: sx(228), y: 258 },
    { x: sx(258), y: 267 }, { x: sx(281), y: 289 }, { x: sx(291), y: 318 }, { x: sx(282), y: 347 },
    { x: sx(258), y: 368 }, { x: sx(226), y: 376 }, { x: sx(195), y: 370 }, { x: sx(170), y: 350 }
  ];
  h.green = [
    { x: sx(169), y: 315 }, { x: sx(184), y: 292 }, { x: sx(205), y: 278 }, { x: sx(228), y: 276 },
    { x: sx(251), y: 284 }, { x: sx(268), y: 302 }, { x: sx(275), y: 324 }, { x: sx(267), y: 344 },
    { x: sx(247), y: 358 }, { x: sx(222), y: 362 }, { x: sx(198), y: 356 }, { x: sx(178), y: 340 }
  ];
  h.bunkers = [
    [ { x: sx(126), y: 302 }, { x: sx(140), y: 276 }, { x: sx(164), y: 268 }, { x: sx(178), y: 286 }, { x: sx(166), y: 312 }, { x: sx(142), y: 320 } ],
    [ { x: sx(270), y: 365 }, { x: sx(293), y: 352 }, { x: sx(318), y: 360 }, { x: sx(326), y: 384 }, { x: sx(306), y: 402 }, { x: sx(279), y: 392 } ]
  ];
  h.water = [
    { x: sx(58), y: 500 }, { x: sx(82), y: 466 }, { x: sx(118), y: 458 }, { x: sx(143), y: 480 },
    { x: sx(146), y: 518 }, { x: sx(124), y: 548 }, { x: sx(88), y: 552 }, { x: sx(60), y: 530 }
  ];
  h.slopeZones = [
    { x: sx(218), y: 315, rx: 76, ry: 36, rotation: mirror ? 0.08 : -0.08, dx: mirror ? -0.32 : 0.32, dy: 0.08, strength: 0.00068 },
    { x: sx(244), y: 288, rx: 44, ry: 22, rotation: mirror ? -0.18 : 0.18, dx: mirror ? 0.28 : -0.28, dy: 0.1, strength: 0.00058 }
  ];
  h.props = [
    { type: 'tee_sign_small', x: sx(136), y: 654, text: `Hole ${id}` },
    { type: 'tee_marker_blue', x: sx(195), y: 648 },
    { type: 'tee_marker_white', x: sx(225), y: 648 },
    { type: 'yardage_marker_100', x: sx(292), y: 458 },
    { type: 'shrub_cluster_a', x: sx(88), y: 506 },
    { type: 'reeds_small', x: sx(77), y: 536 },
    { type: 'rock_small_a', x: sx(319), y: 430 }
  ];
  h.trees = [
    { x: sx(82), y: 650, variant: 'tree_round_oak_a', scale: 1 },
    { x: sx(332), y: 646, variant: 'tree_round_oak_b', scale: 0.96 },
    { x: sx(66), y: 412, variant: 'tree_round_oak_a', scale: 1.08 },
    { x: sx(346), y: 452, variant: 'tree_round_oak_b', scale: 1.02 },
    { x: sx(86), y: 230, variant: 'tree_round_oak_a', scale: 0.98 },
    { x: sx(336), y: 246, variant: 'tree_round_oak_b', scale: 1.06 }
  ];
  return h;
}

ROUND_HOLES_V035[2] = makePar3HoleV036(3, false);
ROUND_HOLES_V035[5] = makePar3HoleV036(6, true);

if (scoreCardLabelV035) scoreCardLabelV035.textContent = 'Round score';
const updateHudBeforeV036 = updateHud;
updateHud = function updateHudV036() {
  updateHudBeforeV036();
  const currentDiff = strokes - hole.par;
  const roundScore = getRoundScoreV035();
  strokesEl.textContent = roundScoreTextV035(roundScore);
  holeLabelEl.textContent = `${hole.name} of 9 · Par ${hole.par} · ${strokes} strokes · Hole ${roundScoreTextV035(currentDiff)}`;
  roundSummaryElV035.textContent = `Round ${roundScoreTextV035(roundScore)} · ${roundCompletedStrokesV035()} strokes through ${roundScoresV035.filter(v => v != null).length}/9 holes · Total par ${roundTotalParV035()}`;
  newHoleButton.textContent = roundCompleteV035 ? 'Restart round' : ball.holed ? 'Next hole' : 'Restart hole';
};

aimColourV035 = function aimColourV036(lie, club) {
  if (club.type === 'putt') return { stroke: 'rgba(88,224,255,0.82)', fill: 'rgba(88,224,255,0.74)' };
  if (lie === 'sand') return { stroke: 'rgba(255,215,116,0.84)', fill: 'rgba(255,215,116,0.76)' };
  if (lie === 'rough') return { stroke: 'rgba(156,232,124,0.82)', fill: 'rgba(156,232,124,0.74)' };
  return { stroke: 'rgba(255,255,255,0.8)', fill: 'rgba(255,255,255,0.74)' };
};

drawSlopeRead = function drawSlopeReadV036(ctx, hole, timeMs) {
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
        ctx.globalAlpha = (0.072 + strength * 0.072) * fade;
        ctx.fillStyle = '#f7fff2';
        ctx.font = '800 10.6px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('›', 0, 0);
        ctx.restore();
      }
    }
  });
};

function drawRoundScorecardV036() {
  if (!roundCompleteV035) return;
  const panelX = 28;
  const panelY = 118;
  const panelW = canvas.width - 56;
  const panelH = 392;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.18)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eef8d8';
  ctx.font = '900 18px system-ui';
  ctx.fillText('Round Scorecard', canvas.width / 2, panelY + 34);
  ctx.font = '800 12px system-ui';
  ctx.fillStyle = 'rgba(232,246,222,0.78)';
  ctx.fillText(`${roundCompletedStrokesV035()} strokes · ${roundScoreTextV035(getRoundScoreV035())} vs par ${roundTotalParV035()}`, canvas.width / 2, panelY + 58);

  const startY = panelY + 92;
  ctx.font = '800 11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,246,222,0.7)';
  ctx.fillText('Hole', panelX + 28, startY);
  ctx.fillText('Par', panelX + 102, startY);
  ctx.fillText('Score', panelX + 165, startY);
  ctx.fillText('Result', panelX + 236, startY);

  for (let i = 0; i < 9; i++) {
    const y = startY + 26 + i * 28;
    const par = ROUND_HOLES_V035[i].par;
    const score = roundScoresV035[i];
    const diff = score == null ? 0 : score - par;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.065)';
    roundRect(ctx, panelX + 18, y - 15, panelW - 36, 23, 8);
    ctx.fill();
    ctx.fillStyle = '#eef8d8';
    ctx.fillText(String(i + 1), panelX + 34, y);
    ctx.fillText(String(par), panelX + 108, y);
    ctx.fillText(score == null ? '-' : String(score), panelX + 172, y);
    ctx.fillStyle = diff < 0 ? '#9cf28f' : diff > 0 ? '#ffd074' : '#eef8d8';
    ctx.fillText(score == null ? '-' : roundScoreTextV035(diff), panelX + 242, y);
  }
  ctx.fillStyle = 'rgba(232,246,222,0.78)';
  ctx.textAlign = 'center';
  ctx.font = '800 11px system-ui';
  ctx.fillText('Tap Restart round to play again.', canvas.width / 2, panelY + panelH - 24);
  ctx.restore();
}

const drawBeforeScorecardV036 = draw;
draw = function drawV036() {
  drawBeforeScorecardV036();
  drawRoundScorecardV036();
};

const drawOverlayBeforeBuildV036 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV036() {
  drawOverlayBeforeBuildV036();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = canvas.width / 2;
  const y = 17;
  const w = 48;
  const h = 14;
  ctx.fillStyle = 'rgba(4,10,6,0.88)';
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.24)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(221,238,210,0.9)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.36', x, y + 0.5);
  ctx.restore();
};

if (roundHoleIndexV035 === 2 || roundHoleIndexV035 === 5) resetRoundHoleV035(roundHoleIndexV035);
updateHud();
