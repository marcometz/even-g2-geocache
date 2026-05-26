import { clampLabel } from "../shared.js";
import { COMPASS_HEIGHT } from "./compass.js";
import { SCREEN, nextIndex } from "../../state.js";

export const LIST_CONTAINER_ID = 2;
export const LIST_CONTAINER_NAME = "cache-list";

/** Number of cache rows visible at one time in the fake-button list. */
const VISIBLE_COUNT = 5;

/**
 * Computes the start index of the visible window so the selected item is
 * always shown, centred where possible.
 * @param {number} selectedIndex
 * @param {number} totalCount
 * @returns {number}
 */
function computeWindowStart(selectedIndex, totalCount) {
  const maxStart = Math.max(0, totalCount - VISIBLE_COUNT);
  const halfWindow = Math.floor(VISIBLE_COUNT / 2);
  return Math.min(Math.max(0, selectedIndex - halfWindow), maxStart);
}

/**
 * Builds the fake-button list content string for the current state.
 * The selected cache is prefixed with `>`, others with a space.
 * Scroll-indicator lines are appended/prepended when the window does not
 * cover all items.
 *
 * Exported so `app.js` can call `textContainerUpgrade` cheaply on Up/Down
 * without triggering a full page rebuild.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {string}
 */
export function buildListContent(state) {
  const { geocaches, selectedIndex, geocacheLoadError, geocachesLoading } = state;

  if (geocachesLoading) {
    return [
      "  Loading geocaches...",
      "",
      "  Waiting for API response."
    ].join("\n");
  }

  if (!geocaches || geocaches.length === 0) {
    const reason = geocacheLoadError
      ? clampLabel(geocacheLoadError, 150)
      : "No geocaches loaded.";
    return [
      "  No geocaches available.",
      `  Reason: ${reason}`,
      "",
      "> Reload"
    ].join("\n");
  }

  const windowStart = computeWindowStart(selectedIndex, geocaches.length);
  const windowEnd = Math.min(windowStart + VISIBLE_COUNT, geocaches.length);
  const lines = [];

  if (windowStart > 0) {
    lines.push(`  \u2191 ${windowStart} more above`);
  }

  for (let i = windowStart; i < windowEnd; i++) {
    const cache = geocaches[i];
    const cursor = i === selectedIndex ? ">" : " ";
    const name = clampLabel(cache.name, 26).padEnd(26);
    const dist = `${cache.direction} ${cache.distanceKm.toFixed(2)}km`;
    const marker = state.activeTrack?.cacheId === cache.id ? " \u25b6" : "";
    lines.push(`${cursor} ${name} ${dist}${marker}`);
  }

  const remaining = geocaches.length - windowEnd;
  if (remaining > 0) {
    lines.push(`  \u2193 ${remaining} more below`);
  }

  return lines.join("\n");
}

/**
 * List screen — fake-button text container replaces the native list widget.
 * Scroll-takeover is avoided; `>` cursor tracks selectedIndex; Up/Down
 * updates are cheap via `textContainerUpgrade` in app.js.
 * The compass header is overlaid by the selector as a separate container.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {{containerTotalNum: number, textObject: Record<string, unknown>[]}}
 */
export function display(state) {
  const topY = state.activeTrackMetrics ? COMPASS_HEIGHT : 0;
  const titleHeight = 32;
  const listY = topY + titleHeight;
  const listHeight = 288 - listY;

  const trackSuffix = !state.activeTrackMetrics && state.activeTrack
    ? ` | TRACK ${clampLabel(state.activeTrack.cacheName, 20)}`
    : "";

  return {
    containerTotalNum: 2,
    textObject: [
      {
        xPosition: 0,
        yPosition: topY,
        width: 576,
        height: titleHeight,
        borderWidth: 0,
        borderColor: 0,
        borderRadius: 0,
        paddingLength: 2,
        containerID: 1,
        containerName: "title",
        content: `GEOCACHE - LIST (${state.geocaches.length})${trackSuffix}`,
        isEventCapture: 0
      },
      {
        xPosition: 0,
        yPosition: listY,
        width: 576,
        height: listHeight,
        borderWidth: 1,
        borderColor: 5,
        borderRadius: 6,
        paddingLength: 4,
        containerID: LIST_CONTAINER_ID,
        containerName: LIST_CONTAINER_NAME,
        content: buildListContent(state),
        isEventCapture: 1
      }
    ]
  };
}

/**
 * Navigation actions for the list screen.
 * @param {import("../shared.js").GlassSnapshot} state
 * @param {"Click"|"DoubleClick"|"Up"|"Down"} input
 * @returns {void}
 */
export function action(state, input) {
  if (!state.geocaches || state.geocaches.length === 0) {
    state.selectedIndex = 0;
    if (input === "Click" && !state.geocachesLoading) {
      state.reloadRequested = true;
    }
    return;
  }

  if (input === "Up") {
    state.selectedIndex = nextIndex(state.selectedIndex, state.geocaches.length, -1);
    return;
  }

  if (input === "Down") {
    state.selectedIndex = nextIndex(state.selectedIndex, state.geocaches.length, 1);
    return;
  }

  if (input === "Click") {
    state.screen = SCREEN.DETAIL;
    state.showHint = false;
    state.detailPhase = "scroll";
  }
}
