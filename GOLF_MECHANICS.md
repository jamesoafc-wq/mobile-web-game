# Top-Down Golf Mechanics Plan

Project direction: a mobile-friendly top-down golf game with full-course holes, club selection, lies/surfaces, tee shots, approach shots, and putting. Career mode, customisation, wind, tournaments, and progression can come later; the first priority is getting the shot feel right.

## Prototype goal

Build one playable hole that proves the core mechanics:

- Aim by dragging on the touchscreen.
- Choose a club from a simple golf bag.
- Hit from tee, fairway, rough, sand, and green.
- Apply different lie penalties and surface friction.
- Switch naturally between full shots and putting.
- Track strokes, par, distance to pin, and current lie.
- Reset after holing out.

## Mobile control model

Use a pull-back control:

1. Touch and hold on the course.
2. Drag away from the target direction.
3. The farther the drag, the higher the power.
4. Release to hit the shot.

The tee and starting ball position have been moved higher up the screen, and max pull distance has been shortened so a full-power tee shot should not require dragging into the bottom club menu.

## Carry vs roll

The dotted aim line now shows the expected **carry** point for normal clubs, not the final total distance. The ball may get extra roll after landing depending on the landing surface.

For the putter, the dotted line shows expected **roll** instead of carry.

## Club and lie carry matrix

Approximate max carry/roll by club and surface:

| Club | Tee | Fairway | Rough | Sand | Green |
| --- | ---: | ---: | ---: | ---: | ---: |
| Driver | 300 yd | 235 yd | 75 yd | 0 yd | 35 yd |
| 3 Wood | 255 yd | 225 yd | 95 yd | 0 yd | 30 yd |
| 5 Iron | 190 yd | 180 yd | 130 yd | 35 yd | 22 yd |
| 7 Iron | 160 yd | 150 yd | 115 yd | 45 yd | 18 yd |
| Pitching Wedge | 110 yd | 105 yd | 85 yd | 55 yd | 14 yd |
| Sand Wedge | 85 yd | 80 yd | 65 yd | 70 yd | 12 yd |
| Putter | 30 yd | 25 yd | 10 yd | 0 yd | 55 yd |

This should make club choice much clearer. For example, Driver is excellent from the tee, weaker from rough, and unusable from sand.

## Lie and surface rules

| Surface | Carry behaviour | Accuracy | Roll/friction | Gameplay purpose |
| --- | --- | --- | --- | --- |
| Tee | Full club potential | normal | modest roll | Strong first shot |
| Fairway | Strong carry | normal | good roll | Ideal landing area |
| Rough | Reduced carry | worse | little roll | Punishes misses without stopping play |
| Sand | Only wedges work well | much worse | almost no roll | Forces recovery shots |
| Green | Best for putting | accurate | high roll | Putting surface |
| Water/out of bounds | penalty | n/a | n/a | Adds risk/reward |

## Shot model for MVP

The prototype uses a simple 2D model:

- Club + current lie chooses a maximum carry/roll distance from the matrix.
- Drag power scales that maximum.
- Club accuracy adds a small random angle error.
- Normal clubs fly to the shown carry point.
- After landing, surface and club type calculate a small amount of extra roll.
- Putter shots roll immediately rather than flying.
- If the ball lands or rolls into water, it returns to the previous safe lie with a penalty stroke.
- If the ball is slow and within the cup radius, it holes out.

This is not full golf physics yet, but it is good enough to tune fun and control feel.

## Later mechanics

- Wind strength and direction.
- Elevation and slopes.
- Spin/backspin.
- Shot types: punch, flop, chip, draw/fade.
- Multiple holes and scorecards.
- Career mode with tours, sponsors, customisation, and club upgrades.
- Course editor/custom holes.

## Current implementation decision

Start with a single par-4 mechanics sandbox. Do not add career mode until aiming, shot distance, club choice, and surface penalties feel good.
