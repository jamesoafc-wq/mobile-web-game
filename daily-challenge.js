// ============================================================================
// daily-challenge.js  ·  one date-seeded hole per day, with a logged best + streak
// ----------------------------------------------------------------------------
// Adds a "Daily Challenge" entry to the course menu. Tapping it loads a single
// hole chosen deterministically from today's date (same hole all day), applies
// a fixed wind, and records your best score for that day plus a day streak.
// Reuses the existing course/hole machinery and localStorage. Fully additive.
// ============================================================================

(function () {
  'use strict';
  if (typeof applyCourseV045 !== 'function' || typeof COURSES_V045 === 'undefined') return;

  var LS = 'golfDaily_v1';
  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {} }

  function todayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  // deterministic int from the date string
  function dateSeed(key) { var s = 0; for (var i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) >>> 0; return s; }

  // choose today's course + hole from the seed (only unlocked courses are fair,
  // but the daily is a fixed showcase so we allow any course)
  function pickToday() {
    var key = todayKey();
    var seed = dateSeed(key);
    var playable = COURSES_V045.filter(function (c) { return c.holes && c.holes.length; });
    if (!playable.length) playable = COURSES_V045;
    var course = playable[seed % playable.length];
    var holeIdx = (seed >> 4) % 18;
    return { key: key, course: course, holeIdx: holeIdx, seed: seed };
  }

  var dailyActive = null;

  function startDaily() {
    var pick = pickToday();
    applyCourseV045(pick.course);
    if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(pick.holeIdx);
    // fix the wind deterministically for the day
    if (typeof windStateV057 !== 'undefined') {
      var mph = 4 + (pick.seed % 12);
      windStateV057 = { angle: (pick.seed % 628) / 100, mph: mph, label: (typeof windLabelV057 === 'function' ? windLabelV057(mph) : 'Wind'), difficulty: 2 };
    }
    dailyActive = pick;
    // hide menu / show course (reuse whatever the normal course-start path does)
    if (typeof hideCourseMenuV045 === 'function') hideCourseMenuV045();
    if (typeof updateHud === 'function') updateHud();
  }

  // record the score when the daily hole is holed
  if (typeof maybeHoleOut === 'function') {
    var beforeDaily = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutDaily() {
      var wasFlying = ball && ball.holed;
      beforeDaily.apply(this, arguments);
      if (!dailyActive) return;
      if (ball && ball.holed && typeof strokes !== 'undefined') {
        var st = load();
        var rec = st[dailyActive.key];
        var par = (typeof hole !== 'undefined' && hole) ? hole.par : 4;
        var toPar = strokes - par;
        if (!rec || toPar < rec.toPar) {
          // update streak: if yesterday was played, increment; else reset to 1
          var y = new Date(); y.setDate(y.getDate() - 1);
          var ykey = todayKey(y);
          var streak = (st.streak && st.lastKey === ykey) ? (st.streak + 1) : (st.lastKey === dailyActive.key ? (st.streak || 1) : 1);
          st[dailyActive.key] = { toPar: toPar, strokes: strokes, par: par };
          st.streak = streak; st.lastKey = dailyActive.key;
          save(st);
          if (window.Achievements) Achievements.check('dailyStreak', { streak: streak });
        }
        dailyActive = null;
      }
    };
  }

  // ---- menu entry: a button injected at the top of the course menu ----
  function injectDailyButton() {
    var menu = (typeof courseMenuV045 !== 'undefined' && courseMenuV045) ? courseMenuV045 : document.querySelector('[data-course-menu]');
    var shell = menu && menu.firstElementChild ? menu.firstElementChild : menu;
    if (!shell || shell.querySelector('[data-daily-v1]')) return;

    var st = load();
    var pick = pickToday();
    var done = st[pick.key];
    var streak = (st.streak && st.lastKey) ? st.streak : 0;

    var card = document.createElement('div');
    card.dataset.dailyV1 = 'true';
    card.style.cssText = 'margin:0 0 14px;padding:14px 16px;border-radius:18px;cursor:pointer;' +
      'background:linear-gradient(135deg,#2a7d46,#155a30);border:1px solid rgba(255,226,122,.4);' +
      'box-shadow:0 8px 22px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:space-between;gap:12px;';
    card.innerHTML =
      '<div><div style="font:950 16px system-ui;color:#fff;">⛳ Daily Challenge</div>' +
      '<div style="font:800 11px system-ui;color:rgba(255,255,255,.82);margin-top:3px;">' +
      pick.course.name + ' · Hole ' + (pick.holeIdx + 1) +
      (done ? ' · done ' + (done.toPar === 0 ? 'E' : (done.toPar > 0 ? '+' : '') + done.toPar) : '') + '</div></div>' +
      '<div style="text-align:right;">' +
      (streak > 0 ? '<div style="font:950 15px system-ui;color:#ffe27a;">🔥 ' + streak + '</div><div style="font:800 9px system-ui;color:rgba(255,255,255,.7);">day streak</div>' : '<div style="font:900 13px system-ui;color:#ffe27a;">Play ▶</div>') +
      '</div>';
    card.addEventListener('click', startDaily);
    card.addEventListener('mouseenter', function () { this.style.transform = 'translateY(-2px)'; });
    card.addEventListener('mouseleave', function () { this.style.transform = 'none'; });
    card.style.transition = 'transform .15s ease';
    shell.insertBefore(card, shell.children[1] || null);
  }

  if (typeof renderCourseMenuV045 === 'function') {
    var beforeRender = renderCourseMenuV045;
    renderCourseMenuV045 = function renderCourseMenuDaily() {
      beforeRender.apply(this, arguments);
      try { injectDailyButton(); } catch (e) {}
    };
  }

  window.dailyChallengeLoaded = true;
  window.Daily = { start: startDaily, today: pickToday, state: load };
})();
