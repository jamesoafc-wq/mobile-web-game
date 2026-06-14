// Slope arrow visual balance for v0.33.
// Visual-only: slope physics and putting physics are untouched.

function getSlopeVisualAreaScore(zone) {
  return Math.sqrt(Math.max(1, zone.rx * zone.ry));
}

function getSlopeVisualLaneCount(zone) {
  const areaScore = getSlopeVisualAreaScore(zone);
  return Math.round(clamp(areaScore / 19, 2, 5));
}

function getSlopeVisualArrowCount(axisSpan, laneCount) {
  return Math.round(clamp(axisSpan / 16 + laneCount * 0.4, 4, 8));
}

drawSlopeRead = function drawSlopeReadBalancedV033(ctx, hole, timeMs) {
  hole.slopeZones.forEach((zone, zoneIndex) => {
    const physicsLen = Math.hypot(zone.dx, zone.dy) || 1;
    const physicsX = zone.dx / physicsLen;
    const physicsY = zone.dy / physicsLen;
    const rot = zone.rotation || 0;

    const axisA = { x: Math.cos(rot), y: Math.sin(rot), span: zone.rx };
    const axisB = { x: -Math.sin(rot), y: Math.cos(rot), span: zone.ry };
    let axis = Math.abs(axisA.x * physicsX + axisA.y * physicsY) >= Math.abs(axisB.x * physicsX + axisB.y * physicsY) ? axisA : axisB;
    if (axis.x * physicsX + axis.y * physicsY < 0) axis = { x: -axis.x, y: -axis.y, span: axis.span };

    const sideX = -axis.y;
    const sideY = axis.x;
    const angle = Math.atan2(axis.y, axis.x);
    const strength = clamp((zone.strength - 0.00045) / 0.00045, 0.15, 1);
    const areaScore = getSlopeVisualAreaScore(zone);
    const laneCount = getSlopeVisualLaneCount(zone);
    const arrowsPerLane = getSlopeVisualArrowCount(axis.span, laneCount);
    const speed = 0.0002 + strength * 0.00024;
    const lineLength = clamp(axis.span * 1.42, 32, axis.span * 1.55);
    const laneSpread = Math.min(zone.ry * 0.96, areaScore * 1.08);

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
      const laneT = laneCount === 1 ? 0.5 : laneIndex / (laneCount - 1);
      const laneOffset = (laneT - 0.5) * laneSpread;
      const lineStartX = zone.x - axis.x * lineLength * 0.5 + sideX * laneOffset;
      const lineStartY = zone.y - axis.y * lineLength * 0.5 + sideY * laneOffset;
      const lineEndX = zone.x + axis.x * lineLength * 0.5 + sideX * laneOffset;
      const lineEndY = zone.y + axis.y * lineLength * 0.5 + sideY * laneOffset;

      ctx.save();
      ctx.strokeStyle = `rgba(247,255,242,${0.02 + strength * 0.02})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.stroke();
      ctx.restore();

      for (let arrowIndex = 0; arrowIndex < arrowsPerLane; arrowIndex++) {
        const seed = arrowIndex / arrowsPerLane;
        const phase = (timeMs * speed + seed + laneIndex * 0.061 + zoneIndex * 0.109) % 1;
        const travel = (phase - 0.5) * lineLength;
        const fade = Math.sin(phase * Math.PI);
        const cx = zone.x + axis.x * travel + sideX * laneOffset;
        const cy = zone.y + axis.y * travel + sideY * laneOffset;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.globalAlpha = (0.04 + strength * 0.045) * fade;
        ctx.strokeStyle = '#f7fff2';
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-3.2, -1.8);
        ctx.quadraticCurveTo(-0.2, -0.35, 3.1, 0);
        ctx.quadraticCurveTo(-0.2, 0.35, -3.2, 1.8);
        ctx.stroke();
        ctx.restore();
      }
    }
  });
};
