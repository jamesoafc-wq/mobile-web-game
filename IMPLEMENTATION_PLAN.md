# Implementation Plan

## Files
- `shared.js`: geometry, math, and drawing helpers.
- `hole-data.js`: hole layout, surface shapes, slope zones, and prop placement.
- `props.js`: reusable prop library and drawing functions.
- `surface-rendering.js`: surface textures, organic shape rendering, water animation, and prop rendering.
- `game.js`: shot mechanics, timing bar, ball physics, hazards, putting slopes, and UI.
- `COURSE_VISUAL_STYLE.md`: reusable visual style reference for this and future holes.

## Design decisions
- Props are reusable definitions, placed by instance on a per-hole basis.
- Surface shapes use point-defined organic outlines rather than pure ellipses.
- Water uses a subtle animated shimmer.
- Visual detail is concentrated near edges, hazards, and landmarks so the line of play stays readable.
