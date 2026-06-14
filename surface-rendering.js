function getSurfaceAtPoint(hole, x, y) {
  const point = { x, y };

  // Match the visual draw order: playable/course surfaces drawn on top of water
  // should win the lie check. Water is only a hazard where it remains exposed.
  for (const bunker of hole.bunkers) if (pointInPolygon(point, bunker)) return 'sand';
  if (pointInPolygon(point, hole.green)) return 'green';
  if (pointInPolygon(point, hole.greenRing)) return 'fringe';
  if (pointInPolygon(point, hole.tee)) return 'tee';
  if (pointInPolygon(point, hole.fairway)) return 'fairway';
  if (pointInPolygon(point, hole.water)) return 'water';
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
  ctx.fillStyle = '#2b6635';
  ctx.fillRect(0, 0, W, H);

  // More visible rough texture, but still low contrast enough to sit behind course surfaces.
  for (let y = -8; y < H + 8; y += 12) {
    for (let x = -8; x < W + 8; x += 15) {
      const seed = (x * 17 + y * 31) % 19;
      const alpha = 0.055 + (seed / 19) * 0.045;
      ctx.fillStyle = `rgba(9,39,16,${alpha})`;
      ctx.fillRect(x + ((y / 12) % 2) * 4, y, 9, 2.4);
      ctx.fillStyle = `rgba(98,153,79,${alpha * 0.45})`;
      ctx.fillRect(x + 5, y + 5, 5, 1.6);
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
    for (let y = bounds.minY; y < bounds.maxY; y += 9) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      for (let x = bounds.minX - 10; x <= bounds.maxX + 12; x += 8) {
        const wave = Math.sin((x + timeMs * 0.045) * 0.06 + y * 0.18) * 2.4;
        if (x === bounds.minX - 10) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  });
}

function drawBunkers(ctx, hole) {
  hole.bunkers.forEach((bunker, idx) => {
    drawPolygonFill(ctx, bunker, '#d8be7a', 'rgba(115,84,38,0.55)', 2);
    clipToPolygon(ctx, bunker, () => {
      const bounds = polygonBounds(bunker);
      for (let x = bounds.minX; x <= bounds.maxX; x += 12) {
        ctx.strokeStyle = 'rgba(113,86,38,0.13)';
        ctx.beginPath();
        ctx.moveTo(x, bounds.minY - 5);
        ctx.lineTo(x + 18, bounds.maxY + 5);
        ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const px = bounds.minX + ((i * 19 + idx * 7) % Math.max(1, bounds.maxX - bounds.minX));
        const py = bounds.minY + ((i * 13 + idx * 11) % Math.max(1, bounds.maxY - bounds.minY));
        ctx.fillStyle = 'rgba(112,84,35,0.1)';
        ctx.fillRect(px, py, 2, 1.4);
      }
    });
  });
}

function drawGreen(ctx, hole) {
  drawPolygonFill(ctx, hole.greenRing, '#88cf74', 'rgba(45,100,45,0.38)', 2);
  drawPolygonFill(ctx, hole.green, '#9fe27e', 'rgba(56,120,47,0.45)', 2.2);
  clipToPolygon(ctx, hole.green, () => {
    for (let r = 12; r < 90; r += 13) {
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.beginPath();
      ctx.ellipse(hole.cup.x, hole.cup.y, r * 1.15, r * 0.78, -0.28, 0, Math.PI * 2);
      ctx.stroke();
    }
    hole.slopeZones.forEach(zone => {
      const grad = ctx.createRadialGradient(zone.x, zone.y, 2, zone.x, zone.y, Math.max(zone.rx, zone.ry));
      grad.addColorStop(0, 'rgba(255,255,255,0.055)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(zone.x, zone.y, zone.rx, zone.ry, zone.rotation || 0, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function drawProps(ctx, hole) {
  hole.props.forEach(prop => {
    const def = PROP_LIBRARY[prop.type];
    if (!def) return;

    if (typeof def === 'function') {
      def(ctx, prop);
      return;
    }

    const drawFn = typeof def.draw === 'function' ? def.draw : window[def.draw];
    if (typeof drawFn === 'function') drawFn(ctx, prop);
  });
}

function drawTrees(ctx, hole) {
  hole.trees.forEach(tree => {
    const prop = {
      type: tree.variant || 'tree_round_oak_a',
      x: tree.x,
      y: tree.y,
      rotation: tree.rotation || 0,
      scale: tree.scale || 1
    };
    const def = PROP_LIBRARY[prop.type];
    if (typeof def === 'function') {
      def(ctx, prop);
      return;
    }

    // Fallback tree if a variant is missing.
    const r = (tree.r || 17) * (tree.scale || 1);
    ctx.save();
    ctx.translate(tree.x, tree.y);
    ctx.fillStyle = 'rgba(20,49,18,0.22)';
    ctx.beginPath(); ctx.ellipse(2, 5, r * 0.92, r * 0.52, 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a702f';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#33823a';
    ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.24, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

function drawCupAndFlag(ctx, hole) {
  ctx.save();
  ctx.strokeStyle = '#f2f6ed';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(hole.cup.x, hole.cup.y); ctx.lineTo(hole.cup.x, hole.cup.y - 34); ctx.stroke();
  ctx.fillStyle = '#e64040';
  ctx.beginPath();
  ctx.moveTo(hole.cup.x, hole.cup.y - 34);
  ctx.lineTo(hole.cup.x + 19, hole.cup.y - 28);
  ctx.lineTo(hole.cup.x, hole.cup.y - 22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.beginPath(); ctx.arc(hole.cup.x, hole.cup.y, hole.cup.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
  ctx.restore();
}

function drawSlopeRead(ctx, hole, timeMs) {
  hole.slopeZones.forEach((zone, zoneIndex) => {
    const len = Math.hypot(zone.dx, zone.dy) || 1;
    const flowX = zone.dx / len;
    const flowY = zone.dy / len;
    const sideX = -flowY;
    const sideY = flowX;
    const flowAngle = Math.atan2(flowY, flowX);

    // Slow, tiny flow markers. Each arrow is positioned and rotated from the same flow vector.
    for (let i = -4; i <= 4; i++) {
      const lane = i / 4;
      const laneOffset = lane * zone.ry * 0.3;
      const phase = (timeMs * 0.00055 + i * 0.13 + zoneIndex * 0.11) % 1;
      const travel = (phase - 0.5) * zone.rx * 1.08;
      const cx = zone.x + flowX * travel + sideX * laneOffset;
      const cy = zone.y + flowY * travel + sideY * laneOffset;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(flowAngle);
      ctx.globalAlpha = 0.045 + Math.sin(phase * Math.PI) * 0.085;
      ctx.fillStyle = '#f7fff2';
      ctx.beginPath();
      ctx.moveTo(3.6, 0);
      ctx.lineTo(-3, -1.9);
      ctx.lineTo(-1.2, 0);
      ctx.lineTo(-3, 1.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawCourse(ctx, hole, W, H, timeMs, showSlope) {
  drawRoughBackground(ctx, W, H);
  drawWater(ctx, hole, timeMs);
  drawFairway(ctx, hole);
  drawTee(ctx, hole);
  drawBunkers(ctx, hole);
  drawGreen(ctx, hole);
  drawTrees(ctx, hole);
  drawProps(ctx, hole);
  drawCupAndFlag(ctx, hole);
  if (showSlope) drawSlopeRead(ctx, hole, timeMs);
}
