// ============================================================================
// feedback-fx.js  ·  hit-quality flash + score-name celebration (loads late)
// ----------------------------------------------------------------------------
// Two pieces of juicy feedback, both rendered in screen space on top of the
// scene (no boxes — they live over the course background):
//
//  1) HIT FLASH — the instant a full shot resolves, a coloured glow pulses in
//     from the screen edges: green = sweet strike, amber = safe, red = miss.
//     A clear non-text signal for how well you struck it.
//
//  2) SCORE NAME — when the ball drops, the result name animates in big over
//     the course: Eagle/Birdie are large and dramatic (scale + glow + hang),
//     Par is moderate, Bogey and worse are smaller and quieter. No container —
//     just bold glowing text with a shadow so it reads on any background.
//
// Hooks resolveSkillShot (flash) and watches ball.holed (score name). Renders by
// wrapping draw(). Pure overlay; no game state touched.
// ============================================================================

(function () {
  'use strict';

  // Neutralise the legacy boxed hole-result splash (drawHoleResultSplashV039) —
  // it drew a dark dim + rounded box with e.g. "Birdie". This module now owns
  // the score celebration (big text, no box), so silence the old one.
  if (typeof drawHoleResultSplashV039 === 'function') {
    drawHoleResultSplashV039 = function () {};
  }
  if (typeof holeResultSplashV039 !== 'undefined') {
    try { holeResultSplashV039 = null; } catch (e) {}
  }

  function now() { return (performance && performance.now) ? performance.now() : Date.now(); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(t) { return 1 - Math.pow(1 - clamp01(t), 3); }

  // ---- 1) HIT FLASH ---------------------------------------------------------
  var flash = null;  // { start, zone }
  var FLASH_MS = 1100;
  var zoneColor = { sweet: '120,235,90', middle: '240,190,70', bad: '235,80,80' };

  if (typeof resolveSkillShot === 'function') {
    var beforeResolve = resolveSkillShot;
    resolveSkillShot = function resolveSkillShotFx() {
      var r = beforeResolve();
      try {
        var z = (typeof skillFeedback !== 'undefined' && skillFeedback) ? skillFeedback.zone : null;
        if (z) flash = { start: now(), zone: z };
      } catch (e) {}
      return r;
    };
  }

  function drawFlash(ctx, W, H) {
    if (!flash) return;
    var t = (now() - flash.start) / FLASH_MS;
    if (t >= 1) { flash = null; return; }
    var rgb = zoneColor[flash.zone] || zoneColor.middle;
    // envelope: fast rise (0-15%), hold (15-55%), smooth fade (55-100%)
    var peak = (flash.zone === 'sweet' ? 0.5 : flash.zone === 'bad' ? 0.42 : 0.32);
    var env;
    if (t < 0.15) env = easeOut(t / 0.15);
    else if (t < 0.55) env = 1;
    else env = 1 - easeOut((t - 0.55) / 0.45);
    var a = env * peak;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // edge vignette glow (strong at edges, clear in the centre so play stays visible)
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(' + rgb + ',0)');
    g.addColorStop(0.6, 'rgba(' + rgb + ',' + (a * 0.35).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',' + a.toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ---- 2) SCORE NAME --------------------------------------------------------
  var score = null;          // { start, text, tier }
  var wasHoled = false;
  var SCORE_MS = 2600;

  // tier drives how "in your face" it is: 3 = albatross/eagle, 2 = birdie,
  // 1 = par, 0 = bogey, -1 = double+; bigger tier => bigger, glowier, longer.
  function tierFor(toPar) {
    if (toPar <= -2) return 3;     // eagle / albatross
    if (toPar === -1) return 2;    // birdie
    if (toPar === 0) return 1;     // par
    if (toPar === 1) return 0;     // bogey
    return -1;                     // double bogey or worse
  }

  function watchHoled() {
    var holed = (typeof ball !== 'undefined' && ball && ball.holed);
    if (holed && !wasHoled) {
      try {
        var toPar = strokes - hole.par;
        var text = (typeof getCurrentScorePhrase === 'function')
          ? getCurrentScorePhrase(toPar) : 'Hole out';
        var sub = strokes + (strokes === 1 ? ' shot on a par ' : ' shots on a par ') + hole.par;
        score = { start: now(), text: text.toUpperCase(), sub: sub, tier: tierFor(toPar) };
      } catch (e) {}
    }
    wasHoled = holed;
  }

  function drawScoreName(ctx, W, H) {
    if (!score) return;
    var t = (now() - score.start) / SCORE_MS;
    if (t >= 1) { score = null; return; }

    var tier = score.tier;
    // base size by tier — eagle huge, par moderate, bogey+ small
    var baseSize = tier >= 3 ? 64 : tier === 2 ? 54 : tier === 1 ? 40 : tier === 0 ? 30 : 26;
    baseSize = Math.min(baseSize, W * (tier >= 2 ? 0.18 : 0.12));

    // animation: pop in (overshoot) -> hold -> drift up & fade
    var inT = clamp01(t / 0.18);
    var outT = clamp01((t - 0.7) / 0.3);
    var pop = tier >= 2 ? (1 + 0.18 * (1 - easeOut(inT))) : 1;  // good scores overshoot
    var scale = easeOut(inT) * pop;
    var rise = outT * (tier >= 2 ? -46 : -26);
    var alpha = (1 - outT) * easeOut(inT);

    var cx = W / 2;
    var cy = H * (tier >= 2 ? 0.34 : 0.4) + rise;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // colour by tier: gold-ish for great, white for par, cooler/muted for bad
    var fill = tier >= 3 ? '#ffe27a' : tier === 2 ? '#bff58a' : tier === 1 ? '#f4fff0'
             : tier === 0 ? '#dfe6da' : '#c9b6b0';

    // strong shadow + glow so it stands out over the course with no box
    ctx.font = '950 ' + baseSize.toFixed(0) + 'px system-ui';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    // outline for legibility on bright greens
    ctx.lineWidth = Math.max(3, baseSize * 0.07);
    ctx.strokeStyle = 'rgba(8,20,10,0.78)';
    ctx.strokeText(score.text, 0, 0);
    if (tier >= 2) { ctx.shadowColor = 'rgba(' + (tier >= 3 ? '255,220,110' : '150,240,90') + ',0.9)'; ctx.shadowBlur = 22; }
    ctx.fillStyle = fill;
    ctx.fillText(score.text, 0, 0);

    // subtitle line under the name on every score (e.g. "2 shots on a par 4"),
    // same styling family — slightly transparent white, sized off the title.
    if (score.sub) {
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = Math.max(2, baseSize * 0.04);
      ctx.strokeStyle = 'rgba(8,20,10,0.7)';
      ctx.font = '800 ' + (baseSize * 0.28).toFixed(0) + 'px system-ui';
      ctx.strokeText(score.sub, 0, baseSize * 0.62);
      ctx.fillStyle = 'rgba(244,255,240,0.92)';
      ctx.fillText(score.sub, 0, baseSize * 0.62);
    }
    ctx.restore();
  }

  // ---- render hook: wrap draw() ---------------------------------------------
  if (typeof draw === 'function') {
    var beforeDraw = draw;
    draw = function drawWithFeedbackFx() {
      beforeDraw();
      watchHoled();
      try {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawFlash(ctx, canvas.width, canvas.height);
        drawScoreName(ctx, canvas.width, canvas.height);
        ctx.restore();
      } catch (e) {}
    };
  }

  window.feedbackFxLoaded = true;
})();
