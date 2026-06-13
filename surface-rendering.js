function getSurfaceAtPoint(hole, x, y) {
  const point = { x, y };
  if (pointInPolygon(point, hole.water)) return 'water';
  for (const bunker of hole.bunkers) if (pointInPolygon(point, bunker)) return 'sand';
  if (pointInPolygon(point, hole.green)) return 'green';
  if (pointInPolygon(point, hole.greenRing)) return 'fringe';
  if (pointInPolygon(point, hole.tee)) return 'tee';
  if (pointInPolygon(point, hole.fairway)) return 'fairway';
  return 'rough';
}

function getGreenSlopeAt(hole, x, y) {
  const point = { x, y };
  if (!pointInPolygon(point, hole.green)) return { x: 0, y: 0, strength: 0 };
  let slopeX = 0;
  let slopeY = 0;
  hole.slopeZones.forEach(zone => {
    const cos = Math.cos(zone.rotation || 0);
    const sin = Math.sin(zone.rotation || 0);
    const dx = x - zone.x;
    const dy = y - zone.y;
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    const amount = (localX * localX) / (zone.rx * zone.rx) + (localY * localY) / (zone.ry * zone.ry);
    if (amount > 1) return;
    const falloff = Math.pow(1 - amount, 1.2);
    const len = Math.hypot(zone.dx, zone.dy) || 1;
    slopeX += (zone.dx / len) * zone.strength * falloff;
    slopeY += (zone.dy / len) * zone.strength * falloff;
  });
  return { x: slopeX, y: slopeY, strength: Math.hypot(slopeX, slopeY) };
}

function drawPolygonFill(ctx, points, fill, stroke = null, lineWidth = 1.5) {
  drawRoundedPolygon(ctx, points);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function clipToPolygon(ctx, points, callback) {
  ctx.save();
  drawRoundedPolygon(ctx, points);
  ctx.clip();
  callback();
  ctx.restore();
}

function drawRoughBackground(ctx, W, H) {
  ctx.fillStyle = '#2d6a37';
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 14) {
    for (let x = 0; x < W; x += 18) {
      const alpha = 0.03 + (((x * 13 + y * 7) % 11) / 11) * 0.035;
      ctx.fillStyle = `rgba(16,50,20,${alpha})`;
      ctx.fillRect(x + ((y / 14) % 2) * 4, y, 8, 3);
    }
  }
}

function drawFairway(ctx, hole) {
  drawPolygonFill(ctx, hole.fairway, '#7ec863', 'rgba(45,98,39,0.45)', 2.1);
  clipToPolygon(ctx, hole.fairway, () => {
    const bounds = polygonBounds(hole.fairway);
    for (let x = bounds.minX - 40; x <= bounds.maxX + 40; x += 28) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, bounds.minY - 20, 12, bounds.maxY - bounds.minY + 40);
    }
    for (let y = bounds.minY; y <= bounds.maxY; y += 18) {
      ctx.strokeStyle = 'rgba(56,124,47,0.09)';
      ctx.beginPath();
      ctx.moveTo(bounds.minX - 20, y);
      ctx.lineTo(bounds.maxX + 20, y + 8);
      ctx.stroke();
    }
  });
}

function drawTee(ctx, hole) {
  drawPolygonFill(ctx, hole.tee, '#72bb5b', 'rgba(44,87,42,0.5)', 2);
}

function drawWater(ctx, hole, timeMs) {
  drawPolygonFill(ctx, hole.water, '#2b7cae', 'rgba(17,59,83,0.7)', 2.3);
  clipToPolygon(ctx, hole.water, () => {
    const bounds = polygonBounds(hole.water);
    const t = timeMs * 0.00012;
    for (let y = bounds.minY - 10; y <= bounds.maxY + 10; y += 9) {
      const offset = Math.sin(t + y * 0.06) * 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bounds.minX - 20, y + offset);
      ctx.quadraticCurveTo((bounds.minX + bounds.maxX) / 2, y - 2 + offset, bounds.maxX + 20, y + offset);
      ctx.stroke();
    }
    const shimmer = 0.045 + (Math.sin(timeMs * 0.0011) + 1) * 0.015;
    ctx.fillStyle = `rgba(255,255,255,${shimmer})`;
    ctx.fillRect(bounds.minX + 10, bounds.minY + 8, (bounds.maxX - bounds.minX) * 0.45, 5);
  });
}

function drawBunkers(ctx, hole) {
  hole.bunkers.forEach(bunker => {
    ctx.save();
    drawRoundedPolygon(ctx, bunker);
    ctx.fillStyle = '#d8c087';
    ctx.shadowColor = 'rgba(82,67,28,0.24)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
    drawRoundedPolygon(ctx, bunker);
    ctx.strokeStyle = 'rgba(141,115,60,0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    clipToPolygon(ctx, bunker, () => {
      const bounds = polygonBounds(bunker);
      for (let y = bounds.minY - 8; y <= bounds.maxY + 8; y += 7) {
        ctx.strokeStyle = 'rgba(162,137,85,0.24)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bounds.minX - 20, y);
        ctx.quadraticCurveTo((bounds.minX + bounds.maxX) / 2, y + 4, bounds.maxX + 20, y);
        ctx.stroke();
      }
    });
  });
}

function drawGreen(ctx, hole) {
  drawPolygonFill(ctx, hole.greenRing, '#8fd37e', 'rgba(57,112,56,0.4)', 1.9);
  drawPolygonFill(ctx, hole.green, '#9fe78b', 'rgba(66,117,58,0.42)', 1.8);
  clipToPolygon(ctx, hole.green, () => {
    const bounds = polygonBounds(hole.green);
    for (let x = bounds.minX - 10; x <= bounds.maxX + 10; x += 16) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(x, bounds.minY - 10, 8, bounds.maxY - bounds.minY + 20);
    }
    for (let y = bounds.minY; y <= bounds.maxY; y += 16) {
      ctx.strokeStyle = 'rgba(56,125,51,0.08)';
      ctx.beginPath();
      ctx.moveTo(bounds.minX - 20, y);
      ctx.lineTo(bounds.maxX + 20, y);
      ctx.stroke();
    }
  });
}

function drawProps(ctx, hole) {
  hole.props.forEach(prop => {
    const renderer = PROP_LIBRARY[prop.type];
    if (renderer) renderer(ctx, prop);
  });
}

function drawTrees(ctx, hole) {
  hole.trees.forEach(tree => {
    const renderer = PROP_LIBRARY[tree.variant];
    if (renderer) renderer(ctx, tree);
  });
}

function drawCupAndFlag(ctx, hole, puttingView) {
  const { x, y, r } = hole.cup;
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 36);
  ctx.stroke();
  ctx.fillStyle = '#ec5252';
  ctx.beginPath();
  ctx.moveTo(x, y - 36);
  ctx.lineTo(x + 24, y - 28);
  ctx.lineTo(x, y - 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#151515';
  ctx.beginPath();
  ctx.arc(x, y, puttingView ? 3.4 : r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSlopeRead(ctx, hole, timeMs) {
  const bounds = polygonBounds(hole.green);
  let index = 0;
  for (let y = bounds.minY + 8; y <= bounds.maxY - 6; y += 16) {
    const rowOffset = (Math.floor((y - bounds.minY) / 16) % 2) * 8;
    for (let x = bounds.minX + 8 + rowOffset; x <= bounds.maxX - 8; x += 18) {
      if (!pointInPolygon({ x, y }, hole.green)) continue;
      const slope = getGreenSlopeAt(hole, x, y);
      if (slope.strength < 0.00005) continue;
      const len = Math.hypot(slope.x, slope.y) || 1;
      const ux = slope.x / len;
      const uy = slope.y / len;
      const base = (timeMs * 0.00045 + index * 0.09) % 1;
      ctx.save();
      ctx.strokeStyle = 'rgba(246,255,221,0.92)';
      ctx.fillStyle = 'rgba(246,255,221,0.92)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i += 1) {
        const t = (base + i / 3) % 1;
        const fade = Math.sin(t * Math.PI);
        if (fade < 0.05) continue;
        const pathLength = 16;
        const dashLength = 5.2;
        const cx = x + ux * ((t - 0.5) * pathLength);
        const cy = y + uy * ((t - 0.5) * pathLength);
        const sx = cx - ux * dashLength * 0.5;
        const sy = cy - uy * dashLength * 0.5;
        const ex = cx + ux * dashLength * 0.5;
        const ey = cy + uy * dashLength * 0.5;
        ctx.globalAlpha = 0.08 + fade * 0.24;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.globalAlpha = 0.08 + fade * 0.18;
        ctx.beginPath(); ctx.arc(ex, ey, 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      index += 1;
    }
  }
}

function drawCourse(ctx, hole, W, H, timeMs, puttingView) {
  drawRoughBackground(ctx, W, H);
  drawTrees(ctx, hole);
  drawWater(ctx, hole, timeMs);
  drawFairway(ctx, hole);
  drawTee(ctx, hole);
  drawBunkers(ctx, hole);
  drawGreen(ctx, hole);
  drawProps(ctx, hole);
  drawCupAndFlag(ctx, hole, puttingView);
}
