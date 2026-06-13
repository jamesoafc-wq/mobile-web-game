// Visual polish only. Loaded after active-tuning.js.
// Keeps gameplay behaviour unchanged while sharpening HUD and strike UI.

function drawPanelRect(x, y, w, h, r = 8) {
  ctx.fillStyle = 'rgba(5, 11, 7, 0.88)';
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawAccentRule(x, y, w) {
  ctx.strokeStyle = 'rgba(191,244,121,0.82)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function drawStrikeCancelButton() {
  if (!pendingShot) return;
  const button = getStrikeCancelButton();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(18, 22, 18, 0.95)';
  roundRect(ctx, button.x, button.y, button.w, button.h, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f1e8dd';
  ctx.font = '850 9.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CANCEL', button.x + button.w / 2, button.y + button.h / 2 + 0.5);
  ctx.restore();
}

drawSkillBar = function drawSkillBarPolished() {
  if (!pendingShot) return;
  const marker = getSkillMarkerPosition();
  const panel = getSkillPanelRect();
  const barX = panel.x + 22;
  const barY = panel.y + 39;
  const barW = panel.w - 44;
  const barH = 14;
  const middleWidth = clamp(pendingShot.sweetWidth + 0.28 - pendingShot.difficulty * 0.06, pendingShot.sweetWidth + 0.14, 0.48);
  const middleX = barX + (0.5 - middleWidth / 2) * barW;
  const sweetX = barX + (0.5 - pendingShot.sweetWidth / 2) * barW;
  const markerX = barX + marker * barW;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawPanelRect(panel.x, panel.y, panel.w, panel.h, 10);
  drawAccentRule(panel.x + 14, panel.y + 8, 54);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#eef8e6';
  ctx.font = '900 12px system-ui';
  ctx.fillText(`${clubs[pendingShot.clubKey].short}`, panel.x + 16, panel.y + 25);
  ctx.fillStyle = 'rgba(221,238,210,0.72)';
  ctx.font = '750 10px system-ui';
  ctx.fillText(`${surfaceLabels[pendingShot.lie]} · tap in the green`, panel.x + 68, panel.y + 25);

  ctx.fillStyle = 'rgba(255,79,79,0.54)';
  roundRect(ctx, barX, barY, barW, barH, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(238,189,64,0.86)';
  roundRect(ctx, middleX, barY, middleWidth * barW, barH, 5);
  ctx.fill();
  ctx.fillStyle = '#a8ee64';
  roundRect(ctx, sweetX, barY - 2, pendingShot.sweetWidth * barW, barH + 4, 6);
  ctx.fill();

  ctx.strokeStyle = '#f8fff1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(markerX, barY - 8);
  ctx.lineTo(markerX, barY + barH + 8);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(221,238,210,0.72)';
  ctx.font = '750 9.5px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('SWEET  ·  SAFE  ·  MISS', panel.x + panel.w - 16, panel.y + 77);
  ctx.restore();

  drawStrikeCancelButton();
};

drawOverlayInfo = function drawInCanvasHudPolished() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  drawPanelRect(8, 8, canvas.width - 16, 54, 9);
  drawAccentRule(22, 16, 46);

  ctx.fillStyle = '#eef8e6';
  ctx.font = '900 11px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${hole.name} · Par ${hole.par}`, 22, 32);
  ctx.fillStyle = 'rgba(221,238,210,0.72)';
  ctx.font = '800 9.5px system-ui';
  ctx.fillText(`${surfaceLabels[getLie()]} · ${clubs[selectedClub].short}`, 22, 48);

  ctx.fillStyle = '#f5ffe9';
  ctx.textAlign = 'center';
  ctx.font = '950 13px system-ui';
  ctx.fillText(`${getDistanceToCupYards()} yd`, canvas.width / 2, 36);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#eef8e6';
  ctx.font = '900 11px system-ui';
  ctx.fillText(`Strokes ${strokes}`, canvas.width - 22, 30);
  ctx.fillStyle = 'rgba(221,238,210,0.72)';
  ctx.font = '850 9.5px system-ui';
  ctx.fillText(getTopRightScoreText(), canvas.width - 22, 47);

  if (isPuttingView()) {
    ctx.fillStyle = 'rgba(168,238,100,0.16)';
    roundRect(ctx, canvas.width - 118, 66, 104, 24, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,238,100,0.28)';
    ctx.stroke();
    ctx.fillStyle = '#dfffbd';
    ctx.textAlign = 'center';
    ctx.font = '850 10px system-ui';
    ctx.fillText('PUTTING ZOOM', canvas.width - 66, 82);
  }

  ctx.restore();
};
