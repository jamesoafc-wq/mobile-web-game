const PROP_LIBRARY = {
  tee_sign_small: drawTeeSign,
  tee_marker_blue: (ctx, p) => drawTeeMarker(ctx, p, '#56a7ff'),
  tee_marker_white: (ctx, p) => drawTeeMarker(ctx, p, '#f5f8ff'),
  yardage_marker_150: (ctx, p) => drawYardageMarker(ctx, p, '150'),
  yardage_marker_100: (ctx, p) => drawYardageMarker(ctx, p, '100'),
  bench_wood_small: drawBench,
  ball_washer_basic: drawBallWasher,
  tree_round_oak_a: (ctx, p) => drawTree(ctx, p, ['#3d7e3e', '#4a8f46', '#356f37']),
  tree_round_oak_b: (ctx, p) => drawTree(ctx, p, ['#427742', '#5a954e', '#355f35']),
  shrub_cluster_a: (ctx, p) => drawShrubCluster(ctx, p, ['#3d7d3f', '#4f934f']),
  shrub_cluster_b: (ctx, p) => drawShrubCluster(ctx, p, ['#4c8948', '#5aa554']),
  rock_small_a: drawRock,
  reeds_small: drawReeds,
  bridge_wood_small: drawBridgePreview,
  rope_post_a: drawRopePostPreview,
  flower_bed_small: drawFlowerBedPreview,
  stone_wall_short: drawStoneWallPreview
};

function withTransform(ctx, prop, drawFn) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(prop.rotation || 0);
  const scale = prop.scale || 1;
  ctx.scale(scale, scale);
  drawFn();
  ctx.restore();
}

function drawTeeSign(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRect(ctx, -16, 9, 34, 6, 3); ctx.fill();
    ctx.fillStyle = '#6c4728';
    ctx.fillRect(-2, 2, 4, 18);
    ctx.fillStyle = '#a47443';
    roundRect(ctx, -18, -12, 36, 16, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(71,44,21,0.55)'; ctx.stroke();
    ctx.fillStyle = '#f7eed8'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(prop.text || 'Hole', 0, -4);
  });
}

function drawTeeMarker(ctx, prop, color) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 5, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
  });
}

function drawBench(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#4b3320';
    ctx.fillRect(-11, -5, 3, 12);
    ctx.fillRect(8, -5, 3, 12);
    ctx.fillStyle = '#9a6a3d';
    ctx.fillRect(-14, -8, 28, 4);
    ctx.fillRect(-13, -1, 26, 4);
  });
}

function drawBallWasher(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#454d53';
    ctx.fillRect(-1.6, -3, 3.2, 16);
    ctx.fillStyle = '#27323d';
    roundRect(ctx, -6, -9, 12, 9, 3); ctx.fill();
    ctx.fillStyle = '#7ca6dd';
    ctx.beginPath(); ctx.arc(0, -5, 2.3, 0, Math.PI * 2); ctx.fill();
  });
}

function drawYardageMarker(ctx, prop, text) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#dfe7c7';
    roundRect(ctx, -10, -7, 20, 14, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(70,85,54,0.45)'; ctx.stroke();
    ctx.fillStyle = '#41523d';
    ctx.font = '800 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0.5);
  });
}

function drawTree(ctx, prop, palette) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 15, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#65402a';
    ctx.fillRect(-3, 2, 6, 18);
    const blobs = [
      { x: -8, y: -4, r: 14, c: palette[0] },
      { x: 8, y: -6, r: 13, c: palette[1] },
      { x: 0, y: -12, r: 16, c: palette[2] },
      { x: -1, y: 1, r: 12, c: palette[1] }
    ];
    blobs.forEach(b => { ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(-6, -11, 6, 0, Math.PI * 2); ctx.fill();
  });
}

function drawShrubCluster(ctx, prop, palette) {
  withTransform(ctx, prop, () => {
    [{ x: -6, y: 0, r: 6, c: palette[0] }, { x: 2, y: -2, r: 7, c: palette[1] }, { x: 9, y: 2, r: 5, c: palette[0] }]
      .forEach(b => { ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); });
  });
}

function drawRock(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#9ea4a5';
    ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-1, -5); ctx.lineTo(7, -2); ctx.lineTo(5, 6); ctx.lineTo(-4, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.moveTo(-3, 1); ctx.lineTo(0, -2); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();
  });
}

function drawReeds(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.strokeStyle = '#6c8c48';
    ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 8);
      ctx.quadraticCurveTo(i + 1.2, 1, i - 1, -8);
      ctx.stroke();
    }
  });
}

function drawBridgePreview(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#8b6238';
    roundRect(ctx, -18, -5, 36, 10, 4); ctx.fill();
  });
}
function drawRopePostPreview(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#6b4b2d'; ctx.fillRect(-2, -10, 4, 20);
    ctx.strokeStyle = '#c7b28a'; ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(12, 1); ctx.stroke();
  });
}
function drawFlowerBedPreview(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#498448'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ['#ffd86f','#ff8eb5','#e2f26d'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-6 + i * 6, -1 + (i % 2), 2, 0, Math.PI * 2); ctx.fill(); });
  });
}
function drawStoneWallPreview(ctx, prop) {
  withTransform(ctx, prop, () => {
    ctx.fillStyle = '#8d8f92'; roundRect(ctx, -18, -4, 36, 8, 3); ctx.fill();
  });
}
