// ============================================================================
// hole-intro.js  ·  cinematic hole flyover + cart/sprinklers + clean hole card
// ----------------------------------------------------------------------------
// On a new hole: the camera zooms near the tee and flies down to the green then
// settles to play view, while a cart drives the fairway and sprinklers spray.
// A tidy hole card (number/par/distance) also slides in. Both end on first input.
// ============================================================================

(function () {
  'use strict';

  var INTRO_MS = 4200;
  var intro = { active: false, start: 0, holeKey: null };

  function now() { return (performance && performance.now) ? performance.now() : Date.now(); }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function startIntro() {
    if (typeof hole === 'undefined' || !hole) return;
    intro.active = true;
    intro.start = now();
    intro.holeKey = (hole.id || 0) + ':' + hole.cup.x;
    showCard(hole);
  }
  function endIntro() { intro.active = false; }
  function progress() { return ease((now() - intro.start) / INTRO_MS); }

  // ---- cinematic camera ----
  function introCamera() {
    var p = progress();
    var W = canvas.width, H = canvas.height;
    var tee = hole.start, cup = hole.cup;
    var travel = ease(Math.min(1, p / 0.8));
    var fx = lerp(tee.x, cup.x, travel);
    var fy = lerp(tee.y, cup.y, travel);
    var z = lerp(1.7, 1.05, travel);
    var cam = { zoom: z, tx: W / 2 - fx * z, ty: H / 2 - fy * z };
    if (p > 0.82) {
      var blend = ease((p - 0.82) / 0.18);
      var play = baseGetCamera();
      cam.zoom = lerp(cam.zoom, play.zoom, blend);
      cam.tx = lerp(cam.tx, play.tx, blend);
      cam.ty = lerp(cam.ty, play.ty, blend);
    }
    if (p >= 1) endIntro();
    return cam;
  }

  var baseGetCamera = (typeof getCamera === 'function') ? getCamera : function () { return { zoom: 1, tx: 0, ty: 0 }; };
  getCamera = function getCameraWithIntro() {
    if (intro.active && typeof hole !== 'undefined' && hole) {
      try { return introCamera(); } catch (e) { endIntro(); }
    }
    return baseGetCamera();
  };

  // ---- living-course décor during intro ----
  function roundRectLocal(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawCart(ctx, hole, p) {
    var tee = hole.start, cup = hole.cup;
    var t = Math.min(1, p / 0.85);
    var cx = lerp(tee.x + 26, cup.x + 22, t);
    var cy = lerp(tee.y - 10, cup.y + 30, t);
    var ang = Math.atan2(cup.y - tee.y, cup.x - tee.x);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8eef2'; roundRectLocal(ctx, -6, -9, 12, 18, 3); ctx.fill();
    ctx.fillStyle = 'rgba(245,250,255,0.85)'; roundRectLocal(ctx, -6.5, -4, 13, 8, 2); ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-7.5, -7, 2.5, 4); ctx.fillRect(5, -7, 2.5, 4);
    ctx.fillRect(-7.5, 4, 2.5, 4); ctx.fillRect(5, 4, 2.5, 4);
    ctx.restore();
  }
  function pbounds(poly) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < poly.length; i++) { var p = poly[i]; if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }
  function drawSprinklers(ctx, hole, p, timeMs) {
    if (!hole.fairway || hole.fairway.length < 3) return;
    var b = pbounds(hole.fairway);
    var seed = Math.floor(hole.cup.x + hole.cup.y);
    var n = 4;
    for (var i = 0; i < n; i++) {
      var sy = lerp(b.minY + 40, b.maxY - 40, i / (n - 1));
      var sx = (b.minX + b.maxX) / 2 + Math.sin(i * 2.1 + seed) * (b.maxX - b.minX) * 0.18;
      ctx.fillStyle = 'rgba(60,70,60,0.8)'; ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
      var rot = timeMs * 0.004 + i * 1.3;
      ctx.strokeStyle = 'rgba(190,225,255,0.5)'; ctx.lineWidth = 1;
      for (var a = 0; a < 5; a++) { var aa = rot + a * 0.22; ctx.beginPath(); ctx.moveTo(sx, sy); var rr = 12 + Math.sin(timeMs * 0.01 + a) * 2; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); ctx.stroke(); }
      ctx.fillStyle = 'rgba(210,238,255,0.35)';
      for (var d = 0; d < 6; d++) { var da = rot * 1.3 + d; ctx.beginPath(); ctx.arc(sx + Math.cos(da) * 10, sy + Math.sin(da) * 10, 0.9, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  if (typeof drawCourse === 'function') {
    var beforeCourse = drawCourse;
    drawCourse = function drawCourseWithIntroDecor(ctx, hole, W, H, t, showSlope) {
      beforeCourse(ctx, hole, W, H, t, showSlope);
      if (intro.active && hole && !hole.isRange) {
        var p = progress();
        try { drawSprinklers(ctx, hole, p, t); drawCart(ctx, hole, p); } catch (e) {}
      }
    };
  }

  // ---- clean hole card (DOM) ----
  function holeDistanceYards(h) {
    if (!h || !h.start || !h.cup) return null;
    var dx = h.cup.x - h.start.x, dy = h.cup.y - h.start.y;
    var ypp = (typeof YARDS_PER_PIXEL !== 'undefined') ? YARDS_PER_PIXEL : 0.92;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * ypp);
  }
  function showCard(h) {
    if (!h || h.isRange) return;
    try {
      var old = document.getElementById('holeCardV2'); if (old) old.remove();
      var num = (typeof roundHoleIndexV035 !== 'undefined') ? roundHoleIndexV035 + 1 : (h.id || 1);
      var yards = holeDistanceYards(h);
      var card = document.createElement('div');
      card.id = 'holeCardV2';
      card.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%) translateY(-10px);' +
        'z-index:99990;background:linear-gradient(135deg,rgba(31,107,56,.96),rgba(14,58,32,.96));' +
        'border:1px solid rgba(255,226,122,.45);border-radius:16px;padding:12px 20px;text-align:center;' +
        'box-shadow:0 12px 34px rgba(0,0,0,.4);opacity:0;transition:opacity .4s ease,transform .4s ease;pointer-events:none;';
      card.innerHTML = '<div style="font:950 12px system-ui;color:#ffe27a;letter-spacing:2px;">HOLE ' + num + '</div>' +
        '<div style="font:900 14px system-ui;color:#fff;margin-top:3px;">Par ' + (h.par || 4) + (yards ? '  ·  ' + yards + ' yds' : '') + '</div>';
      document.body.appendChild(card);
      requestAnimationFrame(function () { card.style.opacity = '1'; card.style.transform = 'translateX(-50%) translateY(0)'; });
      setTimeout(function () { card.style.opacity = '0'; card.style.transform = 'translateX(-50%) translateY(-10px)'; setTimeout(function () { if (card.parentNode) card.remove(); }, 450); }, 2000);
    } catch (e) {}
  }

  if (typeof resetRoundHoleV035 === 'function') {
    var beforeReset = resetRoundHoleV035;
    resetRoundHoleV035 = function resetRoundHoleWithIntro(i) {
      beforeReset(i);
      startIntro();
    };
  }
  function killOnInput() { if (intro.active) endIntro(); }
  if (typeof canvas !== 'undefined' && canvas) canvas.addEventListener('pointerdown', killOnInput, true);
  document.addEventListener('pointerdown', killOnInput, true);
  if (typeof hole !== 'undefined' && hole) startIntro();

  window.holeIntroLoaded = true;
})();
