import { buildDetailText, buildOptionsFakeButtons } from "../shared.js";
import { COMPASS_HEIGHT } from "./compass.js";
import { SCREEN } from "../../state.js";

export const OPTIONS_CONTAINER_ID = 5;
export const OPTIONS_CONTAINER_NAME = "detail-options";
const DETAIL_TOP_GAP = 12;

/**
 * Detail screen — two phases:
 *
 * Phase "scroll" (default on entry):
 *   Full-height text container with isEventCapture=1 so the firmware scrolls
 *   it internally. SCROLL_BOTTOM_EVENT (mapped to "Down") switches to "options".
 *
 * Phase "options":
 *   Same full-height text container (isEventCapture=1) showing bracketed cache
 *   name, separator, and fake-button action items with `>` cursor.
 *   Up/Down moves the cursor; Up at index 0 returns to "scroll".
 *   Click triggers the highlighted action (handled by toggleDetailOption in app.js).
 *
 * The compass header is overlaid by the selector as a separate container.
 * @param {import("../shared.js").GlassSnapshot} state
 * @returns {{containerTotalNum: number, textObject: Record<string, unknown>[]}}
 */
export function display(state) {
  const selected = state.geocaches[state.selectedIndex];
  const topY = state.activeTrackMetrics ? COMPASS_HEIGHT + DETAIL_TOP_GAP : 0;
  const isOptions = state.detailPhase === "options";
  const textHeight = 288 - topY;

  return {
    containerTotalNum: 1,
    textObject: [
      {
        xPosition: 0,
        yPosition: topY,
        width: 576,
        height: textHeight,
        borderWidth: 1,
        borderColor: 5,
        borderRadius: 6,
        paddingLength: 4,
        containerID: isOptions ? OPTIONS_CONTAINER_ID : 3,
        containerName: isOptions ? OPTIONS_CONTAINER_NAME : "detail",
        content: isOptions
          ? buildOptionsFakeButtons(selected, state.activeTrack, state.showHint, state.detailOptionIndex)
          : buildDetailText(selected, state.activeTrack, state.showHint),
        isEventCapture: 1
      }
    ]
  };
}

/**
 * Navigation actions for the detail screen.
 *
 * Scroll phase:
 *   Down (SCROLL_BOTTOM_EVENT) → switch to options phase (cursor reset to 0).
 *   Click → toggle hint inline on the detail screen.
 *   DoubleClick → back to List.
 *
 * Options phase:
 *   Up at cursor 0 → switch back to scroll phase.
 *   Up at cursor > 0 → move cursor up.
 *   Down → move cursor down (clamped to 1).
 *   Click → handled by toggleDetailOption in app.js before this is reached.
 *   DoubleClick → back to List.
 * @param {import("../shared.js").GlassSnapshot} state
 * @param {"Click"|"DoubleClick"|"Up"|"Down"} input
 * @returns {void}
 */
export function action(state, input) {
  if (input === "DoubleClick") {
    state.screen = SCREEN.LIST;
    state.detailPhase = "scroll";
    return;
  }

  if (state.detailPhase === "options") {
    if (input === "Up") {
      if (state.detailOptionIndex > 0) {
        state.detailOptionIndex--;
      } else {
        state.detailPhase = "scroll";
      }
    } else if (input === "Down") {
      state.detailOptionIndex = Math.min(1, state.detailOptionIndex + 1);
    }
    return;
  }

  // Scroll phase
  if (input === "Down") {
    state.detailPhase = "options";
    state.detailOptionIndex = 0;
    return;
  }

  if (input === "Click") {
    state.showHint = !state.showHint;
  }
}
