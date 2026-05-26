const VISIBLE_OFFSETS = [-45, -30, -15, 0, 15, 30, 45];
const SEGMENT_STEP = 15;
const SEGMENT_WIDTH = 28;
const STRIP_WIDTH = 272;
const TILE_WIDTH = 272;
const STRIP_HEIGHT = 50;
const MAJOR_FONT = "9px monospace";
const MINOR_FONT = "6px monospace";
const CARDINAL_FONT = "8px monospace";
const INFO_FONT = "9px monospace";
const TEXT_COLOR = "#ffffff";
const SECONDARY_COLOR = "#b8b8b8";
const TICK_COLOR = "#d8d8d8";
const MINOR_TICK_COLOR = "#8c8c8c";
const TARGET_COLOR = "#ffffff";
const TARGET_SHADOW_COLOR = "#7a7a7a";
const BG_COLOR = "#000000";
const DIVIDER_COLOR = "#6f6f6f";
const CARDINAL_LABELS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * @typedef {{
 *   degrees: number,
 *   offset: number,
 *   cardinal: string|null,
 *   isMajor: boolean,
 *   isCenter: boolean,
 *   isTarget: boolean
 * }} CompassTile
 */

/**
 * Normalizes degrees to 0..359.
 * @param {number} degrees
 * @returns {number}
 */
export function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Snaps a degree value to the nearest 15-degree segment.
 * @param {number} degrees
 * @returns {number}
 */
export function snapToSegment(degrees) {
  return normalizeDegrees(Math.round(degrees / SEGMENT_STEP) * SEGMENT_STEP);
}

/**
 * Maps degrees to an 8-wind cardinal label.
 * @param {number} degrees
 * @returns {string}
 */
export function degreesToCardinal(degrees) {
  return CARDINAL_LABELS[Math.round(normalizeDegrees(degrees) / 45) % CARDINAL_LABELS.length];
}

/**
 * Builds the visible 15-degree compass tiles for the current heading window.
 * Major tiles are every 45 degrees and include a cardinal label.
 * Minor tiles are 15/30-degree steps in-between and show only the degree.
 * @param {{ heading: number, relativeBearing?: number }} metrics
 * @returns {CompassTile[]}
 */
export function buildCompassTiles(metrics) {
  const base = snapToSegment(metrics.heading);
  const relative = Number.isFinite(metrics?.relativeBearing) ? Number(metrics.relativeBearing) : 0;
  const targetOffset = Math.max(-90, Math.min(90, Math.round(relative / SEGMENT_STEP) * SEGMENT_STEP));

  return VISIBLE_OFFSETS.map((offset) => {
    const degrees = normalizeDegrees(base + offset);
    const isMajor = degrees % 45 === 0;
    return {
      degrees,
      offset,
      cardinal: isMajor ? degreesToCardinal(degrees) : null,
      isMajor,
      isCenter: offset === 0,
      isTarget: offset === targetOffset
    };
  });
}

/**
 * Formats compass distance for the info row.
 * @param {number} distanceKm
 * @returns {string}
 */
export function formatCompassDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return "--";
  }
  if (distanceKm < 1) {
    return `${Math.max(0, Math.round(distanceKm * 1000))}m`;
  }
  return `${distanceKm.toFixed(2).replace(".", ",")}km`;
}

/**
 * Builds the compact info text shown below the compass strip.
 * @param {{ cacheName: string, direction: string, bearing: number, distanceKm: number }} metrics
 * @returns {string}
 */
export function buildCompassInfoText(metrics) {
  return `TRACK ${String(metrics.cacheName).slice(0, 16)} ${metrics.direction} (${Math.round(metrics.bearing)}°) ${formatCompassDistance(metrics.distanceKm)}`;
}

/**
 * Returns the left pixel where the visible segment strip should start so it is
 * centered inside the fixed-width image.
 * @returns {number}
 */
function getStripStartX() {
  return Math.round((STRIP_WIDTH - SEGMENT_WIDTH * VISIBLE_OFFSETS.length) / 2);
}

/**
 * Measures text width for divider layout. Falls back to a rough estimate in
 * mocked test canvases where `measureText` may be unavailable.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @returns {number}
 */
function measureTextWidth(ctx, text) {
  if (typeof ctx.measureText === "function") {
    return ctx.measureText(text).width;
  }
  return text.length * 6;
}

/**
 * Creates a canvas in browser environments.
 * @returns {HTMLCanvasElement}
 */
function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = STRIP_WIDTH;
  canvas.height = STRIP_HEIGHT;
  return canvas;
}

/**
 * Creates a canvas with a custom size.
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
function createSizedCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draws one 15-degree tile into the strip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CompassTile} tile
 * @param {number} x
 * @returns {void}
 */
function drawTile(ctx, tile, x) {
  const centerX = x + SEGMENT_WIDTH / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (tile.isMajor) {
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = MAJOR_FONT;
    ctx.fillText(String(tile.degrees).padStart(3, "0"), centerX, 10);

    ctx.font = CARDINAL_FONT;
    ctx.fillText(tile.cardinal ?? "", centerX, 20);
  } else {
    ctx.fillStyle = SECONDARY_COLOR;
    ctx.font = MINOR_FONT;
    ctx.fillText(String(tile.degrees).padStart(3, "0"), centerX, 11);
  }

  ctx.strokeStyle = tile.isMajor ? TICK_COLOR : MINOR_TICK_COLOR;
  ctx.lineWidth = tile.isMajor ? 2 : 1;
  const tickTop = tile.isMajor ? 25 : 30;
  const tickBottom = tile.isMajor ? 36 : 34;
  ctx.beginPath();
  ctx.moveTo(centerX, tickTop);
  ctx.lineTo(centerX, tickBottom);
  ctx.stroke();

  if (tile.isCenter) {
    ctx.strokeStyle = TEXT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 24);
    ctx.lineTo(centerX, 39);
    ctx.stroke();
  }

  if (tile.isTarget) {
    ctx.fillStyle = TARGET_SHADOW_COLOR;
    ctx.beginPath();
    ctx.moveTo(centerX, 22);
    ctx.lineTo(centerX - 5, 28);
    ctx.lineTo(centerX + 5, 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = TARGET_COLOR;
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX - 4, 26);
    ctx.lineTo(centerX + 4, 26);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * Converts a canvas PNG data URL to a Uint8Array.
 * @param {string} dataUrl
 * @returns {Uint8Array}
 */
function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a canvas to PNG bytes.
 * @param {HTMLCanvasElement} canvas
 * @returns {Uint8Array}
 */
function canvasToBytes(canvas) {
  return dataUrlToBytes(canvas.toDataURL("image/png"));
}

/**
 * Renders the visible compass strip as PNG bytes for an EvenHub image container.
 * @param {{ cacheName: string, direction: string, bearing: number, distanceKm: number, heading: number, relativeBearing?: number }} metrics
 * @returns {Uint8Array}
 */
function renderCompassCanvas(metrics) {
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tiles = buildCompassTiles(metrics);
  const stripStartX = getStripStartX();
  tiles.forEach((tile, index) => {
    drawTile(ctx, tile, stripStartX + index * SEGMENT_WIDTH);
  });

  ctx.fillStyle = SECONDARY_COLOR;
  ctx.fillRect(stripStartX, 32, SEGMENT_WIDTH * tiles.length, 1);

  const infoText = buildCompassInfoText(metrics);
  ctx.font = INFO_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const infoY = 42;
  const infoTextWidth = measureTextWidth(ctx, infoText);
  const infoPadding = 10;
  const leftDividerStart = 10;
  const leftDividerEnd = Math.max(leftDividerStart, Math.round(STRIP_WIDTH / 2 - infoTextWidth / 2 - infoPadding));
  const rightDividerStart = Math.min(STRIP_WIDTH - 10, Math.round(STRIP_WIDTH / 2 + infoTextWidth / 2 + infoPadding));
  const rightDividerEnd = STRIP_WIDTH - 10;

  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  if (leftDividerEnd > leftDividerStart) {
    ctx.beginPath();
    ctx.moveTo(leftDividerStart, infoY);
    ctx.lineTo(leftDividerEnd, infoY);
    ctx.stroke();
  }
  if (rightDividerEnd > rightDividerStart) {
    ctx.beginPath();
    ctx.moveTo(rightDividerStart, infoY);
    ctx.lineTo(rightDividerEnd, infoY);
    ctx.stroke();
  }

  ctx.fillStyle = TEXT_COLOR;
  ctx.fillText(infoText, Math.round(STRIP_WIDTH / 2), infoY);

  return canvas;
}

/**
 * Renders the full compass strip as PNG bytes.
 * @param {{ cacheName: string, direction: string, bearing: number, distanceKm: number, heading: number, relativeBearing?: number }} metrics
 * @returns {Uint8Array}
 */
export function renderCompassImageBytes(metrics) {
  const canvas = renderCompassCanvas(metrics);
  return canvas ? canvasToBytes(canvas) : new Uint8Array();
}

/**
 * Renders the compass strip as two SDK-compliant image tiles (each <= 288px wide).
 * @param {{ cacheName: string, direction: string, bearing: number, distanceKm: number, heading: number, relativeBearing?: number }} metrics
 * @returns {[Uint8Array, Uint8Array]}
 */
export function renderCompassImageByteParts(metrics) {
  const canvas = renderCompassCanvas(metrics);
  if (!canvas) {
    return [new Uint8Array(), new Uint8Array()];
  }

  const leftCanvas = createSizedCanvas(TILE_WIDTH, STRIP_HEIGHT);
  const rightCanvas = createSizedCanvas(TILE_WIDTH, STRIP_HEIGHT);
  const leftCtx = leftCanvas.getContext("2d");
  const rightCtx = rightCanvas.getContext("2d");
  if (!leftCtx || !rightCtx) {
    return [new Uint8Array(), new Uint8Array()];
  }

  leftCtx.drawImage(canvas, 0, 0, TILE_WIDTH, STRIP_HEIGHT, 0, 0, TILE_WIDTH, STRIP_HEIGHT);
  rightCtx.drawImage(canvas, TILE_WIDTH, 0, TILE_WIDTH, STRIP_HEIGHT, 0, 0, TILE_WIDTH, STRIP_HEIGHT);

  return [canvasToBytes(leftCanvas), canvasToBytes(rightCanvas)];
}

export const COMPASS_IMAGE_WIDTH = STRIP_WIDTH;
export const COMPASS_IMAGE_HEIGHT = STRIP_HEIGHT;
export const COMPASS_IMAGE_TILE_WIDTH = TILE_WIDTH;
