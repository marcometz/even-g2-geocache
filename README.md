# even-g2-geocache

Geocaching app prototype for Even Realities G2.

## Features

### Companion App

- No features in Version 1
- Geocaching login planned for Version 2

### Glass App

- **Startscreen** with geocaches in a 5km radius (name, direction, distance)
- **DetailScreen** with cache details (name, description, distance, difficulty, terrain, type, size, code)
- **Geocache Finder** with direction + distance and hint reveal
- Rendering on glasses via EvenHub container APIs (startup + rebuild)

Interactions:

- List: Up/Down to scroll
- List: Click opens details
- Detail: Click opens finder
- Detail: DoubleClick goes back to list
- Finder: Click shows hint
- Finder: DoubleClick goes back to details

## Local development (aligned with Even "Your First App")

### Unified startup (like shopping app)

You can run a single command that starts the web server, waits until it is reachable,
prints an EvenHub QR code, and starts the simulator:

```bash
npm run start:even
```

This uses a Vite dev server (`npm run dev`) on port `5173`.

Useful environment variables:

- `DEV_IP` or `DEV_URL` to force a specific reachable URL
- `START_SIMULATOR=0` to start only server + QR
- `SIMULATOR_GLOW=1` to pass `-g` to the simulator
- `SIMULATOR_AUTOMATION_PORT=9898` to expose simulator automation API

Example:

```bash
DEV_IP=100.119.208.17 SIMULATOR_GLOW=1 npm run start:even
```

The Even docs run the simulator against a local web URL (example: `evenhub-simulator http://localhost:5173`).
This project is configured the same way.

### 1) Start local web server

```bash
npm start
```

This starts Vite and serves the app on `http://localhost:5173`.

### 2) Run the Even simulator against the local URL

Prerequisite (once):

```bash
npm install -g @evenrealities/evenhub-simulator
```

Then start the simulator:

```bash
npm run simulator
```

The `simulator` script now checks if `http://localhost:5173` is reachable first.
If the server is not running, it exits with a clear message instead of starting into a blank screen.

Optional (without precheck):

```bash
npm run simulator:raw
```

Equivalent direct command:

```bash
evenhub-simulator http://localhost:5173
```

## Tests

```bash
npm test
```

## Copilot Skill

This repository includes a GitHub Copilot skill definition in `/skill.md` for Even G2 display-driven view design based on:
- official Even design Figma
- Display & UI System constraints
