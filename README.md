# VELOCITY

**A high-momentum browser FPS built around movement, aim, and mastery.**

VELOCITY is a 3D first-person arena shooter where movement is part of the fight. Build speed, chain movement abilities, take unconventional routes through the map, and use that momentum to win gunfights. Outside of PvP, VELOCITY includes dedicated surf maps, time-trial courses, daily generated runs, and a progression-driven arsenal.

**Repository:** [err422/velocity](https://github.com/err422/velocity)

---

## What is in the game?

### Arena combat

- **1v1 Duels** and **4-player Free-for-All** matches.
- Six handcrafted arenas: **Surf Stadium**, **Aim Courtyard**, **Helix Spire**, **Cargo Killhouse**, **Skyline Run**, and **Redrock Canyon**.
- Host or join public/private rooms, including private rooms with short join codes.
- Peer-to-peer multiplayer using WebRTC data channels, with Firestore-backed lobby discovery and signaling.
- Arena text chat over the existing WebRTC game channel, with local bot dialogue in solo warmups.
- Arena map voting, scoreboards, kill feed, rematches, and solo bot warmups.
- Bot opponents for solo practice and warmup matches.

### Movement

VELOCITY's movement system is designed to reward momentum and route knowledge. The movement toolkit includes:

- Surfing along angled surfaces and chaining curves.
- Sliding and slide-under routes.
- Wall-running and wall-jumps.
- Grappling and tether-based movement.
- Speed bursts, launch pads, boost rings, and momentum-preserving portals.
- Checkpoints and run resets for course practice.

Movement is not just a way to get around the map. It is a core part of combat: use speed, elevation, routes, and timing to create better engagements.

### Surf and time-trial courses

- Dedicated surf maps across **five difficulty tiers (T1–T5)**.
- A mix of linear and staged courses, with checkpoints and course-specific mechanics.
- Time trials with personal-best tracking and ghost runs.
- Daily seeded movement courses, a browsable archive, and custom seed runs.
- Shared daily leaderboards when the online backend is available.

### Weapons and progression

- A growing arsenal spanning assault rifles, SMGs, shotguns, sniper rifles, pistols, revolvers, and melee weapons.
- Custom loadouts and a Gunsmith for weapon attachments.
- Weapon XP and individual weapon levels, with unlocks as weapons progress.
- Weapon skins, camos, knives, gloves, and an in-game armory.
- Scorestreaks and additional combat equipment.

The weapon system is built to support different playstyles without making movement an afterthought.

### Play your way

- Desktop keyboard/mouse controls.
- On-screen touch controls for mobile devices.
- Customizable settings for aim, camera, crosshair, keybinds, and weapon viewmodel framing.
- Guest play, with account sign-in available for online identity and cloud-backed progression.

---

## Getting started

VELOCITY runs in a modern browser and uses Three.js from a CDN. An internet connection is required to load the game's external dependencies and online services.

### Run locally

**Requirements:** Node.js and npm.

1. Clone the repository:

   ```bash
   git clone https://github.com/err422/velocity.git
   cd velocity
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

You can also serve the project with any static HTTP server, but using the included Express server is the simplest way to run the project in its expected environment.

---

## Controls

The default keyboard and mouse bindings are:

| Input | Action |
|---|---|
| `W A S D` | Move |
| Mouse | Look |
| Left mouse button | Fire |
| Right mouse button | Aim down sights |
| `1` / `2` / `3` | Equip primary / secondary / melee |
| `4` | Swap weapon |
| `R` | Reload |
| `Space` | Jump / wall-jump |
| `Left Shift` | Slide |
| `E` | Grapple / release |
| `Q` | Speed burst |
| `F` | Inspect weapon |
| `T` | Reset run |
| `C` | Return to previous checkpoint |

Keybinds can be customized in Settings. Mobile players use the on-screen movement and action controls.

---

## Tech stack

- **Three.js** — 3D rendering and scene management.
- **JavaScript ES modules** — game systems and client-side architecture.
- **WebRTC** — peer-to-peer real-time multiplayer data channels.
- **Firebase / Firestore** — authentication, cloud-backed player data, lobby discovery, and WebRTC signaling.
- **Node.js + Express** — local development server and optimized JavaScript bundle endpoint.

The game is primarily a browser client. Multiplayer gameplay traffic is peer-to-peer; Firestore is used for the supporting online services such as lobby discovery and connection signaling.

---

## Project structure

```text
velocity/
├── index.html                 # Game shell, UI markup, and script manifest
├── server.js                  # Express server and script bundle endpoint
├── styles/
│   └── main.css               # Main interface and HUD styling
├── src/
│   ├── core/                  # Game state, player, physics, input, game loop
│   ├── maps/                  # Arenas, surf/time-trial courses, daily runs
│   ├── models/                # Player, enemy, environment, and weapon models
│   ├── systems/
│   │   ├── bots/              # Bot behavior and decision-making
│   │   ├── combat/            # Combat systems and multiplayer netcode
│   │   ├── progression/       # Accounts, settings, inventory, cloud services
│   │   └── replays/           # Personal-best ghost recording/playback
│   ├── ui/                    # Menus, HUD, armory, gunsmith, settings
│   ├── weapons/               # Firearms, melee weapons, projectiles
│   ├── audio/                 # Weapon and interface audio
│   └── utils/                 # Shared utilities and registries
├── tests/                     # Node test suite
├── assets/                    # Game assets
└── public/                    # Public static files
```

The game loads its modular scripts from the manifest in `index.html`. When served through `server.js`, the server can deliver those scripts as a compressed bundle; if the bundle endpoint is unavailable, the client falls back to loading the individual modules.

---

## Development

Useful project scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Express server |
| `npm start` | Start the same server |
| `npm test` | Run the automated Node.js test suite |
| `npm run build` | Run JavaScript syntax checks across the server and game modules |
| `npm run lint` | Run the configured lint command and syntax checks |

Run the tests after changing gameplay systems:

```bash
npm test
```

The tests cover systems including arenas, surf courses, daily courses, ghosts, combat, bots, loadouts, knives, mobile controls, settings, authentication helpers, and weapon behavior.

---

## Project status

VELOCITY is an actively developed project. Features, balance, maps, weapons, and online systems are still evolving. The repository is the source of truth for the current implementation.
