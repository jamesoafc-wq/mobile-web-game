# Top-Down Golf

A mobile-first top-down golf game for GitHub Pages.

## Current focus

The first build is a mechanics sandbox, not the final career mode. The goal is to get the feel of golf right before adding progression, customisation, tournaments, money, sponsors, or multiple courses.

## Prototype features

- One playable par-4 style hole.
- Pull-back mobile aiming and power control.
- Golf bag club selection:
  - Driver
  - 3 Wood
  - 5 Iron
  - 7 Iron
  - Pitching Wedge
  - Sand Wedge
  - Putter
- Different surfaces:
  - Tee
  - Fairway
  - Rough
  - Sand
  - Green
  - Water hazard
- Surface-based distance, accuracy, and roll/friction differences.
- Tee shots, approach shots, bunker recovery, and putting.
- Stroke counter and distance-to-pin display.

## Control scheme

Pull back from the ball, aim, then release. The farther you drag, the more power the shot has.

## Development plan

1. Tune club distances and shot feel.
2. Improve putting sensitivity.
3. Add more hole layouts.
4. Add wind after the base mechanics feel good.
5. Add career mode progression.
6. Add player customisation, club upgrades, cosmetics, and unlockable courses.

## GitHub Pages setup

This game uses static files only:

- `index.html`
- `style.css`
- `game.js`
- `.nojekyll`

To publish, go to **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.

## Design notes

See `GOLF_MECHANICS.md` for the shot model, club rules, surface penalties, and planned future mechanics.
