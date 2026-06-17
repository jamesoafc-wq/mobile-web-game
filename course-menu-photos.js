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
    return !!(course.holes && course.holes.length);
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

      // readability scrim at the bottom
      var scrim = document.createElement('div');
      scrim.style.position = 'absolute';
      scrim.style.inset = '0';
      scrim.style.background =
        'linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,.55) 100%)';
      card.appendChild(scrim);

      // status / lock badge (top-right)
      if (!playable) {
        var badge = document.createElement('div');
        badge.textContent = course.status || 'COMING SOON';
        badge.style.position = 'absolute';
        badge.style.top = '10px';
        badge.style.right = '10px';
        badge.style.font = '900 10px system-ui';
        badge.style.letterSpacing = '.5px';
        badge.style.color = '#fff';
        badge.style.background = 'rgba(0,0,0,.45)';
        badge.style.padding = '4px 8px';
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
    courseMenuV045.appendChild(shell);
  }

  // Become the single menu renderer for the whole chain.
  renderCourseMenuV045 = renderPhotoMenu;
  // Render now in case the menu is already on screen.
  try { renderPhotoMenu(); } catch (e) {}

  window.coursePhotoMenuLoaded = true;
})();
