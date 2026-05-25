import { nextIndex, SCREEN } from "./state.js";

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
 * Applies a glasses input event to the application navigation state.
 * @param {{ screen: string, selectedIndex: number, geocaches: unknown[], showHint: boolean }} state
 * @param {"Click"|"DoubleClick"|"Up"|"Down"} input
 * @returns {void}
 */
export function applyGlassesInput(state, input) {
  if (state.screen === SCREEN.LIST) {
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
    }
    return;
  }

  if (state.screen === SCREEN.DETAIL) {
    if (input === "DoubleClick") {
      state.screen = SCREEN.LIST;
      return;
    }

    if (input === "Click") {
      state.screen = SCREEN.FINDER;
      state.showHint = false;
    }
    return;
  }

  if (state.screen === SCREEN.FINDER) {
    if (input === "DoubleClick") {
      state.screen = SCREEN.DETAIL;
      return;
    }

    if (input === "Click") {
      state.showHint = true;
    }
  }
}
