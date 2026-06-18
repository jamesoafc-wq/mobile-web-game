// ============================================================================
// legacy-cleanup.js  ·  remove superseded v057 menus (loads LAST)
// ----------------------------------------------------------------------------
// The old customisation-v057 and progression-career-v057 inject their own panels
// (ball/tracer/skin chooser, separate career box) into the course menu and the
// customisation one also overrides drawBall with its own ball colour. All of
// that is replaced by the new progression system + Ball/Tracer locker, so here
// we neutralise the legacy UI and hand ball/tracer rendering back to the new
// system. (We keep the legacy round-recording side-effects that are harmless.)
// ============================================================================

(function () {
  'use strict';

  // 1) stop the legacy panels from being injected into the menu
  if (typeof injectCustomPanelV057 === 'function') injectCustomPanelV057 = function () {};
  if (typeof injectCareerPanelV057 === 'function') injectCareerPanelV057 = function () {};

  // remove any panels already injected this session
  function stripLegacyPanels() {
    try {
      document.querySelectorAll('[data-custom-panel-v057="true"],[data-career-panel-v057="true"]')
        .forEach(function (el) { el.remove(); });
    } catch (e) {}
  }
  stripLegacyPanels();

  // 2) re-install the new system's ball skin renderer as the final drawBall,
  // overriding customisation-v057's ball colour. We reproduce the new skin
  // overlay here so it wins regardless of load order.
  if (typeof drawBall === 'function' && window.Progress) {
    var baseBall = drawBall;
    drawBall = function drawBallFinalSkin() {
      baseBall();
      try {
        if (!ball) return;
        if (!isFinite(ball.x) || !isFinite(ball.y) || !(ball.radius > 0)) return;
        var sk = Progress.ballById(Progress.equipped());
        if (!sk || sk.id === 'classic') return;
        // match the base ball's drawn size (it scales up during flight)
        var vs = (typeof ball.visualScale === 'number' && ball.visualScale > 0) ? ball.visualScale : 1;
        var r = ball.radius * vs;
        ctx.save();
        var grd = ctx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, r * 0.2, ball.x, ball.y, r);
        grd.addColorStop(0, sk.color);
        grd.addColorStop(1, sk.accent);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(ball.x - r * 0.32, ball.y - r * 0.32, Math.max(1.2, r * 0.26), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } catch (e) {}
    };
  }

  // 3) re-apply the equipped-tracer colour to the driver trail. The legacy
  // customisation-v057 re-overrode drawDriverTrailV038 with its own colour AFTER
  // progression.js set ours, so we install ours again here (loads last → wins).
  if (typeof drawDriverTrailV038 === 'function' && window.Progress) {
    function _hexA(hex, a) {
      var h = hex.replace('#', '');
      return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
    }
    drawDriverTrailV038 = function drawDriverTrailFinal() {
      try {
        if (typeof driverTrailV038 === 'undefined' || driverTrailV038.length < 2) return;
        var nowMs = (performance && performance.now) ? performance.now() : Date.now();
        if (!driverTrailActiveV038 && nowMs > driverTrailUntilV038) return;
        var colour = Progress.tracerById(Progress.equippedTracer()).color;
        var cam = getCamera();
        ctx.save();
        ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = _hexA(colour, 0.28); ctx.lineWidth = 5.4;
        ctx.beginPath();
        driverTrailV038.forEach(function (p, idx) { idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        ctx.strokeStyle = _hexA(colour, 0.88); ctx.lineWidth = 2.5;
        ctx.beginPath();
        driverTrailV038.forEach(function (p, idx) { idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        ctx.restore();
      } catch (e) {}
    };
  }

  // 4) make sure the menu renders the new (clean) layout now
  try { if (typeof renderCourseMenuV045 === 'function') renderCourseMenuV045(); } catch (e) {}

  window.legacyCleanupLoaded = true;
})();
