# Top-Down Golf Prototype

A mobile-first browser golf prototype designed for GitHub Pages.

## Included systems
- Pull-back aiming
- Club selection
- Shot timing / strike bar
- Carry and roll by club and lie
- Natural bunker and water shapes
- Green zoom putting mode
- Pace-sensitive cup capture
- Green break with reusable slope data
- Reusable prop library for future holes
- Surface textures and subtle animated water

## File structure
- `index.html` — shell and UI
- `style.css` — app styling
- `shared.js` — utility functions
- `hole-data.js` — hole layout, slopes, props
- `props.js` — reusable course prop library
- `surface-rendering.js` — textures, water, surfaces, prop drawing
- `game.js` — game mechanics and rendering loop
- `COURSE_VISUAL_STYLE.md` — reusable art direction notes
- `IMPLEMENTATION_PLAN.md` — file-by-file implementation notes

## Reusable props
Repeated course props are defined in `props.js` and placed as instances in `hole-data.js`. This allows future holes to reuse the same signs, tee markers, trees, benches, shrubs, rocks, and optional features like bridges while keeping a consistent course identity.

## GitHub Pages setup
1. Push these files to the repository root.
2. Ensure `.nojekyll` is included.
3. In GitHub repository settings, enable **Pages** from the `main` branch root.

## Notes for future holes
Future holes should continue using:
- organic, natural surface outlines rather than perfect ellipses
- the shared prop library
- optional decorative features only where they suit the hole
- very subtle water animation only
