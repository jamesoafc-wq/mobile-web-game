// ============================================================================
// swing-meter.js  ·  redesigned power/timing meter (loads after ui-polish)
// ----------------------------------------------------------------------------
// A cleaner, more premium take on the swing timing bar. Same logic & data
// (pendingShot, getSkillMarkerPosition, sweet/safe/miss zones) — just a much
// nicer look: a rounded glass track, smooth graded zones with a luminous sweet
// spot, tick scale, and a glowing marker needle. Overrides drawSkillBar.
// ============================================================================

(function () {
  'use strict';
  if (typeof drawSkillBar !== 'function') return;

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawSkillBar = function drawSkillMeterRedesigned() {
    if (!pendingShot) return;
    var marker = getSkillMarkerPosition();
    var panel = getSkillPanelRect();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (typeof drawPanelRect === 'function') drawPanelRect(panel.x, panel.y, panel.w, panel.h, 12);

    var pad = 18;
    var trackX = panel.x + pad;
    var trackY = panel.y + 40;
    var trackW = panel.w - pad * 2;
    var trackH = 18;

    // --- header: club + lie ---
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f1faea';
    ctx.font = '900 13px system-ui';
    ctx.fillText(clubs[pendingShot.clubKey].short, panel.x + 16, panel.y + 26);
    ctx.fillStyle = 'rgba(220,236,208,0.65)';
    ctx.font = '750 10px system-ui';
    var lieLabel = (typeof surfaceLabels !== 'undefined' && surfaceLabels[pendingShot.lie]) || pendingShot.lie;
    ctx.fillText(lieLabel + ' · tap in the green', panel.x + 78, panel.y + 26);

    // zone geometry (same maths as before)
    var sweetW = pendingShot.sweetWidth;
    var midW = clamp(sweetW + 0.28 - pendingShot.difficulty * 0.06, sweetW + 0.14, 0.48);
    var sweetX = trackX + (0.5 - sweetW / 2) * trackW;
    var midX = trackX + (0.5 - midW / 2) * trackW;
    var markerX = trackX + marker * trackW;

    // --- track base (dark glass) ---
    ctx.fillStyle = 'rgba(8,16,10,0.55)';
    rr(ctx, trackX - 3, trackY - 3, trackW + 6, trackH + 6, 11); ctx.fill();

    // --- MISS zone (full track, red gradient) ---
    var gMiss = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
    gMiss.addColorStop(0, '#d23b3b'); gMiss.addColorStop(0.5, '#b83232'); gMiss.addColorStop(1, '#d23b3b');
    ctx.fillStyle = gMiss; rr(ctx, trackX, trackY, trackW, trackH, 9); ctx.fill();

    // --- SAFE zone (amber) ---
    var gSafe = ctx.createLinearGradient(midX, 0, midX + midW * trackW, 0);
    gSafe.addColorStop(0, '#f0b43c'); gSafe.addColorStop(0.5, '#ffcf5c'); gSafe.addColorStop(1, '#f0b43c');
    ctx.fillStyle = gSafe; rr(ctx, midX, trackY, midW * trackW, trackH, 9); ctx.fill();

    // --- SWEET zone (luminous green with glow) ---
    ctx.save();
    ctx.shadowColor = 'rgba(150,240,90,0.9)';
    ctx.shadowBlur = 12;
    var gSweet = ctx.createLinearGradient(sweetX, 0, sweetX + sweetW * trackW, 0);
    gSweet.addColorStop(0, '#7fe05a'); gSweet.addColorStop(0.5, '#b6ff7a'); gSweet.addColorStop(1, '#7fe05a');
    ctx.fillStyle = gSweet;
    rr(ctx, sweetX, trackY - 2, sweetW * trackW, trackH + 4, 8); ctx.fill();
    ctx.restore();
    // sweet-spot centre line
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sweetX + sweetW * trackW / 2, trackY - 1);
    ctx.lineTo(sweetX + sweetW * trackW / 2, trackY + trackH + 1);
    ctx.stroke();

    // --- glossy highlight across the top of the track ---
    var gloss = ctx.createLinearGradient(0, trackY, 0, trackY + trackH);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss; rr(ctx, trackX, trackY, trackW, trackH, 9); ctx.fill();

    // --- tick marks (quarter divisions) ---
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (var q = 1; q < 4; q++) {
      var tx = trackX + (q / 4) * trackW;
      ctx.beginPath(); ctx.moveTo(tx, trackY + 2); ctx.lineTo(tx, trackY + trackH - 2); ctx.stroke();
    }

    // --- marker needle (glowing) ---
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';
    // a slim rounded needle with a top knob
    rr(ctx, markerX - 1.6, trackY - 7, 3.2, trackH + 14, 1.6); ctx.fill();
    ctx.beginPath(); ctx.arc(markerX, trackY - 7, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, markerX + 1.4, trackY - 7, 1, trackH + 14, 0.5); ctx.fill();

    // --- zone legend ---
    ctx.textAlign = 'left'; ctx.font = '800 9px system-ui';
    ctx.fillStyle = '#b6ff7a'; ctx.fillText('SWEET', trackX, trackY + trackH + 16);
    ctx.fillStyle = '#ffcf5c'; ctx.fillText('SAFE', trackX + 46, trackY + trackH + 16);
    ctx.fillStyle = '#e87c7c'; ctx.fillText('MISS', trackX + 84, trackY + trackH + 16);

    ctx.restore();
    if (typeof drawStrikeCancelButton === 'function') drawStrikeCancelButton();
  };

  window.swingMeterRedesignLoaded = true;
})();
