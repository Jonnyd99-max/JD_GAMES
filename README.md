# JD Games v0.1
Original browser gaming platform with a playable quarter-mile Drag Racer, manual gears, launch/shift timing, CPU opponent, keyboard and touch controls, responsive design, and local records.

## Development
`pnpm install` then `pnpm dev`. Build with `pnpm build`; preview with `pnpm start`.

## Controls
Throttle: W, Up, or Space. Shift up: Right or E. Shift down: Left or Q. Escape returns to the menu. On touch, hold the right pedal and use the left gated shifter.

## GitHub Pages
Push this folder to `JD_GAMES`, open Settings → Pages, select GitHub Actions, and run the included workflow. No custom domain is required.

## Dealership and Garage
The main menu includes Dealership below Garage. Five classes (Starter, Roadster, American Muscle, Race Car and Supercar) each contain five fictional cars. The JD-R S1 is owned from the start, with 10,000 initial in-game credits. Wins pay 1,500 credits, plus 100 per perfect shift (up to five) and 300 for a perfect launch. Losses pay no credits. Paid cars can be sold for 60% of their purchase price; the original car cannot be sold. Selling the selected car selects the JD-R S1 again.

Garage purchases, credits and the selected car are saved locally under `jd-garage-v1`, separately from existing race statistics. These saves are device/browser-specific, not online accounts or secure real-money balances. The selected car changes both the race sprite and acceleration/gearing. Five-speed manual controls and the quarter-mile course are unchanged.

## Published game source
GitHub Pages serves `public/index.html` with `physics-v2.js` injected by the workflow. The dealership loads as a separate module (`dealership.js`, `dealership-data.mjs`, `dealership.css`) using the same deployment version. Keep these assets together when publishing; the older React prototype is not the current Pages entry point.

## Remaining scope
One CPU opponent and one track. Upgrades/tuning, nitrous, additional tracks, expanded audio and difficulty settings remain future work.

## Pixel-art vehicles
The dealership, garage, home card and races share 25 transparent 256×92 pixel-art sprites in `public/cars/pixel/`. Each vehicle has its own artwork; the opponent uses the ivory Starter car. Sprite backgrounds were removed locally with user approval, and tyre contact points align at pixel row 88. CSS nearest-neighbour scaling keeps the pixel art crisp. `dealership-data.mjs` maps catalogue IDs to versioned asset URLs. Prices, credit rules and performance are independent of these visual assets.
