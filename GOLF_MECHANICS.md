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

This mirrors mobile slingshot controls and avoids tiny buttons for swing timing.

## Golf bag for first prototype

| Club | Role | Max distance feel | Accuracy | Notes |
| --- | --- | --- | --- | --- |
| Driver | Tee/long shots | Very long | Low | Best from tee/fairway, bad from rough/sand |
| 3 Wood | Long fairway shots | Long | Medium-low | Safer than driver |
| 5 Iron | Controlled approach | Medium-long | Medium | Good general club |
| 7 Iron | Safer approach | Medium | Medium-high | Good from fairway/rough |
| Pitching Wedge | Short approach | Short | High | Good near green |
| Sand Wedge | Escape sand/short shots | Short | High | Best bunker club |
| Putter | Green only feel | Very short | Very high | Low-power, high-roll putting |

## Lie and surface rules

| Surface | Distance modifier | Accuracy modifier | Roll/friction | Gameplay purpose |
| --- | ---: | ---: | ---: | --- |
| Tee | 1.05x | normal | fairway-like | Strong first shot |
| Fairway | 1.00x | normal | medium roll | Ideal landing area |
| Rough | 0.72x | worse | slower | Punishes misses without stopping play |
| Sand | 0.48x | much worse | very slow | Needs sand wedge or careful play |
| Green | 0.35x for non-putters | accurate | high roll | Putting surface |
| Water/out of bounds | penalty | n/a | n/a | Adds risk/reward |

## Shot model for MVP

The prototype uses a simple 2D physics model:

- Club + drag power determines intended shot distance.
- Current lie modifies distance and accuracy.
- Club accuracy adds a small random angle error.
- Ball velocity is calculated from intended distance.
- The ball rolls with friction based on the surface it is currently on.
- If the ball enters water, it returns to the previous safe lie with a penalty stroke.
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
