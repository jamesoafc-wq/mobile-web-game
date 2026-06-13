# Mobile Web Game Ideas

Direction: a replayable mobile tycoon / economy game with colourful, room-like visuals, inspired by the feel of a hotel tycoon game but not about hotels.

## Design goals

- Works well on a phone screen in portrait mode.
- Simple enough for a first GitHub Pages web game.
- Uses HTML, CSS and JavaScript only.
- Has replayability through upgrades, unlocks, prestige, random events, and daily goals.
- Has visual progression: the player should visibly build something over time.

---

## Best concept: Mini Arcade Tycoon

### Core idea

The player runs a tiny arcade. They place arcade machines, upgrade them, collect coins, handle repairs, and unlock themed areas.

### Why it fits

- It has strong economics without needing a huge simulation.
- It can use colourful tile/room visuals similar to a tycoon game.
- It is clearly not a hotel tycoon.
- It works well on mobile because the player can tap machines to collect, upgrade, repair, or move them.
- Replayability comes from machine unlocks, prestige, events, customer types, and layout choices.

### Core loop

1. Customers enter the arcade.
2. They choose machines based on appeal, price, and queue length.
3. Machines generate coins over time.
4. Player collects coins and spends them on upgrades.
5. Better machines attract more customers.
6. Player expands the arcade, decorates it, and unlocks new machine types.
7. Optional prestige reset gives permanent bonuses.

### Economy variables

- Coins
- Reputation
- Machine income per play
- Machine maintenance cost
- Customer patience
- Machine appeal
- Floor space
- Staff speed
- Event multipliers

### Upgrade examples

- Better joystick: +income
- Neon lights: +appeal
- Faster repair kit: less downtime
- Snack corner: customers stay longer
- Ticket counter: extra bonus currency
- VIP pass: rare customers spend more

### Random events

- Weekend rush: more customers for 60 seconds
- Machine jam: one machine stops until repaired
- Influencer visit: reputation boost if arcade is clean
- Retro night: old machines earn double
- Power surge: upgrade prices temporarily rise

### Visual style

Top-down or simple isometric-style room tiles. Bright cabinets, neon signs, tiny customers, coin bubbles, and unlockable floor themes.

### MVP scope

- One room grid
- Three machine types
- Tap to collect coins
- Basic customer spawning
- Upgrade button
- Save progress in localStorage
- Simple prestige/reset bonus

---

## Alternative concept 1: Food Court Rush Tycoon

The player manages a tiny food court with stalls instead of hotel rooms. They buy stalls, set prices, upgrade recipes, and handle lunch rushes.

### Replayability

- Different food stall combinations
- Rush hour events
- Recipe upgrades
- Customer types with preferences
- Prestige as a restaurant chain

### Why it is good

It has strong economics and visual progression, but food balancing may become more complex than the arcade idea.

---

## Alternative concept 2: Tiny Theme Park Tycoon

The player builds a small theme park with rides, snack carts, benches, bins, and paths.

### Replayability

- Ride upgrades
- Queue management
- Weather events
- Visitor happiness
- Unlockable park zones

### Why it is good

It is very replayable, but pathfinding and crowd movement could become harder for a first mobile web build.

---

## Alternative concept 3: Street Market Tycoon

The player builds a market street with stalls, stock, customer demand, and changing daily trends.

### Replayability

- Daily item demand changes
- Buy-low/sell-high stock system
- Stall upgrades
- Customer waves
- Seasonal events

### Why it is good

It is simpler than a theme park and has good economics, but the visuals may be less instantly fun than an arcade.

---

## Alternative concept 4: Pet Shelter Tycoon

The player runs a small pet shelter. They upgrade enclosures, care stations, adoption desks, and play areas.

### Replayability

- Pet types with different needs
- Adoption events
- Care upgrades
- Reputation growth
- Rare pets

### Why it is good

It has emotional appeal and strong visuals, but the pacing may be slower unless designed carefully.

---

## Recommendation

Build **Mini Arcade Tycoon** first.

It gives the best balance of:

- replayability
- simple mobile controls
- strong visual progression
- clear economy
- small MVP scope
- easy GitHub Pages deployment

## Next decision

Choose the first playable prototype style:

1. **Idle tycoon**: machines earn coins automatically over time.
2. **Tap tycoon**: player taps machines to collect coins and trigger upgrades.
3. **Rush tycoon**: short timed days where customers arrive in waves.

Recommended MVP: **Tap tycoon with idle income**, because it feels active on mobile but still has long-term progression.
