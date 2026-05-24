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

Interactions:
- List: swipe up/down (touch), mouse wheel, or arrow keys to move selection
- List item click: open details
- Detail single click: open finder
- Detail double click: back to list
- Finder single click: show hint
- Finder double click: back to details

## Run

```bash
npm test
npm start
```

Then open `http://localhost:4173`.
