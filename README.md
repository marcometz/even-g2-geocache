# even-g2-geocache

Geocaching app prototype for Even Realities G2.

## Features

### Companion App
- Version 1: no features
- Version 2: Geocaching login placeholder

### Glass App
- **Startscreen** with geocaches in a 5km radius (from Geocaching REST API, with fallback demo data)
- **DetailScreen** with cache details (name, description, distance, difficulty, terrain, type, size, code)
- **Geocache Finder** with direction + distance compass style and hint display
- **Display-style redesign** aligned to Even G2 constraints (576x288, grayscale, border-first grouping)

Interactions:
- List: swipe up/down (touch), mouse wheel, or arrow keys to move selection
- List item click: open details
- Detail single click: open finder
- Detail double click: back to list
- Finder single click: show hint
- Finder double click: back to details

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
