# even-g2-geocache

Geocaching app prototype for Even Realities G2.

## Features

### Companion App
- Anzeige des aktiven Geotracks (Cache + Zielkoordinate)
- Persistenter Active-Geotrack-Store (über App-Neustarts hinweg)
- Bearbeiten der Zielkoordinate des aktiven Geotracks
- Geotrack stoppen

### Glass App
- **Startscreen** with geocaches in a 5km radius (from Geocaching REST API, with fallback demo data)
- **DetailScreen** with cache details (name, description, distance, difficulty, terrain, type, size, code)
- **Geocache Finder** with direction + distance compass style and hint display
- **Geotrack-Start im Detailscreen** (inkl. Warnung, wenn bereits anderer Track aktiv ist)
- **Globaler horizontaler Kompass-Header** auf allen Screens bei aktivem Track (inkl. Zielrichtung + Distanz)
- **Display-style redesign** aligned to Even G2 constraints (576x288, grayscale, border-first grouping)

Interactions:
- List: swipe up/down (touch), mouse wheel, or arrow keys to move selection
- List item click: open details
- Detail button click: start geotrack
- Detail single click (outside button): open finder
- Detail double click: back to list
- Finder single click: show hint
- Finder double click: back to details
- Bei aktivem Geotrack: Left/Right-Arrow simuliert Kopfrotation (Fallback), DeviceOrientation steuert Kompass auf unterstützten Geräten

## Local development (aligned with Even "Your First App")

The Even docs run the simulator against a local web URL (example: `evenhub-simulator http://localhost:5173`).
This project is configured the same way.

### 1) Start local web server

```bash
npm start
```

This serves the app on `http://localhost:5173`.

### 2) Run the Even simulator against the local URL

Prerequisite (once):

```bash
npm install -g @evenrealities/evenhub-simulator
```

Then start the simulator:

```bash
npm run simulator
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
