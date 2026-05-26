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

GPS note: phone geolocation is requested through the browser/WebView
`navigator.geolocation` API. A LAN QR URL such as `http://192.168.x.x:5173`
can be blocked by iOS/WKWebView with `Origin does not have permission to use
Geolocation service`. For GPS testing on the phone, use a packaged EvenHub
build with the `location` permission in `app.json`, or serve the dev URL over
trusted HTTPS.

Useful environment variables:

- `DEV_IP` or `DEV_URL` to force a specific reachable URL
- `START_SIMULATOR=0` to start only server + QR
- `SIMULATOR_GLOW=1` to pass `-g` to the simulator
- `SIMULATOR_AUTOMATION_PORT=9898` to expose simulator automation API
- `VITE_GEOCACHE_FALLBACK=1` to force three local test geocaches
  (`VITE_GEOCACHE_FALLBACK=0` disables the automatic Vite dev fallback)

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

### Pack for phone GPS testing

For real phone GPS, prefer a packaged EvenHub build so the `location`
permission in `app.json` is applied:

```bash
npm run pack
```

This writes `even-g2-geocache.ehpk`. Install/test that package through the
EvenHub developer flow instead of the plain `http://<lan-ip>:5173` QR when you
need `navigator.geolocation`.

### OpenCaching OKAPI data source

The app loads nearby caches from OpenCaching OKAPI, which supports direct
browser/WebView requests with CORS. The default OpenCaching.DE consumer key is
built into the app, so a normal package build is enough:

```bash
npm run pack
```

By default the app queries `https://www.opencaching.de/okapi`. To target a
different whitelisted OKAPI installation, also set
`VITE_OPENCACHING_API_BASE_URL` and optionally override the consumer key, for
example:

```bash
VITE_OPENCACHING_API_BASE_URL=https://opencache.uk/okapi \
VITE_OPENCACHING_CONSUMER_KEY=your-consumer-key \
npm run pack
```

Direct `api.groundspeak.com` requests are not used because the EvenHub network
whitelist does not bypass browser CORS.

For local Vite development, the app automatically enables three nearby demo
geocaches when GPS/API data is unavailable. Packaged builds keep this fallback
disabled unless `VITE_GEOCACHE_FALLBACK=1` is set explicitly.

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
