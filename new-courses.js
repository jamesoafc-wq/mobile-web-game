// ============================================================================
// new-courses.js  ·  5 new 18-hole courses (loads after course menu + theme sys)
// ----------------------------------------------------------------------------
// Adds five fully-populated courses, each 18 holes built with the existing
// transformHoleV035 / makePar3HoleV036 generators so they plug into the engine
// exactly like Willow. Every hole is tagged with its courseTheme so the visual
// system (course-visuals.js theme table) themes it.
//
//   desert   · Desert Canyon  (Earth)   red rock, mesas, dry washes, cacti
//   moor     · Highland Moor  (Earth)   heather, lochs, stone walls, mist
//   moon     · Sea of Serenity (Moon)   regolith, craters, low contrast, Earth in sky
//   mars     · Olympus Links  (Mars)    red dust, rocks, ice patches, rover
//   sky      · Floating Isles  (Sky)    islands in the void; off-island = lost ball
//
// Inventive par 5s where it fits (e.g. the Floating Isles dog-leg with a risky
// shortcut island). Course unlock levels are registered with the progression
// system. Theme rendering + course-specific objects live in course-visuals
// additions (themeExtras) — this file owns the DATA + hole layouts.
// ============================================================================

(function () {
  'use strict';
  if (typeof transformHoleV035 !== 'function' || typeof ROUND_BASE_HOLE_V035 === 'undefined') return;
  if (typeof COURSES_V045 === 'undefined') return;

  var BASE = ROUND_BASE_HOLE_V035;

  // Build one hole from a compact config, tagging the theme.
  function hole(theme, id, cfg) {
    cfg.id = id; cfg.par = cfg.par || 4;
    var h;
    if (cfg.par === 3 && cfg.p3) {
      h = makePar3HoleV036(id, !!cfg.mirror);
    } else {
      h = transformHoleV035(BASE, cfg);
    }
    h.courseTheme = theme;
    h.par = cfg.par;
    h.id = id;
    h.name = 'Hole ' + id;
    if (!h.cup.r) h.cup.r = 4.2;
    if (cfg.special) h.special = cfg.special;   // tag for special rendering/rules
    return h;
  }

  // A varied 18-hole set generator. `seeds` is an array of 18 per-hole configs;
  // we provide sensible defaults and let each course override for character.
  function buildCourse(theme, seeds) {
    var holes = [];
    for (var i = 0; i < 18; i++) {
      holes.push(hole(theme, i + 1, seeds[i] || {}));
    }
    return holes;
  }

  // ---- par templates: a balanced championship-ish spread (par 72) ----
  // index: 0..17. 4 par-3s, 4 par-5s, 10 par-4s = 72.
  // positions chosen to flow well across the round.
  function parSpread() {
    return [4,5,3,4,4,5,3,4,4, 4,5,3,4,4,5,3,4,4];
  }

  // generate per-hole configs with smooth variation (bends/tilts alternate)
  function seedsFor(theme, opts) {
    opts = opts || {};
    var pars = parSpread();
    var seeds = [];
    for (var i = 0; i < 18; i++) {
      var id = i + 1;
      var par = pars[i];
      var mirror = (i % 2 === 1);
      var amp = (par === 5 ? 40 : par === 3 ? 0 : 24) * (i % 4 < 2 ? 1 : -1) * (0.7 + (i % 3) * 0.18);
      var phase = (i * 0.7) % 6.28;
      var tilt = (par === 3 ? 0 : (i % 3 === 0 ? 22 : i % 3 === 1 ? -18 : 12)) * (mirror ? -1 : 1);
      var cfg = { par: par, mirror: mirror, amp: amp, phase: phase, tilt: tilt };
      if (par === 3) { cfg.p3 = true; cfg.mirror = (i % 3 === 0); }
      // gentle tee/cup variety
      if (par !== 3) {
        cfg.tee = { x: 210 + ((i % 5) - 2) * 14, y: 636 + (i % 3) * 8 };
        cfg.cupShift = { x: ((i % 5) - 2) * 8, y: ((i % 3) - 1) * 8 };
      }
      seeds.push(cfg);
    }
    // course-specific special holes layered on top
    if (opts.specials) opts.specials(seeds);
    return seeds;
  }

  // ----- HIGHLAND MOOR (recoloured): peat browns, sage/olive, grey lochs;
  //       heather only as small purple accents (handled in rendering) -----
  var moorSeeds = seedsFor('moor', { specials: function (s) {
    s[10].amp = 50; s[10].tilt = -34; s[10].special = 'loch-carry';   // par 5 over a loch
    s[2].special = 'wall-bunker';   // par 3 guarded by a stone wall
    s[7].special = 'stone-dogleg';  // dogleg around a drystone wall
  }});

  // ----- COASTAL CLIFFS: clifftop links, sea carries, lighthouses -----
  var cliffsSeeds = seedsFor('cliffs', { specials: function (s) {
    s[5].amp = 54; s[5].tilt = 38; s[5].special = 'sea-carry';     // par 5 along the cliff edge
    s[13].special = 'cape-carry';                                   // diagonal carry over a cove
    s[2].special = 'cliff-par3';                                    // par 3 over crashing surf
  }});

  // ----- AUTUMN WOODLAND: fall canopy, leaf litter, winding stream -----
  var autumnSeeds = seedsFor('autumn', { specials: function (s) {
    s[5].amp = 44; s[5].special = 'stream-weave';   // par 5 weaving along a stream
    s[10].amp = -40; s[10].special = 'grove-dogleg';
  }});

  // ----- EVERGLADES: water everywhere, marsh grass, boardwalks -----
  var gladesSeeds = seedsFor('glades', { specials: function (s) {
    s[5].special = 'marsh-islands';  // par 5 hopping between marsh islands
    s[13].amp = 46; s[13].special = 'water-spine';
    for (var i = 0; i < 18; i++) s[i].wet = true;   // lots of water everywhere
  }});

  // ----- MOON: low-grav feel, crater hazards, no water -----
  var moonSeeds = seedsFor('moon', { specials: function (s) {
    s[5].amp = 46; s[5].special = 'crater-field';      // par 5 weaving between craters
    s[14].amp = -50; s[14].special = 'rille';          // par 5 along a rille
  }});

  // ----- MARS: dust, rock fields, ice-patch hazards, rover near tee -----
  var marsSeeds = seedsFor('mars', { specials: function (s) {
    s[5].amp = 52; s[5].tilt = 30; s[5].special = 'dust-devil';
    s[13].special = 'ice-patch';
  }});

  // ----- FLOATING ISLES: void = water; inventive shapes + shortcut island -----
  var skySeeds = seedsFor('sky', { specials: function (s) {
    s[5].par = 5; s[5].amp = 0; s[5].tilt = 0; s[5].special = 'L-shortcut';
    s[5].tee = { x: 120, y: 650 }; s[5].cupShift = { x: 60, y: -10 };
    s[10].special = 'island-hop';   // par 5 across a chain of small islands
    s[1].special = 'narrow-isle';   // tight par 5
    for (var i = 0; i < 18; i++) s[i].voidWater = true;
  }});

  // ----- MAGNOLIA GRAND: immaculate championship parkland (the finale) -----
  var mastersSeeds = seedsFor('masters', { specials: function (s) {
    s[5].amp = 40; s[5].tilt = 26; s[5].special = 'azalea-carry';  // famous water-carry par 5
    s[10].special = 'fountain-pond';
    s[15].special = 'flowerbank';
  }});

  var NEW = [
    { id: 'moor', name: 'Highland Moor', subtitle: 'Misty heather & lochs', difficulty: 4,
      palette: ['#6e6a4e', '#8a9663', '#c2c79a'], icon: '🌫️',
      details: 'Peat, sage rough, drystone walls and cold grey lochs.', theme: 'moor',
      unlockLevel: 18, holes: buildCourse('moor', moorSeeds) },
    { id: 'cliffs', name: 'Coastal Cliffs', subtitle: 'Clifftop sea links', difficulty: 5,
      palette: ['#3a7d8c', '#6fb0c0', '#e8e2cf'], icon: '🌊',
      details: 'Wind-bent links on pale cliffs above a crashing blue sea.', theme: 'cliffs',
      unlockLevel: 22, holes: buildCourse('cliffs', cliffsSeeds) },
    { id: 'autumn', name: 'Amber Hollow', subtitle: 'Autumn woodland', difficulty: 4,
      palette: ['#b5652c', '#d98f3c', '#e8c46a'], icon: '🍂',
      details: 'Gold-and-crimson canopy, leaf litter and a winding stream.', theme: 'autumn',
      unlockLevel: 26, holes: buildCourse('autumn', autumnSeeds) },
    { id: 'glades', name: 'Cypress Glades', subtitle: 'Everglades wetlands', difficulty: 5,
      palette: ['#3f6b4a', '#6f9e63', '#bcae7a'], icon: '🐊',
      details: 'Marsh grass, cypress, boardwalks and water at every turn.', theme: 'glades',
      unlockLevel: 30, holes: buildCourse('glades', gladesSeeds) },
    { id: 'moon', name: 'Sea of Serenity', subtitle: 'Lunar regolith course', difficulty: 5,
      palette: ['#5a5f6b', '#9aa0ad', '#d6dae3'], icon: '🌙',
      details: 'Craters, rilles and low-gravity carries under a black sky.', theme: 'moon',
      unlockLevel: 35, holes: buildCourse('moon', moonSeeds) },
    { id: 'mars', name: 'Olympus Links', subtitle: 'Martian dust course', difficulty: 5,
      palette: ['#b34a2f', '#d97f54', '#f0b58a'], icon: '🔴',
      details: 'Rust dust, boulder fields, ice patches and dust devils.', theme: 'mars',
      unlockLevel: 40, holes: buildCourse('mars', marsSeeds) },
    { id: 'sky', name: 'Floating Isles', subtitle: 'Islands in the void', difficulty: 5,
      palette: ['#3b6ea5', '#7fb2e0', '#cfe8ff'], icon: '☁️',
      details: 'Sky islands over an endless void — miss the island, lose the ball.', theme: 'sky',
      unlockLevel: 45, holes: buildCourse('sky', skySeeds) },
    { id: 'masters', name: 'Magnolia Grand', subtitle: 'Immaculate championship', difficulty: 5,
      palette: ['#1f7a3f', '#3fae5e', '#e8b6d0'], icon: '🏆',
      details: 'Flawless emerald turf, azalea banks, white sand and fountains.', theme: 'masters',
      unlockLevel: 52, holes: buildCourse('masters', mastersSeeds) }
  ];

  // append to the course list (skip if already present, e.g. hot reload)
  NEW.forEach(function (c) {
    if (!COURSES_V045.some(function (x) { return x.id === c.id; })) {
      COURSES_V045.push({
        id: c.id, name: c.name, subtitle: c.subtitle, difficulty: c.difficulty,
        status: 'PLAYABLE', palette: c.palette, icon: c.icon, details: c.details,
        holes: c.holes
      });
    }
  });

  // register unlock levels with the progression system if present
  if (window.Progress && Progress._registerCourseUnlock) {
    NEW.forEach(function (c) { Progress._registerCourseUnlock(c.id, c.unlockLevel); });
  }
  // expose the intended unlock levels so progression can read them either way
  window.NEW_COURSE_UNLOCKS = (function () {
    var m = {}; NEW.forEach(function (c) { m[c.id] = c.unlockLevel; }); return m;
  })();

  window.newCoursesLoaded = true;
})();
