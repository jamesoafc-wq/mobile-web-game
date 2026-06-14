// Visual layering fix. Keeps hazard/surface logic untouched, but restores readable drawing order.

function drawSlopeRead(ctx, hole, timeMs) {
  hole.slopeZones.forEach(zone => {
    const len = Math.hypot(zone.dx, zone.dy) || 1;
    const ux = zone.dx / len;
    const uy = zone.dy / len;
    for (let i = -1; i <= 1; i++) {
      const phase = ((timeMs * 0.0013 + i * 0.33) % 1);
      const cx = zone.x + ux * (phase - 0.5) * zone.rx * 0.95;
      const cy = zone.y + uy * (phase - 0.5) * zone.ry * 0.95;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.atan2(uy, ux));
      ctx.globalAlpha = 0.08 + phase * 0.12;
      ctx.fillStyle = '#f7fff2';
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-4, -3);
      ctx.lineTo(-1.5, 0);
      ctx.lineTo(-4, 3);
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
