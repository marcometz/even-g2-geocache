import { truncate } from "even-toolkit/text-utils";
import { SEP } from "even-toolkit/glass-format";

/**
 * @typedef {object} Geocache
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} hint
 * @property {number} difficulty
 * @property {number} terrain
 * @property {string} type
 * @property {string} size
 * @property {string} direction
 * @property {number} distanceKm
 */

/**
 * @typedef {object} ActiveTrack
 * @property {string} cacheId
 * @property {string} cacheName
 */

/**
 * @typedef {object} ActiveTrackMetrics
 * @property {string} cacheName
 * @property {string} arrow
 * @property {string} direction
 * @property {number} distanceKm
 * @property {number} bearing
 * @property {number} heading
 * @property {number} [relativeBearing]
 */

/**
 * @typedef {object} GlassSnapshot
 * @property {string} screen
 * @property {Geocache[]} geocaches
 * @property {number} selectedIndex
 * @property {boolean} showHint
 * @property {ActiveTrack|null} [activeTrack]
 * @property {ActiveTrackMetrics|null} [activeTrackMetrics]
 * @property {boolean} [geocachesLoading]
 * @property {string} [geocacheLoadError]
 */

const CARDINAL_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const COMPASS_PADDING = 1;
const COMPASS_SLOT_WIDTH = 5;
const COMPASS_SLOT_SEPARATOR = "│";
const COMPASS_BAND_SEPARATOR = "┼";
const COMPASS_LABEL_STEP = 45;
const COMPASS_LABEL_OFFSETS = [-90, -45, 0, 45, 90];
const MONO_SPACE = "\u3000";

/**
 * Truncates text labels via the toolkit truncate helper.
 * @param {string} value
 * @param {number} maxLength
 * @returns {string}
 */
export function clampLabel(value, maxLength) {
  if (!value) {
    return "";
  }
  return truncate(String(value), maxLength);
}

/**
 * Centers a text token inside a fixed-width line.
 * @param {string} value
 * @param {number} width
 * @returns {string}
 */
function centerTextLine(value, width) {
  const token = String(value);
  if (token.length >= width) {
    return token;
  }

  const totalPadding = width - token.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${" ".repeat(leftPadding)}${token}${" ".repeat(rightPadding)}`;
}

/**
 * Converts printable ASCII text to fullwidth Unicode for visually stable
 * monospace-like rendering on the proportional G2 font.
 * Space becomes ideographic space.
 * @param {string} value
 * @returns {string}
 */
function toFullwidth(value) {
  return String(value).replace(/[\x20-\x7E]/g, (char) => (
    char === " "
      ? MONO_SPACE
      : String.fromCharCode(char.charCodeAt(0) + 0xFEE0)
  ));
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
  return String(rounded).padStart(3, "0");
}

/**
 * Centers a token inside a fixed-width compass slot.
 * @param {string} token
 * @param {number} [width]
 * @param {string} [fill]
 * @returns {string}
 */
function centerSlot(token, width = COMPASS_SLOT_WIDTH, fill = " ") {
  const value = String(token);
  const available = Math.max(0, width - value.length);
  const left = Math.floor(available / 2);
  const right = available - left;
  return `${fill.repeat(left)}${value}${fill.repeat(right)}`.slice(0, width);
}

/**
 * Builds one compass scale row from fixed-width slots.
 * @param {string[]} tokens
 * @param {string} [separator]
 * @param {string} [fill]
 * @returns {string}
 */
function buildSlotLine(tokens, separator = COMPASS_SLOT_SEPARATOR, fill = " ") {
  return withCompassPadding(tokens.map((token) => centerSlot(token, COMPASS_SLOT_WIDTH, fill)).join(separator));
}

/**
 * Snaps a relative offset to the nearest visible 45-degree slot.
 * @param {number} offset
 * @returns {number}
 */
function snapOffset(offset) {
  const minOffset = COMPASS_LABEL_OFFSETS[0];
  const maxOffset = COMPASS_LABEL_OFFSETS[COMPASS_LABEL_OFFSETS.length - 1];
  return Math.max(minOffset, Math.min(maxOffset, Math.round(offset / COMPASS_LABEL_STEP) * COMPASS_LABEL_STEP));
}

/**
 * @param {number} degrees
 * @returns {boolean}
 */
function isCardinalDegree(degrees) {
  return normalizeDegrees(degrees) % 45 === 0;
}

/**
 * Wraps compass content with left/right padding.
 * @param {string} content
 * @returns {string}
 */
function withCompassPadding(content) {
  return `${" ".repeat(COMPASS_PADDING)}${content}${" ".repeat(COMPASS_PADDING)}`;
}

/**
 * Builds the degree-scale line aligned to the compass width.
 * @param {ActiveTrackMetrics} metrics
 * @returns {string}
 */
function buildDegreeScaleLine(metrics) {
  const base = snapDegrees(metrics.heading);
  const relative = Number.isFinite(metrics?.relativeBearing) ? metrics.relativeBearing : 0;
  const highlightOffset = snapOffset(relative);
  const tokens = COMPASS_LABEL_OFFSETS.map((offset) => {
    const label = padDegrees(base + offset);
    return toFullwidth(offset === highlightOffset ? `[${label}]` : label);
  });

  return buildSlotLine(tokens, COMPASS_SLOT_SEPARATOR, MONO_SPACE);
}

/**
 * Builds the cardinal-scale line aligned to the compass width.
 * @param {ActiveTrackMetrics} metrics
 * @returns {string}
 */
function buildCardinalScaleLine(metrics) {
  const base = snapDegrees(metrics.heading);
  const tokens = COMPASS_LABEL_OFFSETS.map((offset) => {
    const degrees = base + offset;
    return toFullwidth(isCardinalDegree(degrees) ? degreesToCardinal(degrees) : "·");
  });

  return buildSlotLine(tokens, COMPASS_SLOT_SEPARATOR, MONO_SPACE);
}

/**
 * Builds the full compass band with evenly distributed tick marks.
 * @param {ActiveTrackMetrics} metrics
 * @returns {string}
 */
function buildCompassBand(metrics) {
  const relative = Number.isFinite(metrics?.relativeBearing) ? metrics.relativeBearing : 0;
  const targetOffset = snapOffset(relative);
  const tokens = COMPASS_LABEL_OFFSETS.map((offset) => {
    if (offset === targetOffset) {
      return offset === 0 ? "◆" : "▲";
    }
    return offset === 0 ? "│" : "┬";
  });
  return buildSlotLine(tokens, COMPASS_BAND_SEPARATOR, "─");
}

/**
 * Formats track distance for the compact compass header.
 * @param {number} distanceKm
 * @returns {string}
 */
export function formatTrackDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return "--";
  }

  if (distanceKm < 1) {
    return `${Math.max(0, Math.round(distanceKm * 1000))}m`;
  }

  return `${distanceKm.toFixed(2).replace(".", ",")}km`;
}

/**
 * Builds the realtime track header shown when a track is active.
 * @param {ActiveTrackMetrics|null|undefined} metrics
 * @returns {string}
 */
export function buildTrackHeader(metrics) {
  if (!metrics) {
    return "";
  }

  const degreesLine = buildDegreeScaleLine(metrics);
  const cardinalLine = buildCardinalScaleLine(metrics);
  const band = buildCompassBand(metrics);

  return [
    degreesLine,
    cardinalLine,
    band,
    `TRACK ${clampLabel(metrics.cacheName, 16)} ${metrics.direction} (${Math.round(metrics.bearing)} Grad) ${formatTrackDistance(metrics.distanceKm)}`
  ].join("\n");
}

/**
 * Renders short list-row labels for the current geocache set.
 * @param {Geocache[]} geocaches
 * @returns {string[]}
 */
export function buildListRows(geocaches) {
  if (geocaches.length === 0) {
    return ["No geocaches loaded. Use Reload."];
  }

  return geocaches.slice(0, 20).map((item) => {
    const name = clampLabel(item.name, 40);
    return `${name} ${SEP} ${item.direction} ${SEP} ${item.distanceKm.toFixed(2)}km`;
  });
}

/**
 * Builds the detail screen body text for the selected cache.
 * Compact format: no blank lines, combined field rows.
 * @param {Geocache|undefined} geocache
 * @param {ActiveTrack|null|undefined} activeTrack
 * @param {boolean} [showHint=false]
 * @returns {string}
 */
export function buildDetailText(geocache, activeTrack, showHint = false) {
  if (!geocache) {
    return "No cache selected.";
  }

  const isActiveTrack = activeTrack?.cacheId === geocache.id;
  const trackState = isActiveTrack ? "ACTIVE" : "inactive";
  const hintLine = showHint
    ? `☞ Hint: ${clampLabel(geocache.hint || "No hint available.", 140)}`
    : "☞ Hint: hidden (Click or options to show)";

  const centeredName = centerTextLine(clampLabel(geocache.name, 38), 42);

  return [
    centeredName,
    clampLabel(geocache.description, 170),
    `▶ Dist: ${geocache.distanceKm.toFixed(2)}km ${SEP} ${geocache.direction} ${SEP} Difficulty: ${geocache.difficulty} ${SEP} Terrain: ${geocache.terrain}`,
    `■ Type: ${geocache.type} ${SEP} Size: ${geocache.size} ${SEP} Code: ${geocache.id}`,
    `◆ GeoTrack: ${trackState}`,
    hintLine,
      "Click: toggle hint   ↓ options   DBL: back"
  ].join("\n");
}

/**
 * Builds the fake-button options text for the detail options phase.
 * Includes a bracketed cache name header (brackets simulate bold emphasis
 * since the G2 display has no font-weight or underline support), a separator,
 * and cursor-marked action items.
 *
 * Exported so `app.js` can call `textContainerUpgrade` on cursor-only changes.
 * @param {Geocache|undefined} geocache
 * @param {ActiveTrack|null|undefined} activeTrack
 * @param {boolean} showHint
 * @param {number} selectedIndex - 0 = GeoTrack, 1 = Hint
 * @returns {string}
 */
export function buildOptionsFakeButtons(geocache, activeTrack, showHint, selectedIndex) {
  if (!geocache) {
    return "No cache selected.";
  }

  const isActive = activeTrack?.cacheId === geocache.id;
  const options = [
    `GeoTrack: ${isActive ? "Stop" : "Start"}`,
    `Hint: ${showHint ? "Hide" : "Show"}`
  ];

  const name = centerTextLine(`[${clampLabel(geocache.name, 28)}]`, 42);
  const trackState = isActive ? "ACTIVE" : "inactive";

  return [
    `${name} ${SEP} GeoTrack: ${trackState}`,
    ...options.map((opt, i) => `${i === selectedIndex ? ">" : " "} ${opt}`),
    "  \u2191 back to details   DBL: back to list"
  ].join("\n");
}
