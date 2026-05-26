import { SCREEN } from "./state.js";
import { dispatchScreenAction } from "./glass/selectors.js";

/**
 * Applies a list selection change from EvenHub list events.
 * If the selected index is already active, it is treated as a click surrogate
 * and opens the detail screen.
 * @param {{ screen: string, selectedIndex: number, geocaches: unknown[], showHint: boolean }} state
 * @param {number} selectionIndex
 * @returns {boolean}
 */
export function applyListSelectionChange(state, selectionIndex) {
  if (state.screen !== SCREEN.LIST) {
    return false;
  }

  if (!state.geocaches || state.geocaches.length === 0) {
    state.selectedIndex = 0;
    return false;
  }

  if (!Number.isInteger(selectionIndex)) {
    return false;
  }

  const maxIndex = Math.max(0, state.geocaches.length - 1);
  const clampedIndex = Math.min(Math.max(0, selectionIndex), maxIndex);

  if (clampedIndex === state.selectedIndex) {
    state.screen = SCREEN.DETAIL;
    state.showHint = false;
    return true;
  }

  state.selectedIndex = clampedIndex;
  return false;
}

/**
 * Applies a glasses input event to the application navigation state by
 * delegating to the per-screen action handler.
 * @param {{ screen: string, selectedIndex: number, geocaches: unknown[], showHint: boolean }} state
 * @param {"Click"|"DoubleClick"|"Up"|"Down"} input
 * @returns {void}
 */
export function applyGlassesInput(state, input) {
  dispatchScreenAction(state, input);
}
