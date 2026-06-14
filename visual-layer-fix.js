// Visual layering fix. Keeps hazard/surface logic untouched, but restores readable drawing order.

function drawSlopeRead(ctx, hole, timeMs) {
  hole.slopeZones.forEach((zone, zoneIndex) => {
    const len = Math.hypot(zone.dx, zone.dy) || 1;
    const ux = zone.dx / len;
    const uy = zone.dy / len;
    const sideX = -uy;
    const sideY = ux;

    // Dense, tiny flow markers. These intentionally feel more like the earlier subtle green-read texture.
    for (let i = -3; i <= 3; i++) {
      const lane = i / 3;
      const laneOffset = lane * zone.ry * 0.28;
      const phase = (timeMs * 0.0016 + i * 0.17 + zoneIndex * 0.11) % 1;
      const travel = (phase - 0.5) * zone.rx * 1.05;
      const cx = zone.x + ux * travel + sideX * laneOffset;
      const cy = zone.y + uy * travel + sideY * laneOffset;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(uy, ux));
      ctx.globalAlpha = 0.045 + phase * 0.075;
      ctx.fillStyle = '#f7fff2';
      ctx.beginPath();
      ctx.moveTo(3.8, 0);
      ctx.lineTo(-3.2, -2.1);
      ctx.lineTo(-1.3, 0);
      ctx.lineTo(-3.2, 2.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawCourse(ctx, hole, W, H, timeMs, showSlope) {
  // Background rough first, then water and course surfaces, then decorative objects on top.
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
