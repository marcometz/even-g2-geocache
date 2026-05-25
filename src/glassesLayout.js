import { SCREEN } from "./state.js";

const CARDINAL_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const COMPASS_PADDING = 3;
const COMPASS_INNER_WIDTH = 90;
const COMPASS_WINDOW_DEG = 45;
const COMPASS_LABEL_STEP = 15;
const COMPASS_LABEL_OFFSETS = [-45, -30, -15, 0, 15, 30, 45];

/**
 * Truncates text labels to a maximum length.
 * @param {string} value
 * @param {number} maxLength
 * @returns {string}
 */
function clampLabel(value, maxLength) {
  if (!value) {
    return "";
  }
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

/**
 * Normalizes degrees to 0..359.
 * @param {number} degrees
 * @returns {number}
 */
function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Snaps degrees to the nearest compass label step.
 * @param {number} degrees
 * @returns {number}
 */
function snapDegrees(degrees) {
  return normalizeDegrees(Math.round(degrees / COMPASS_LABEL_STEP) * COMPASS_LABEL_STEP);
}

/**
 * Maps degrees to an 8-wind cardinal label.
 * @param {number} degrees
 * @returns {string}
 */
function degreesToCardinal(degrees) {
  const normalized = normalizeDegrees(degrees);
  const index = Math.round(normalized / 45) % CARDINAL_LABELS.length;
  return CARDINAL_LABELS[index];
}

/**
 * Pads a number as three-digit degree label.
 * @param {number} degrees
 * @returns {string}
 */
function padDegrees(degrees) {
  const rounded = Math.round(normalizeDegrees(degrees));
  return String(rounded);
}

/**
 * Centers text inside a fixed-width cell.
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function centerCell(text, width) {
  const value = String(text);
  if (value.length >= width) {
    return value.slice(0, width);
  }

  const left = Math.floor((width - value.length) / 2);
  const right = width - value.length - left;
  return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}

/**
 * Renders evenly spaced labels in fixed-width slots.
 * @param {string[]} labels
 * @param {number} slotWidth
 * @returns {string}
 */
function renderSlotLine(labels, slotWidth) {
  return withCompassPadding(labels.map((label) => centerCell(label, slotWidth)).join(" "));
}

/**
 * Places a token centered around an index inside a char array.
 * @param {string[]} line
 * @param {number} centerIndex
 * @param {string} token
 * @returns {void}
 */
function placeToken(line, centerIndex, token) {
  const start = Math.round(centerIndex - token.length / 2);
  for (let i = 0; i < token.length; i += 1) {
    const idx = start + i;
    if (idx >= 0 && idx < line.length) {
      line[idx] = token[i];
    }
  }
}

/**
 * Builds a horizontal compass strip where center is current head direction.
 * Target direction is marked with ▲ relative to heading.
 * @param {{ relativeBearing: number, heading: number }} metrics
 * @returns {string}
 */
function mapOffsetToIndex(offset, width = COMPASS_INNER_WIDTH, range = COMPASS_WINDOW_DEG) {
  const clamped = Math.max(-range, Math.min(range, offset));
  const ratio = (clamped + range) / (2 * range);
  return Math.round(ratio * (width - 1));
}

/**
 * Applies left/right padding to a rendered compass row.
 * @param {string} content
 * @returns {string}
 */
function withCompassPadding(content) {
  return `${" ".repeat(COMPASS_PADDING)}${content}${" ".repeat(COMPASS_PADDING)}`;
}

/**
 * Builds the degree-scale line aligned to the compass width.
 * @param {{ heading: number }} metrics
 * @returns {string}
 */
function buildDegreeScaleLine(metrics) {
  const offsets = COMPASS_LABEL_OFFSETS;
  const base = snapDegrees(metrics.heading);
  const relative = Number.isFinite(metrics?.relativeBearing) ? metrics.relativeBearing : 0;
  const highlightOffset = Math.max(-45, Math.min(45, Math.round(relative / COMPASS_LABEL_STEP) * COMPASS_LABEL_STEP));
  const line = Array.from({ length: COMPASS_INNER_WIDTH }, () => " ");

  for (const offset of offsets) {
    const label = padDegrees(base + offset);
    const token = offset === highlightOffset ? `[${label}]` : label;
    placeToken(line, mapOffsetToIndex(offset), token);
  }

  return withCompassPadding(line.join(""));
}

/**
 * Builds the cardinal-scale line aligned to the compass width.
 * @param {{ heading: number }} metrics
 * @returns {string}
 */
function buildCardinalScaleLine(metrics) {
  const offsets = COMPASS_LABEL_OFFSETS;
  const base = snapDegrees(metrics.heading);
  const line = Array.from({ length: COMPASS_INNER_WIDTH }, () => " ");
  let lastLabel = null;

  for (const offset of offsets) {
    const label = degreesToCardinal(base + offset);
    if (label === lastLabel) {
      continue;
    }

    lastLabel = label;
    placeToken(line, mapOffsetToIndex(offset), label);
  }

  return withCompassPadding(line.join(""));
}

/**
 * Builds a full-width compass band with heading center and target marker.
 * @param {{ relativeBearing: number }} metrics
 * @returns {string}
 */
function buildCompassBand(metrics) {
  const line = Array.from({ length: COMPASS_INNER_WIDTH }, () => " ");
  for (let deg = -45; deg <= 40; deg += 10) {
    line[mapOffsetToIndex(deg)] = "─";
  }

  const center = mapOffsetToIndex(0);
  line[center] = "│";

  const relative = Number.isFinite(metrics?.relativeBearing) ? metrics.relativeBearing : 0;
  const targetIndex = mapOffsetToIndex(Math.max(-45, Math.min(45, relative)));
  line[targetIndex] = targetIndex === center ? "◆" : "▲";
  return withCompassPadding(line.join(""));
}

/**
 * Builds compact degree/cardinal labels for the current heading window.
 * @param {{ heading: number }} metrics
 * @returns {{ degreesLine: string, cardinalLine: string }}
 */
function buildHeadingLabels(metrics) {
  return {
    degreesLine: buildDegreeScaleLine(metrics),
    cardinalLine: buildCardinalScaleLine(metrics)
  };
}

/**
 * Builds a short realtime track header shown on all screens when a track is active.
 * @param {{ cacheName: string, arrow: string, direction: string, distanceKm: number, heading: number }|null|undefined} metrics
 * @returns {string}
 */
function buildTrackHeader(metrics) {
  if (!metrics) {
    return "";
  }

  const labels = buildHeadingLabels(metrics);
  const band = buildCompassBand(metrics);

  return [
    `${labels.degreesLine}`,
    `${labels.cardinalLine}`,
    `${band}`,
    `TRACK ${clampLabel(metrics.cacheName, 16)} ${metrics.direction} (${Math.round(metrics.bearing)} Grad) ${metrics.distanceKm.toFixed(2).replace(".", ",")}km`
  ].join("\n");
}

/**
 * Wraps compass header in a thin text frame.
 * @param {string} content
 * @returns {string}
 */
function frameCompass(content) {
  const lines = content.split("\n");
  const width = Math.max(...lines.map((line) => line.length), 0);
  const innerWidth = Math.max(width, COMPASS_INNER_WIDTH + COMPASS_PADDING * 2);
  const top = `╭${"─".repeat(innerWidth + 2)}╮`;
  const body = lines.map((line) => `│ ${line.padEnd(innerWidth, " ")} │`);
  const bottom = `╰${"─".repeat(innerWidth + 2)}╯`;
  return [top, ...body, bottom].join("\n");
}

/**
 * Builds list container item labels for the current geocache set.
 * @param {Array<{name: string, direction: string, distanceKm: number}>} geocaches
 * @returns {string[]}
 */
function buildListRows(geocaches) {
  if (geocaches.length === 0) {
    return ["No geocaches found in 5km radius."];
  }

  return geocaches.slice(0, 20).map((item) => {
    const name = clampLabel(item.name, 40);
    return `${name} · ${item.direction} · ${item.distanceKm.toFixed(2)}km`;
  });
}

/**
 * Creates detail screen text content.
 * @param {{name: string, description: string, distanceKm: number, direction: string, difficulty: number, terrain: number, type: string, size: string, id: string}|undefined} geocache
 * @param {{cacheId: string, cacheName: string}|null|undefined} activeTrack
 * @returns {string}
 */
function buildDetailText(geocache, activeTrack) {
  if (!geocache) {
    return "No cache selected.";
  }

  const isActiveTrack = activeTrack?.cacheId === geocache.id;
  const trackState = isActiveTrack ? "ACTIVE" : "inactive";

  return [
    `DETAIL // ${clampLabel(geocache.name, 38)}`,
    "",
    clampLabel(geocache.description, 170),
    "",
    `Distance: ${geocache.distanceKm.toFixed(2)}km`,
    `Direction: ${geocache.direction}`,
    `Difficulty: ${geocache.difficulty}`,
    `Terrain: ${geocache.terrain}`,
    `Type: ${geocache.type} · Size: ${geocache.size}`,
    `Code: ${geocache.id}`,
    `GeoTrack: ${trackState}`,
    "",
    "Options below: Swipe to select · Click to toggle",
    "DoubleClick: Back"
  ].join("\n");
}

/**
 * Builds detail option labels for swipe + click toggles.
 * @param {{id: string}|undefined} geocache
 * @param {{cacheId: string}|null|undefined} activeTrack
 * @param {boolean} showHint
 * @returns {string[]}
 */
function buildDetailOptions(geocache, activeTrack, showHint) {
  const isActive = geocache && activeTrack?.cacheId === geocache.id;
  return [
    `GeoTrack: ${isActive ? "Stop" : "Start"}`,
    `Hint: ${showHint ? "Hide" : "Show"}`
  ];
}

/**
 * Creates finder screen text content.
 * @param {{name: string, direction: string, distanceKm: number, hint: string, id: string}|undefined} geocache
 * @param {{cacheId: string, cacheName: string}|null|undefined} activeTrack
 * @param {boolean} showHint
 * @returns {string}
 */
function buildFinderText(geocache, activeTrack, showHint) {
  if (!geocache) {
    return "No cache selected.";
  }

  const hintLine = showHint ? `Hint: ${clampLabel(geocache.hint, 140)}` : "Click: Show hint";
  const trackLine = activeTrack?.cacheId === geocache.id ? "GeoTrack: ACTIVE" : "GeoTrack: inactive";

  return [
    `FINDER // ${clampLabel(geocache.name, 38)}`,
    "",
    `Compass: ${geocache.direction}`,
    `Distance: ${geocache.distanceKm.toFixed(2)}km`,
    trackLine,
    "",
    hintLine,
    "",
    "DoubleClick: Back to detail"
  ].join("\n");
}

/**
 * Builds the EvenHub container payload for the current app state.
 * @param {{screen: string, geocaches: Array<{name: string, direction: string, distanceKm: number, description: string, difficulty: number, terrain: number, type: string, size: string, id: string, hint: string}>, selectedIndex: number, showHint: boolean, activeTrack?: {cacheId: string, cacheName: string}|null, activeTrackMetrics?: { cacheName: string, arrow: string, direction: string, distanceKm: number, heading: number }|null}} state
 * @returns {{containerTotalNum: number, textObject?: Array<Record<string, unknown>>, listObject?: Array<Record<string, unknown>>}}
 */
export function buildGlassesLayout(state) {
  const selected = state.geocaches[state.selectedIndex];
  const trackSuffix = state.activeTrackMetrics
    ? ` · ${state.activeTrackMetrics.arrow}${state.activeTrackMetrics.direction} ${state.activeTrackMetrics.distanceKm.toFixed(2)}km`
    : state.activeTrack
      ? ` · TRACK ${clampLabel(state.activeTrack.cacheName, 22)}`
      : "";

  if (state.screen === SCREEN.LIST) {
    const topText = state.activeTrackMetrics
      ? `${buildTrackHeader(state.activeTrackMetrics)}\nG2 GEOCACHE // LIST (5km)`
      : `G2 GEOCACHE // LIST (5km)${trackSuffix}`;

    const topHeight = state.activeTrackMetrics ? 94 : 36;

    return {
      containerTotalNum: 2,
      textObject: [
        {
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: topHeight,
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 2,
          containerID: 1,
          containerName: "title",
          content: state.activeTrackMetrics ? frameCompass(topText) : topText,
          isEventCapture: 0
        }
      ],
      listObject: [
        {
          xPosition: 0,
          yPosition: topHeight,
          width: 576,
          height: 288 - topHeight,
          containerID: 2,
          containerName: "cache-list",
          isEventCapture: 1,
          itemContainer: {
            itemCount: Math.max(1, Math.min(20, state.geocaches.length)),
            itemWidth: 560,
            isItemSelectBorderEn: 1,
            itemName: buildListRows(state.geocaches)
          }
        }
      ]
    };
  }

  if (state.screen === SCREEN.DETAIL) {
    const topBlock = state.activeTrackMetrics ? `${buildTrackHeader(state.activeTrackMetrics)}\n` : "";

    return {
      containerTotalNum: 2,
      textObject: [
        {
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 220,
          borderWidth: 0,
          borderColor: 0,
          borderRadius: 0,
          paddingLength: 4,
          containerID: 3,
          containerName: "detail",
          content: `${topBlock}${buildDetailText(selected, state.activeTrack)}`,
          isEventCapture: 0
        }
      ],
      listObject: [
        {
          xPosition: 0,
          yPosition: 220,
          width: 576,
          height: 68,
          containerID: 5,
          containerName: "detail-options",
          isEventCapture: 1,
          itemContainer: {
            itemCount: 2,
            itemWidth: 560,
            isItemSelectBorderEn: 1,
            itemName: buildDetailOptions(selected, state.activeTrack, state.showHint)
          }
        }
      ]
    };
  }

  const topBlock = state.activeTrackMetrics ? `${buildTrackHeader(state.activeTrackMetrics)}\n` : "";

  return {
    containerTotalNum: 1,
    textObject: [
      {
        xPosition: 0,
        yPosition: 0,
        width: 576,
        height: 288,
        borderWidth: 0,
        borderColor: 0,
        borderRadius: 0,
        paddingLength: 4,
        containerID: 4,
        containerName: "finder",
        content: `${topBlock}${buildFinderText(selected, state.activeTrack, state.showHint)}`,
        isEventCapture: 1
      }
    ]
  };
}
