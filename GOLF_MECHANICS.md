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

## Future shot skill element

The current version is still pure aim/power. Eagle is still too easy with two strong driver shots, but we should not over-nerf distances until a skill mechanic exists.

Planned skill mechanic:

- Player aims and sets power first.
- A moving strike/accuracy bar appears.
- Hitting the green zone gives full accuracy and clean contact.
- Missing slightly adds directional error, reduced carry, or worse bounce.
- Missing badly can cause hooks, slices, thin shots, heavy shots, or bad lies being much harder to escape.

This will let risky shots, driver-off-deck shots, long rough shots, and green-attacking approaches feel appropriately harder without making the basic controls frustrating.

## Readability while dragging

Yardage feedback is now shown in a fixed HUD at the bottom of the canvas instead of being attached to the thumb/drag point. This should make carry/roll distance readable while aiming on mobile.

## Par 4 scale balance

The prototype now uses a larger yardage scale: `0.92 yards per pixel`. That makes the first hole play closer to a real par 4. The tee-to-pin distance is roughly 450+ yards, so the driver should leave an approach shot instead of reaching the green from the tee.

## Putting zoom

When the ball is on the green and the putter is selected, the canvas camera zooms in on the green. The underlying course coordinates do not change; only the view changes. This is intended to make short putts easier to judge on mobile.

## Ball flight animation

Carried shots now visually rise, land, bounce, then roll:

- Driver and woods have a lower flight arc and stronger bounce/roll.
- Irons have a medium arc.
- Wedges have a high arc, so the ball grows more during flight and lands softer.
- Putts do not change height; they stay flat and roll immediately.

This is visual only for now. It improves feel without changing the main carry matrix.

## Carry vs roll

The dotted aim line now shows the expected **carry** point for normal clubs, not the final total distance. The ball may get extra roll after landing depending on the landing surface.

For the putter, the dotted line shows expected **roll** instead of carry.

## Club and lie carry matrix

Approximate max carry/roll by club and surface:

| Club | Tee | Fairway | Rough | Sand | Green |
| --- | ---: | ---: | ---: | ---: | ---: |
| Driver | 285 yd | 225 yd | 70 yd | 0 yd | 25 yd |
| 3 Wood | 245 yd | 215 yd | 90 yd | 0 yd | 22 yd |
| 5 Iron | 185 yd | 175 yd | 125 yd | 35 yd | 18 yd |
| 7 Iron | 155 yd | 145 yd | 110 yd | 45 yd | 16 yd |
| Pitching Wedge | 108 yd | 102 yd | 82 yd | 55 yd | 12 yd |
| Sand Wedge | 84 yd | 78 yd | 62 yd | 70 yd | 10 yd |
| Putter | 24 yd | 22 yd | 8 yd | 0 yd | 45 yd |

This should make club choice much clearer. For example, Driver is excellent from the tee, weaker from rough, and unusable from sand.

## Lie and surface rules

| Surface | Carry behaviour | Accuracy | Roll/friction | Gameplay purpose |
| --- | --- | --- | --- | --- |
| Tee | Strong driver carry, but not green-reaching on a par 4 | normal | modest roll | Strong first shot |
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
- During flight, the ball visually scales up and back down to suggest height.
- After landing, carried shots do a short bounce animation.
- After bouncing, surface and club type calculate a small amount of extra roll.
- Putter shots roll immediately rather than flying or bouncing.
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
