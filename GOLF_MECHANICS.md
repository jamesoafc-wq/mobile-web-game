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
4. Release to lock in aim and power.
5. Tap the moving strike bar when the marker is inside the green sweet spot.

The tee and starting ball position have been moved higher up the screen, and max pull distance has been shortened so a full-power tee shot should not require dragging into the bottom club menu.

## Shot skill element

A shot timing bar now appears after aim/power is lined up. The player must tap when the moving marker is in the green sweet spot.

The bar has three contact zones:

- Green = sweet spot / perfect strike.
- Yellow = middle contact / playable but not perfect.
- Red = bad contact / reduced carry and bigger miss.

The sweet spot changes per club, surface, and shot power:

- Driver is harder than irons, even from the tee.
- Woods are also difficult, especially from fairway/rough.
- Driver and 3 Wood are now extremely punishing off the deck, so they are mainly tee-shot clubs.
- Mid irons are easier from tee and fairway.
- Wedges are easier from fairway/rough but harder from bunkers.
- Sand adds a large difficulty penalty, so bunker recovery is not easy.
- Rough also adds a meaningful difficulty penalty.
- Higher power makes the timing slightly harder.

Good timing gives clean carry and lower directional miss. Missing the sweet spot reduces carry and increases offline error. Bad misses can hook or slice depending on which side of the bar is missed. Big hook/slice misses now visually curve through the air instead of only changing the launch angle.

A short strike feedback badge appears after the tap so the player can see whether the shot was a sweet strike, middle contact, or a bad miss.

Future customisation can improve this system by giving better clubs wider sweet spots, slower timing bars, or smaller miss penalties.

## Readability while dragging

Yardage feedback is now shown in a fixed HUD at the bottom of the canvas instead of being attached to the thumb/drag point. This should make carry/roll distance readable while aiming on mobile.

## Par 4 scale balance

The prototype now uses a larger yardage scale: `0.92 yards per pixel`. That makes the first hole play closer to a real par 4. The tee-to-pin distance is roughly 450+ yards, so the driver should leave an approach shot instead of reaching the green from the tee.

## Putting zoom

When the ball is on the green and the putter is selected, the canvas camera zooms in on the green. The underlying course coordinates do not change; only the view changes. This is intended to make short putts easier to judge on mobile.

## Putting slopes and reads

Putting now has a first-pass slope system:

- The green contains invisible slope zones.
- The same slope zones drive both the moving read marks and the ball movement, so the read should match the physics.
- The slope data is deliberately course-driven: future holes can supply different `greenSlopeZones` for different green shapes.
- The renderer samples across the whole green shape instead of only around the cup.
- The previous funnel-like effect has been reduced by lowering slope strength and avoiding zones that point directly into the hole.
- The old chunky arrowheads have been replaced by subtler moving dash marks with a small leading dot.
- The read marks now use a conveyor-style fade: they appear at the back, drift forward, fade out at the end, and reset only while invisible.
- The putt is nudged gently downhill each frame while it rolls on the green.
- Slow putts take more break than firm putts, but slopes should influence the line rather than drag the ball into the cup.
- Very slow rolling putts now settle instead of being kept alive forever by tiny slope nudges.

This is intentionally simpler than a full height map, but it gives the core putting challenge: choosing both line and pace.

## Cup difficulty

The cup is now less forgiving before putting zoom and when putts are too fast:

- The cup is visually smaller during putting zoom.
- Approach shots, chips, and rolling shots before the putter/green zoom phase have a much smaller effective capture area.
- Holing out from range can still happen, but it should be rare and require a very accurate slow ball.
- Once the ball is on the green with the putter selected, cup forgiveness depends on pace.
- Slow putts get a smaller capture area than before.
- Medium-speed putts get a tight capture area.
- Fast putts have to be almost perfectly centre-cup or they roll past/lip out.

This separates lucky chip-ins from normal putting, and makes the zoomed putting phase more meaningful.

## Ball flight animation

Carried shots now visually rise, land, bounce, then roll:

- Driver and woods have a lower flight arc and stronger bounce/roll.
- Irons have a medium arc.
- Wedges have a high arc, so the ball grows more during flight and lands softer.
- Badly mistimed hook/slice shots curve visibly during flight.
- Putts do not change height; they stay flat and roll immediately.

This is visual only for now. It improves feel without changing the main carry matrix.

## Bunker behaviour

Sand is now treated as a plug/stop surface:

- Landing in a bunker should produce almost no bounce.
- The ball should not roll meaningfully once it reaches sand.
- Rolling into a bunker should dead-stop the ball and switch the suggested club to Sand Wedge.
- Escaping a bunker is still possible with wedges, but the bunker itself should not act like a slow fairway.

## Carry vs roll

The dotted aim line now shows the expected **carry** point for normal clubs, not the final total distance. The ball may get extra roll after landing depending on the landing surface.

For the putter, the dotted line shows expected **roll** instead of carry.

## Club and lie carry matrix

Approximate max carry/roll by club and surface:

| Club | Tee | Fairway | Rough | Sand | Green |
| --- | ---: | ---: | ---: | ---: | ---: |
| Driver | 285 yd | 45 yd | 15 yd | 0 yd | 8 yd |
| 3 Wood | 245 yd | 75 yd | 25 yd | 0 yd | 10 yd |
| 5 Iron | 185 yd | 175 yd | 125 yd | 35 yd | 18 yd |
| 7 Iron | 155 yd | 145 yd | 110 yd | 45 yd | 16 yd |
| Pitching Wedge | 108 yd | 102 yd | 82 yd | 55 yd | 12 yd |
| Sand Wedge | 84 yd | 78 yd | 62 yd | 70 yd | 10 yd |
| Putter | 24 yd | 22 yd | 8 yd | 0 yd | 45 yd |

This should make club choice much clearer. Driver and 3 Wood are strong from the tee but intentionally poor from the fairway/rough, so approach shots should usually use irons or wedges.

## Lie and surface rules

| Surface | Carry behaviour | Accuracy | Timing difficulty | Roll/friction | Gameplay purpose |
| --- | --- | --- | --- | --- | --- |
| Tee | Strong driver carry, but not green-reaching on a par 4 | normal | easiest lie, club still matters | modest roll | Strong first shot |
| Fairway | Strong carry for irons/wedges; weak for driver/3W off the deck | normal | easy-medium, but long clubs are very hard | good roll | Ideal landing area |
| Rough | Reduced carry | worse | hard | little roll | Punishes misses without stopping play |
| Sand | Only wedges work well | much worse | very hard | plug/stop, almost no bounce | Forces recovery shots |
| Green | Best for putting | accurate | low-medium plus slope read | high roll with gentle break and low-speed settle | Putting surface |
| Water/out of bounds | penalty | n/a | n/a | n/a | Adds risk/reward |

## Shot model for MVP

The prototype uses a simple 2D model:

- Club + current lie chooses a maximum carry/roll distance from the matrix.
- Drag power scales that maximum.
- Driver and 3 Wood have severely reduced carry when not hit from the tee.
- Release opens a timing bar instead of immediately striking the shot.
- Club, surface, and power combine into a difficulty rating.
- Harder shots have a smaller sweet spot and faster moving marker.
- Clean timing preserves carry and reduces directional miss.
- Middle contact is playable but slightly reduces carry and accuracy.
- Poor timing reduces carry, adds hook/slice angle error, and can add visible flight curve.
- Normal clubs fly to the final calculated carry point.
- During flight, the ball visually scales up and back down to suggest height.
- The effective cup capture is smaller before the zoomed putting phase.
- Putts roll immediately, then green slopes can bend the ball based on line and pace.
- Fast putts get a much smaller effective cup capture than slow putts.
- Slow putts that lose momentum settle instead of trickling indefinitely.
- After landing, carried shots do a short bounce animation unless they land in sand.
- After bouncing, surface and club type calculate a small amount of extra roll, except sand which should stop the ball.
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
