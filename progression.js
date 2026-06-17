// ============================================================================
// progression.js  ·  XP, levels, coins, unlocks & customisation (loads after engine)
// ----------------------------------------------------------------------------
// A real, self-contained progression system (no backend — persists to
// localStorage, with a safe in-memory fallback). Owns:
//   * XP earned per hole by score (eagle > birdie > par > ...), + sweet-strike
//     bonuses, accumulating into LEVELS via a rising curve.
//   * COINS earned alongside XP, spent on customisation.
//   * COURSE UNLOCKS gated by level (replaces the old hardcoded locks).
//   * CUSTOMISATION: ball skins (colour/pattern) the player can equip; the
//     equipped skin actually changes the in-game ball.
//
// Everything is exposed on window.Progress for the menu UI to read/drive.
// Pure data + a couple of thin render hooks (ball skin). No core files edited.
// ============================================================================

(function () {
  'use strict';

  var KEY = 'golfProgress_v1';

  // ---------- persistence (safe) ----------
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---------- default state ----------
  var DEFAULT = {
    xp: 0,
    coins: 0,
    equippedBall: 'classic',
    ownedBalls: ['classic'],
    equippedTracer: 'classic',
    ownedTracers: ['classic'],
    bestScores: {}     // courseId -> best strokes-to-par
  };
  var state = Object.assign({}, DEFAULT, load() || {});
  // make sure arrays/objects exist after a partial load
  if (!Array.isArray(state.ownedBalls)) state.ownedBalls = ['classic'];
  if (!Array.isArray(state.ownedTracers)) state.ownedTracers = ['classic'];
  if (!state.equippedTracer) state.equippedTracer = 'classic';
  if (!state.bestScores) state.bestScores = {};
  if (state.ownedBalls.indexOf('classic') < 0) state.ownedBalls.unshift('classic');
  if (state.ownedTracers.indexOf('classic') < 0) state.ownedTracers.unshift('classic');

  // ---------- level curve ----------
  // XP needed to REACH level L (1-indexed). Smooth rising curve.
  function xpForLevel(L) { return Math.round(120 * (L - 1) * (L - 1) + 180 * (L - 1)); }
  function levelFromXp(xp) {
    var L = 1;
    while (xpForLevel(L + 1) <= xp) L++;
    return L;
  }
  function levelInfo() {
    var L = levelFromXp(state.xp);
    var cur = xpForLevel(L), next = xpForLevel(L + 1);
    var into = state.xp - cur, span = next - cur;
    return { level: L, into: into, span: span, pct: span > 0 ? into / span : 1, total: state.xp };
  }

  // ---------- catalogue ----------
  // Ball skins: colour + optional accent ring/pattern; cost in coins, or a level
  // requirement (unlocks free at that level).
  var BALLS = [
    { id: 'classic',  name: 'Classic White', color: '#ffffff', accent: '#d8d8e0', cost: 0,    level: 1 },
    { id: 'sunrise',  name: 'Sunrise',       color: '#ffd24a', accent: '#ff8a3c', cost: 120,  level: 1 },
    { id: 'flamingo', name: 'Flamingo',      color: '#ff8fc0', accent: '#ff4f8b', cost: 200,  level: 2 },
    { id: 'lagoon',   name: 'Lagoon',        color: '#5fe0e8', accent: '#1f9fc0', cost: 260,  level: 3 },
    { id: 'forest',   name: 'Forest',        color: '#9be870', accent: '#3f9e4f', cost: 300,  level: 4 },
    { id: 'magma',    name: 'Magma',         color: '#ff6a3c', accent: '#b81e1e', cost: 450,  level: 6 },
    { id: 'midnight', name: 'Midnight',      color: '#5566cc', accent: '#cfd6ff', cost: 600,  level: 8 },
    { id: 'gold',     name: 'Gold Pro',      color: '#ffdf6e', accent: '#b88a1e', cost: 1200, level: 12 }
  ];
  function ballById(id) { for (var i = 0; i < BALLS.length; i++) if (BALLS[i].id === id) return BALLS[i]; return BALLS[0]; }

  // Tracer (driver shot trail) colours — same buy/level model as balls.
  var TRACERS = [
    { id: 'classic',  name: 'Classic Gold', color: '#ffdd46', cost: 0,    level: 1 },
    { id: 'cyan',     name: 'Cyan',         color: '#65e8ff', cost: 100,  level: 1 },
    { id: 'crimson',  name: 'Crimson',      color: '#ff5a5a', cost: 150,  level: 2 },
    { id: 'violet',   name: 'Violet',       color: '#b68cff', cost: 220,  level: 3 },
    { id: 'mint',     name: 'Mint',         color: '#7cff95', cost: 280,  level: 4 },
    { id: 'ember',    name: 'Ember',        color: '#ff8a3c', cost: 420,  level: 6 },
    { id: 'aurora',   name: 'Aurora',       color: '#8affd6', cost: 600,  level: 9 },
    { id: 'plasma',   name: 'Plasma',       color: '#ff5cc8', cost: 1000, level: 12 }
  ];
  function tracerById(id) { for (var i = 0; i < TRACERS.length; i++) if (TRACERS[i].id === id) return TRACERS[i]; return TRACERS[0]; }

  // Course unlock requirements by level (id -> level). Willow always open.
  var COURSE_UNLOCK = { willow: 1, coral: 3, dunes: 6, pine: 10, silver: 15 };

  // ---------- XP / coin awards ----------
  function holeXp(toPar, sweetCount) {
    var base = toPar <= -2 ? 500 : toPar === -1 ? 300 : toPar === 0 ? 150 : toPar === 1 ? 60 : 25;
    return base + (sweetCount || 0) * 20;
  }
  function award(xp, coins) {
    var beforeL = levelFromXp(state.xp);
    state.xp += Math.max(0, Math.round(xp));
    state.coins += Math.max(0, Math.round(coins));
    var afterL = levelFromXp(state.xp);
    save();
    return { leveledUp: afterL > beforeL, from: beforeL, to: afterL };
  }

  // track sweet strikes during the current hole
  var sweetThisHole = 0;
  if (typeof resolveSkillShot === 'function') {
    var beforeResolveProg = resolveSkillShot;
    resolveSkillShot = function resolveSkillShotProg() {
      var r = beforeResolveProg();
      try { if (skillFeedback && skillFeedback.zone === 'sweet') sweetThisHole++; } catch (e) {}
      return r;
    };
  }

  // award on hole-out (wrap the round's maybeHoleOut wrapper, which records score)
  if (typeof maybeHoleOut === 'function') {
    var beforeHoleProg = maybeHoleOut;
    var awardedFor = -1;
    maybeHoleOut = function maybeHoleOutProg() {
      var holed = beforeHoleProg();
      if (holed) {
        try {
          var idx = (typeof roundHoleIndexV035 !== 'undefined') ? roundHoleIndexV035 : 0;
          if (awardedFor !== idx) {           // award once per hole
            awardedFor = idx;
            var toPar = strokes - hole.par;
            var xp = holeXp(toPar, sweetThisHole);
            var res = award(xp, xp * 0.12);
            state.lastAward = { xp: xp, coins: Math.round(xp * 0.12), leveledUp: res.leveledUp, level: res.to };
            // best score per course
            var cid = (typeof activeCourseV045 !== 'undefined' && activeCourseV045) ? activeCourseV045.id : null;
            if (cid != null) {
              var prev = state.bestScores[cid];
              if (prev == null || toPar < prev) state.bestScores[cid] = toPar;
              save();
            }
            sweetThisHole = 0;
          }
        } catch (e) {}
      }
      return holed;
    };
  }
  // reset per-hole sweet counter when a new hole starts
  if (typeof resetRoundHoleV035 === 'function') {
    var beforeResetProg = resetRoundHoleV035;
    resetRoundHoleV035 = function resetRoundHoleProg(i) {
      sweetThisHole = 0;
      return beforeResetProg(i);
    };
  }

  // ---------- ball skin render hook ----------
  // Recolour the ball to the equipped skin. drawBall fills with '#fff'; we wrap
  // it to temporarily swap the fillStyle setter is messy, so instead we draw an
  // overlay dot in the skin colour right after the base ball.
  if (typeof drawBall === 'function') {
    var beforeBallProg = drawBall;
    drawBall = function drawBallSkinned() {
      beforeBallProg();
      try {
        if (!ball || ball.holed === undefined) return;
        if (!isFinite(ball.x) || !isFinite(ball.y) || !(ball.radius > 0)) return;
        if (ball.flight) return;  // keep flight visuals simple
        var sk = ballById(state.equippedBall);
        if (sk.id === 'classic') return;  // classic = default white, no overlay
        ctx.save();
        var r = ball.radius;
        var grd = ctx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, r * 0.2, ball.x, ball.y, r);
        grd.addColorStop(0, sk.color);
        grd.addColorStop(1, sk.accent);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2); ctx.fill();
        // little highlight
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(ball.x - r * 0.32, ball.y - r * 0.32, r * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } catch (e) {}
    };
  }

  // ---- tracer colour: take over the driver trail renderer ----
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  if (typeof drawDriverTrailV038 === 'function') {
    drawDriverTrailV038 = function drawDriverTrailProg() {
      try {
        if (typeof driverTrailV038 === 'undefined' || driverTrailV038.length < 2) return;
        var nowMs = (performance && performance.now) ? performance.now() : Date.now();
        if (!driverTrailActiveV038 && nowMs > driverTrailUntilV038) return;
        var colour = tracerById(state.equippedTracer).color;
        var cam = getCamera();
        ctx.save();
        ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = hexA(colour, 0.28); ctx.lineWidth = 5.4;
        ctx.beginPath();
        driverTrailV038.forEach(function (p, idx) { idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        ctx.strokeStyle = hexA(colour, 0.88); ctx.lineWidth = 2.5;
        ctx.beginPath();
        driverTrailV038.forEach(function (p, idx) { idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        ctx.restore();
      } catch (e) {}
    };
  }

  // ---------- public API ----------
  window.Progress = {
    state: function () { return state; },
    level: levelInfo,
    coins: function () { return state.coins; },
    balls: function () { return BALLS; },
    ballById: ballById,
    owns: function (id) { return state.ownedBalls.indexOf(id) >= 0; },
    equipped: function () { return state.equippedBall; },
    tracers: function () { return TRACERS; },
    tracerById: tracerById,
    ownsTracer: function (id) { return state.ownedTracers.indexOf(id) >= 0; },
    equippedTracer: function () { return state.equippedTracer; },
    bestScore: function (cid) { return state.bestScores[cid]; },
    lastAward: function () { return state.lastAward || null; },

    // course unlock check by level
    courseUnlockLevel: function (cid) { return COURSE_UNLOCK[cid] || 1; },
    courseUnlocked: function (cid) { return levelInfo().level >= (COURSE_UNLOCK[cid] || 1); },

    // buy a ball: must have coins AND meet level; returns true on success
    buyBall: function (id) {
      var b = ballById(id);
      if (state.ownedBalls.indexOf(id) >= 0) return true;
      if (levelInfo().level < b.level) return false;
      if (state.coins < b.cost) return false;
      state.coins -= b.cost;
      state.ownedBalls.push(id);
      save();
      return true;
    },
    // equip an owned ball
    equip: function (id) {
      if (state.ownedBalls.indexOf(id) < 0) return false;
      state.equippedBall = id; save(); return true;
    },
    buyTracer: function (id) {
      var tr = tracerById(id);
      if (state.ownedTracers.indexOf(id) >= 0) return true;
      if (levelInfo().level < tr.level) return false;
      if (state.coins < tr.cost) return false;
      state.coins -= tr.cost;
      state.ownedTracers.push(id);
      save();
      return true;
    },
    equipTracer: function (id) {
      if (state.ownedTracers.indexOf(id) < 0) return false;
      state.equippedTracer = id; save(); return true;
    },
    // dev/testing helper
    _reset: function () { state = Object.assign({}, DEFAULT, { ownedBalls: ['classic'], bestScores: {} }); save(); }
  };

  window.progressionLoaded = true;
})();
