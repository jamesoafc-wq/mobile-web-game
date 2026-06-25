// ============================================================================
// achievements.js  ·  collectible badges/milestones
// ----------------------------------------------------------------------------
// Tracks achievements in localStorage and exposes a small API. Other systems
// call Achievements.check(event, data) on key moments (hole-out, etc.). A panel
// renders into the menu. Fully additive.
// ============================================================================

(function () {
  'use strict';
  var LS = 'golfAchv_v1';
  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {} }
  var unlocked = load();

  // catalogue: id -> { name, desc, icon, secret? }
  var CATALOG = [
    { id: 'first_round', name: 'Teed Off', desc: 'Finish your first hole', icon: '⛳' },
    { id: 'first_birdie', name: 'Birdie!', desc: 'Score your first birdie', icon: '🐦' },
    { id: 'first_eagle', name: 'Eagle Eye', desc: 'Score an eagle', icon: '🦅' },
    { id: 'hole_in_one', name: 'Ace', desc: 'Score a hole-in-one', icon: '🎯' },
    { id: 'par3_birdie_set', name: 'Short Game', desc: 'Birdie a par 3', icon: '🏌️' },
    { id: 'under_par_round', name: 'Red Numbers', desc: 'Finish a course under par', icon: '🔴' },
    { id: 'sand_save', name: 'Sand Save', desc: 'Hole out from a bunker', icon: '🏖️' },
    { id: 'long_putt', name: 'Snake Killer', desc: 'Sink a putt from long range', icon: '🐍' },
    { id: 'five_courses', name: 'Globetrotter', desc: 'Play 5 different courses', icon: '🌍' },
    { id: 'all_stars_course', name: 'Flawless', desc: 'Earn all 54 stars on a course', icon: '⭐' },
    { id: 'level_10', name: 'Rising Star', desc: 'Reach level 10', icon: '📈' },
    { id: 'daily_streak_7', name: 'Dedicated', desc: '7-day daily streak', icon: '🔥' },
    { id: 'wind_master', name: 'Wind Whisperer', desc: 'Birdie in strong wind (12+ mph)', icon: '💨' },
    { id: 'tournament_win', name: 'Champion', desc: 'Win a tournament', icon: '🏆' },
    { id: 'career_tour2', name: 'Climbing', desc: 'Reach the second tour in Career', icon: '🪜' }
  ];
  var BY_ID = {}; CATALOG.forEach(function (a) { BY_ID[a.id] = a; });

  var pendingToast = [];
  function grant(id) {
    if (unlocked[id] || !BY_ID[id]) return false;
    unlocked[id] = { at: Date.now() };
    save(unlocked);
    pendingToast.push(BY_ID[id]);
    showToast(BY_ID[id]);
    return true;
  }

  // lightweight toast popup
  function showToast(a) {
    try {
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%) translateY(-12px);' +
        'z-index:100000;background:linear-gradient(135deg,#2a7d46,#155a30);color:#fff;border:1px solid rgba(255,226,122,.5);' +
        'border-radius:14px;padding:10px 16px;box-shadow:0 8px 24px rgba(0,0,0,.4);opacity:0;transition:all .35s ease;' +
        'font:800 13px system-ui;display:flex;align-items:center;gap:10px;';
      el.innerHTML = '<span style="font-size:22px;">' + a.icon + '</span><span><span style="color:#ffe27a;font-weight:950;">Achievement!</span><br>' + a.name + '</span>';
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
      setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-12px)'; setTimeout(function () { el.remove(); }, 400); }, 2600);
    } catch (e) {}
  }

  // event checker — called from gameplay hooks
  function check(event, data) {
    data = data || {};
    if (event === 'holeOut') {
      grant('first_round');
      var toPar = data.toPar;
      if (toPar <= -1) grant('first_birdie');
      if (toPar <= -2) grant('first_eagle');
      if (data.strokes === 1) grant('hole_in_one');
      if (data.par === 3 && toPar <= -1) grant('par3_birdie_set');
      if (data.fromSand) grant('sand_save');
      if (data.puttDist && data.puttDist > 120) grant('long_putt');
      if (data.windMph >= 12 && toPar <= -1) grant('wind_master');
    } else if (event === 'roundEnd') {
      if (data.toPar < 0) grant('under_par_round');
    } else if (event === 'courseAllStars') {
      grant('all_stars_course');
    } else if (event === 'level') {
      if (data.level >= 10) grant('level_10');
    } else if (event === 'dailyStreak') {
      if (data.streak >= 7) grant('daily_streak_7');
    } else if (event === 'coursesPlayed') {
      if (data.count >= 5) grant('five_courses');
    } else if (event === 'tournamentWin') {
      grant('tournament_win');
    } else if (event === 'careerTour') {
      if (data.tour >= 2) grant('career_tour2');
    }
  }

  function count() { var n = 0; for (var k in unlocked) if (unlocked.hasOwnProperty(k)) n++; return n; }

  // panel for the menu
  function buildPanel() {
    var wrap = document.createElement('div');
    wrap.dataset.achvPanel = 'true';
    wrap.style.cssText = 'margin:0 0 14px;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(238,248,216,.16);';
    wrap.innerHTML = '<div style="font:950 15px system-ui;color:#eef8d8;display:flex;justify-content:space-between;">' +
      '<span>Achievements</span><span style="color:#ffe27a;">' + count() + ' / ' + CATALOG.length + '</span></div>';
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px;';
    CATALOG.forEach(function (a) {
      var got = !!unlocked[a.id];
      var cell = document.createElement('div');
      cell.title = a.name + ' — ' + a.desc;
      cell.style.cssText = 'aspect-ratio:1;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;' +
        'background:' + (got ? 'linear-gradient(135deg,#2a7d46,#155a30)' : 'rgba(255,255,255,.04)') + ';' +
        'border:1px solid ' + (got ? 'rgba(255,226,122,.5)' : 'rgba(255,255,255,.08)') + ';' +
        'filter:' + (got ? 'none' : 'grayscale(1) opacity(.4)') + ';';
      cell.textContent = a.icon;
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  window.Achievements = { check: check, grant: grant, buildPanel: buildPanel, count: count, catalog: CATALOG, unlocked: function () { return unlocked; } };
  window.achievementsLoaded = true;
})();
