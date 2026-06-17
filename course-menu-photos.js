// ============================================================================
// course-menu-photos.js  ·  photo course tiles (loads after the menu chain)
// ----------------------------------------------------------------------------
// Replaces the course-select cards with photo tiles: each course shows its own
// generated image as the tile background, with the name/subtitle/difficulty and
// best score overlaid on a readable gradient scrim. Drops the SVG/Classic/Hybrid
// preview toggle (always photos).
//
// Images live in the repo ROOT (next to index.html):
//   course-willow.png, course-coral.png, course-dunes.png,
//   course-pine.png, course-silver.png
// They load natively as CSS background-images (no draw-loop timing concerns).
// If an image is missing or hasn't loaded, the tile falls back to the course's
// palette gradient, so the menu always works.
//
// Overrides renderCourseMenuV045 (the function the whole menu chain funnels
// through) so this is the single source of truth for the menu layout.
// ============================================================================

(function () {
  'use strict';
  if (typeof renderCourseMenuV045 !== 'function' || typeof COURSES_V045 === 'undefined') return;

  var lockerTab = 'balls';   // active locker tab: 'balls' | 'tracers'

  function imgPath(id) { return 'course-' + id + '.png'; }

  // helpers reused from the existing menu if present, with safe fallbacks
  function dots(n) {
    if (typeof difficultyDotsV045 === 'function') return difficultyDotsV045(n);
    var s = ''; for (var i = 0; i < 5; i++) s += (i < n ? '●' : '○'); return s;
  }
  function bestLabel(course) {
    try { if (typeof bestScoreLabelV045 === 'function') return bestScoreLabelV045(course); } catch (e) {}
    return 'Best: —';
  }
  function isPlayable(course) {
    if (!(course.holes && course.holes.length)) return false;
    // gate by progression level if the system is present
    if (window.Progress && typeof Progress.courseUnlocked === 'function') {
      return Progress.courseUnlocked(course.id);
    }
    return true;
  }

  function renderPhotoMenu() {
    courseMenuV045.innerHTML = '';

    // Ensure the menu container can SCROLL — the taller photo tiles can exceed
    // the viewport, and the container's default 'place-items:center' clips
    // overflow with no way to reach it. Switch to a scrollable, top-aligned box.
    courseMenuV045.style.display = 'block';
    courseMenuV045.style.placeItems = '';
    courseMenuV045.style.overflowY = 'auto';
    courseMenuV045.style.overflowX = 'hidden';
    courseMenuV045.style.webkitOverflowScrolling = 'touch';   // momentum scroll on iOS

    var shell = document.createElement('div');
    shell.style.maxWidth = '460px';
    shell.style.margin = '0 auto';
    shell.style.padding = '18px 16px 40px';
    shell.style.minHeight = 'min-content';

    var title = document.createElement('div');
    title.innerHTML =
      '<div style="font:950 22px system-ui;color:#eef8d8;">Choose your course</div>' +
      '<div style="font:750 12px system-ui;color:rgba(232,246,222,.72);margin-top:4px;">Five courses, eighteen holes each.</div>';
    title.style.marginBottom = '14px';
    shell.appendChild(title);

    // ---- progression header: level ring + XP bar + coins ----
    if (window.Progress) {
      var li = Progress.level();
      var hdr = document.createElement('div');
      hdr.style.display = 'flex';
      hdr.style.alignItems = 'center';
      hdr.style.gap = '12px';
      hdr.style.padding = '12px 14px';
      hdr.style.marginBottom = '16px';
      hdr.style.borderRadius = '16px';
      hdr.style.background = 'linear-gradient(135deg, rgba(60,110,64,.55), rgba(20,40,22,.55))';
      hdr.style.border = '1px solid rgba(238,248,216,.16)';
      hdr.style.backdropFilter = 'blur(4px)';

      // level badge
      var badge = document.createElement('div');
      badge.style.flex = '0 0 auto';
      badge.style.width = '46px';
      badge.style.height = '46px';
      badge.style.borderRadius = '50%';
      badge.style.display = 'flex';
      badge.style.flexDirection = 'column';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.background = 'radial-gradient(circle at 40% 35%, #ffe27a, #d39a2e)';
      badge.style.color = '#3a2a00';
      badge.style.boxShadow = '0 4px 12px rgba(0,0,0,.3)';
      badge.innerHTML = '<div style="font:950 8px system-ui;letter-spacing:.5px;opacity:.8;">LVL</div>' +
                        '<div style="font:950 18px system-ui;line-height:1;">' + li.level + '</div>';
      hdr.appendChild(badge);

      // xp bar + coins column
      var col = document.createElement('div');
      col.style.flex = '1 1 auto';
      col.style.minWidth = '0';
      var xpRow = document.createElement('div');
      xpRow.style.display = 'flex';
      xpRow.style.justifyContent = 'space-between';
      xpRow.style.alignItems = 'baseline';
      xpRow.innerHTML =
        '<span style="font:850 11px system-ui;color:#eef8d8;">Level ' + li.level + '</span>' +
        '<span style="font:750 10px system-ui;color:rgba(232,246,222,.7);">' + li.into + ' / ' + li.span + ' XP</span>';
      col.appendChild(xpRow);

      var track = document.createElement('div');
      track.style.height = '8px';
      track.style.borderRadius = '6px';
      track.style.background = 'rgba(0,0,0,.35)';
      track.style.overflow = 'hidden';
      track.style.margin = '5px 0 7px';
      var fill = document.createElement('div');
      fill.style.height = '100%';
      fill.style.width = Math.round(li.pct * 100) + '%';
      fill.style.borderRadius = '6px';
      fill.style.background = 'linear-gradient(90deg,#9be870,#ffe27a)';
      fill.style.transition = 'width .5s ease';
      track.appendChild(fill);
      col.appendChild(track);

      var coinRow = document.createElement('div');
      coinRow.innerHTML = '<span style="font:900 12px system-ui;color:#ffe27a;">◉ ' +
                          Progress.coins() + '</span>' +
                          '<span style="font:750 10px system-ui;color:rgba(232,246,222,.6);"> coins</span>';
      col.appendChild(coinRow);

      hdr.appendChild(col);
      shell.appendChild(hdr);
    }

    var grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr';
    grid.style.gap = '14px';

    COURSES_V045.forEach(function (course) {
      var playable = isPlayable(course);

      var card = document.createElement('button');
      card.type = 'button';
      card.disabled = !playable;
      card.style.width = '100%';
      card.style.position = 'relative';
      card.style.border = '1px solid rgba(238,248,216,.16)';
      card.style.borderRadius = '18px';
      card.style.padding = '0';
      card.style.overflow = 'hidden';
      card.style.cursor = playable ? 'pointer' : 'default';
      card.style.color = '#fff';
      card.style.textAlign = 'left';
      card.style.opacity = playable ? '1' : '.72';
      card.style.boxShadow = playable ? '0 14px 34px rgba(0,0,0,.24)' : 'none';
      card.style.minHeight = '150px';
      card.style.display = 'block';

      // palette-gradient fallback always set first (shows if image missing)
      var fallback = 'linear-gradient(120deg, ' + course.palette[0] + ', ' +
                     course.palette[1] + ' 58%, ' + course.palette[2] + ')';
      card.style.background = fallback;

      // layer the photo over the fallback; if it 404s the fallback remains
      var photo = document.createElement('div');
      photo.style.position = 'absolute';
      photo.style.inset = '0';
      photo.style.backgroundSize = 'cover';
      photo.style.backgroundPosition = 'center';
      photo.style.backgroundRepeat = 'no-repeat';
      photo.style.transition = 'opacity .35s ease';
      photo.style.opacity = '0';
      // preload to know if it exists, then reveal
      var im = new Image();
      im.onload = function () {
        photo.style.backgroundImage = 'url("' + imgPath(course.id) + '")';
        photo.style.opacity = '1';
      };
      im.onerror = function () { /* keep palette fallback */ };
      im.src = imgPath(course.id);
      card.appendChild(photo);

      // readability scrim at the bottom — locked tiles get a heavy dark veil
      var scrim = document.createElement('div');
      scrim.style.position = 'absolute';
      scrim.style.inset = '0';
      scrim.style.background = playable
        ? 'linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,.55) 100%)'
        : 'linear-gradient(180deg, rgba(3,8,4,.78) 0%, rgba(3,8,4,.7) 50%, rgba(3,8,4,.82) 100%)';
      card.appendChild(scrim);
      if (!playable) {
        // extra blur-like darken so it's hard to make out the course underneath
        var veil = document.createElement('div');
        veil.style.position = 'absolute';
        veil.style.inset = '0';
        veil.style.background = 'rgba(2,6,3,0.45)';
        veil.style.backdropFilter = 'grayscale(0.6) brightness(0.5)';
        card.appendChild(veil);
      }

      // status / lock badge (top-right)
      if (!playable) {
        var badge = document.createElement('div');
        var needLvl = (window.Progress && course.holes && course.holes.length)
          ? Progress.courseUnlockLevel(course.id) : null;
        badge.textContent = needLvl ? ('🔒 Level ' + needLvl) : (course.status || 'COMING SOON');
        badge.style.position = 'absolute';
        badge.style.top = '10px';
        badge.style.right = '10px';
        badge.style.font = '900 10px system-ui';
        badge.style.letterSpacing = '.5px';
        badge.style.color = '#fff';
        badge.style.background = 'rgba(0,0,0,.55)';
        badge.style.padding = '5px 9px';
        badge.style.borderRadius = '999px';
        card.appendChild(badge);
      }

      // text content (bottom, over the scrim)
      var info = document.createElement('div');
      info.style.position = 'absolute';
      info.style.left = '0';
      info.style.right = '0';
      info.style.bottom = '0';
      info.style.padding = '12px 14px 13px';
      info.innerHTML =
        '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">' +
          '<div style="min-width:0;">' +
            '<div style="font:950 18px system-ui;text-shadow:0 2px 8px rgba(0,0,0,.55);">' +
              (course.icon || '') + ' ' + course.name + '</div>' +
            '<div style="font:800 11px system-ui;color:rgba(255,255,255,.86);text-shadow:0 1px 4px rgba(0,0,0,.5);margin-top:2px;">' +
              course.subtitle + '</div>' +
          '</div>' +
          '<div style="text-align:right;white-space:nowrap;">' +
            '<div style="font:850 11px system-ui;color:rgba(255,255,255,.9);text-shadow:0 1px 4px rgba(0,0,0,.5);">' +
              dots(course.difficulty) + '</div>' +
            '<div style="font:900 11px system-ui;color:' + (playable ? '#e6ffc4' : 'rgba(255,255,255,.7)') +
              ';text-shadow:0 1px 4px rgba(0,0,0,.5);margin-top:3px;">' +
              (playable ? bestLabel(course) : 'Locked') + '</div>' +
          '</div>' +
        '</div>';
      card.appendChild(info);

      if (playable) card.addEventListener('click', function () { applyCourseV045(course); });
      grid.appendChild(card);
    });

    shell.appendChild(grid);

    // ---- customisation locker: Balls / Tracers tabs ----
    if (window.Progress) {
      var custTitle = document.createElement('div');
      custTitle.innerHTML =
        '<div style="font:950 16px system-ui;color:#eef8d8;">Locker</div>' +
        '<div style="font:750 11px system-ui;color:rgba(232,246,222,.7);margin-top:3px;">Earn coins playing rounds — unlock & equip.</div>';
      custTitle.style.margin = '24px 0 10px';
      shell.appendChild(custTitle);

      // tab bar
      var tabs = document.createElement('div');
      tabs.style.display = 'flex';
      tabs.style.gap = '8px';
      tabs.style.marginBottom = '12px';
      [['balls', 'Balls'], ['tracers', 'Tracers']].forEach(function (t) {
        var tb = document.createElement('button');
        tb.type = 'button';
        tb.textContent = t[1];
        var active = lockerTab === t[0];
        tb.style.flex = '1';
        tb.style.padding = '8px';
        tb.style.borderRadius = '10px';
        tb.style.font = '850 12px system-ui';
        tb.style.cursor = 'pointer';
        tb.style.border = active ? '1px solid #ffe27a' : '1px solid rgba(238,248,216,.16)';
        tb.style.background = active ? 'rgba(255,226,122,.16)' : 'rgba(255,255,255,.05)';
        tb.style.color = active ? '#ffe27a' : '#eef8d8';
        tb.addEventListener('click', function () { lockerTab = t[0]; renderPhotoMenu(); });
        tabs.appendChild(tb);
      });
      shell.appendChild(tabs);

      var grid2 = document.createElement('div');
      grid2.style.display = 'grid';
      grid2.style.gridTemplateColumns = 'repeat(4, 1fr)';
      grid2.style.gap = '10px';

      var isTracer = (lockerTab === 'tracers');
      var items = isTracer ? Progress.tracers() : Progress.balls();

      items.forEach(function (it) {
        var owned = isTracer ? Progress.ownsTracer(it.id) : Progress.owns(it.id);
        var equipped = isTracer ? (Progress.equippedTracer() === it.id) : (Progress.equipped() === it.id);
        var lvlOk = Progress.level().level >= it.level;
        var afford = Progress.coins() >= it.cost;

        var cell = document.createElement('button');
        cell.type = 'button';
        cell.style.position = 'relative';
        cell.style.border = equipped ? '2px solid #ffe27a' : '1px solid rgba(238,248,216,.18)';
        cell.style.borderRadius = '14px';
        cell.style.padding = '10px 6px 8px';
        cell.style.background = equipped ? 'rgba(255,226,122,.12)' : 'rgba(255,255,255,.05)';
        cell.style.cursor = 'pointer';
        cell.style.display = 'flex';
        cell.style.flexDirection = 'column';
        cell.style.alignItems = 'center';
        cell.style.gap = '5px';

        // swatch: ball = sphere; tracer = a streak
        var sw = document.createElement('div');
        sw.style.width = '30px'; sw.style.height = '30px';
        if (isTracer) {
          sw.style.borderRadius = '4px';
          sw.style.background = 'linear-gradient(90deg, rgba(0,0,0,0), ' + it.color + ')';
          sw.style.boxShadow = '0 0 8px ' + it.color;
        } else {
          sw.style.borderRadius = '50%';
          sw.style.background = 'radial-gradient(circle at 38% 32%, ' + it.color + ', ' + it.accent + ')';
          sw.style.boxShadow = 'inset 0 -2px 4px rgba(0,0,0,.25), 0 2px 5px rgba(0,0,0,.3)';
        }
        if (!owned) sw.style.filter = 'grayscale(0.7) brightness(0.7)';
        cell.appendChild(sw);

        var nm = document.createElement('div');
        nm.textContent = it.name;
        nm.style.font = '800 8.5px system-ui';
        nm.style.color = '#eef8d8';
        nm.style.textAlign = 'center';
        nm.style.lineHeight = '1.1';
        cell.appendChild(nm);

        var statusEl = document.createElement('div');
        statusEl.style.font = '850 9px system-ui';
        if (equipped) { statusEl.textContent = 'EQUIPPED'; statusEl.style.color = '#ffe27a'; }
        else if (owned) { statusEl.textContent = 'Equip'; statusEl.style.color = '#9be870'; }
        else if (!lvlOk) { statusEl.textContent = 'Lvl ' + it.level; statusEl.style.color = 'rgba(255,255,255,.55)'; }
        else { statusEl.innerHTML = '◉ ' + it.cost; statusEl.style.color = afford ? '#ffe27a' : 'rgba(255,180,180,.8)'; }
        cell.appendChild(statusEl);

        cell.addEventListener('click', function () {
          if (isTracer) {
            if (Progress.ownsTracer(it.id)) Progress.equipTracer(it.id);
            else if (Progress.buyTracer(it.id)) Progress.equipTracer(it.id);
            else return;
          } else {
            if (Progress.owns(it.id)) Progress.equip(it.id);
            else if (Progress.buyBall(it.id)) Progress.equip(it.id);
            else return;
          }
          renderPhotoMenu();
        });

        grid2.appendChild(cell);
      });

      shell.appendChild(grid2);
    }
    courseMenuV045.appendChild(shell);
  }

  // Become the single menu renderer for the whole chain.
  renderCourseMenuV045 = renderPhotoMenu;
  // Render now in case the menu is already on screen.
  try { renderPhotoMenu(); } catch (e) {}

  window.coursePhotoMenuLoaded = true;
})();
