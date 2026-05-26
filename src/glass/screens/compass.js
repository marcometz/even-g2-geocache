import {
  COMPASS_IMAGE_HEIGHT,
  COMPASS_IMAGE_TILE_WIDTH,
  COMPASS_IMAGE_WIDTH,
  renderCompassImageBytes
} from "../compassImage.js";

/**
 * Compass overlay screen.
 *
 * The compass is rendered as its OWN text container so it can be refreshed
 * independently from the underlying screen via `textContainerUpgrade`. This
 * avoids full-page rebuilds (flicker on hardware) and keeps the 1Hz tick cheap.
 *
 * Glass invariants honoured (see g2_reference skill):
 *  - `isEventCapture = 0` on the compass container; each host screen keeps the
 *    single capture container.
 *  - Stable `containerID`/`containerName` so partial updates target it exactly.
 *  - Height padded to fit the 4-line compass output without clipping.
 */
export const COMPASS_CONTAINER_ID = 10;
export const COMPASS_CONTAINER_NAME = "compass-frame";
export const COMPASS_HEIGHT = 62;
export const COMPASS_IMAGE_CONTAINER_ID = 11;
export const COMPASS_IMAGE_CONTAINER_NAME = "compass-image";

/**
 * Builds a stable summary token for change detection of the image compass.
 * Returns an empty string when no active track metrics are available.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {string}
 */
export function getCompassContent(state) {
  const metrics = state?.activeTrackMetrics;
  if (!metrics) {
    return "";
  }

  return [
    metrics.cacheName,
    metrics.direction,
    metrics.distanceKm.toFixed(3),
    Math.round(metrics.bearing),
    Math.round(metrics.heading),
    Math.round(Number.isFinite(metrics.relativeBearing) ? metrics.relativeBearing : 0)
  ].join("|");
}

/**
 * Splits the rendered compass into individual lines.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {string[]}
 */
export function getCompassLines(state) {
  const content = getCompassContent(state);
  return content ? content.split("\n") : [];
}

/**
 * Builds PNG bytes for the image-based compass.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {Uint8Array}
 */
export function getCompassImageBytes(state) {
  return state?.activeTrackMetrics ? renderCompassImageBytes(state.activeTrackMetrics) : new Uint8Array();
}

/**
 * Returns the compass overlay container payloads, or null when there is no
 * active geotrack metrics snapshot to render.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {{ textObject: Record<string, unknown>[], imageObject: Record<string, unknown>[], containerTotalNum: number }|null}
 */
export function display(state) {
  const content = getCompassContent(state);
  if (!content) {
    return null;
  }

  const framePadding = 8;
  const frameWidth = COMPASS_IMAGE_WIDTH + framePadding * 2;
  const frameX = Math.round((576 - frameWidth) / 2);
  const imageX = frameX + framePadding;

  return {
    containerTotalNum: 2,
    textObject: [
      {
        xPosition: frameX,
        yPosition: 0,
        width: frameWidth,
        height: COMPASS_HEIGHT,
        borderWidth: 1,
        borderColor: 5,
        borderRadius: 6,
        paddingLength: 0,
        containerID: COMPASS_CONTAINER_ID,
        containerName: COMPASS_CONTAINER_NAME,
        content: "",
        isEventCapture: 0
      }
    ],
    imageObject: [
      {
        xPosition: imageX,
        yPosition: 6,
        width: COMPASS_IMAGE_TILE_WIDTH,
        height: COMPASS_IMAGE_HEIGHT,
        containerID: COMPASS_IMAGE_CONTAINER_ID,
        containerName: COMPASS_IMAGE_CONTAINER_NAME
      }
    ]
  };
}

/**
 * The compass overlay does not consume any user input.
 * @returns {void}
 */
export function action() {
  // Intentionally empty — compass is a passive overlay.
}

/**
 * Pushes the latest image-based compass into the existing image container.
 * @param {{ updateImage: (payload: Record<string, unknown>) => Promise<unknown> }} bridge
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {Promise<void>}
 */
export async function pushCompassImage(bridge, state) {
  const imageData = getCompassImageBytes(state);
  if (!imageData.length) {
    return;
  }

  await bridge.updateImage({
    containerID: COMPASS_IMAGE_CONTAINER_ID,
    containerName: COMPASS_IMAGE_CONTAINER_NAME,
    imageData
  });
}

/**
 * Starts a 1Hz ticker that refreshes ONLY the image compass via
 * `updateImageRawData`. Safe to call multiple times — the previous ticker is
 * stopped first. Returns a stop function.
 *
 * @param {{
 *   bridge: { updateImage: (payload: Record<string, unknown>) => Promise<unknown> },
 *   getState: () => import("../shared.js").GlassSnapshot,
 *   isStartupRendered?: () => boolean,
 *   refreshMetrics?: () => void,
 *   getLastInputAt?: () => number,
 *   suppressAfterInputMs?: number,
 *   intervalMs?: number,
 *   scheduler?: { setInterval: typeof setInterval, clearInterval: typeof clearInterval }
 * }} options
 * @returns {() => void}
 */
export function startCompassTicker(options) {
  const {
    bridge,
    getState,
    isStartupRendered = () => true,
    refreshMetrics = null,
    getLastInputAt = () => 0,
    suppressAfterInputMs = 700,
    intervalMs = 500,
    scheduler = { setInterval, clearInterval }
  } = options;

  let lastContent = "";
  let inFlight = false;

  const handle = scheduler.setInterval(async () => {
    if (!isStartupRendered() || inFlight) {
      return;
    }

    // Pause compass updates during and immediately after user input.
    // BLE textContainerUpgrade commands can occupy the BLE channel and cause
    // click/double-click events to be dropped when they arrive concurrently.
    if (Date.now() - getLastInputAt() < suppressAfterInputMs) {
      return;
    }

    // Proactively recompute metrics from the latest heading/GPS so the ticker
    // always reflects current state even if an event callback hasn't fired yet.
    refreshMetrics?.();

    const state = getState();
    const content = getCompassContent(state);
    if (!content || content === lastContent) {
      return;
    }

    inFlight = true;
    try {
      await pushCompassImage(bridge, state);
      lastContent = content;
    } catch {
      // Swallow transient bridge errors — next tick retries.
    } finally {
      inFlight = false;
    }
  }, intervalMs);

  return () => scheduler.clearInterval(handle);
}
