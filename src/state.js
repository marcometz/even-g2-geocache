import { moveHighlight } from "even-toolkit/glass-nav";

export const SCREEN = {
  LIST: "list",
  DETAIL: "detail"
};

/**
 * Move the selected list index by delta, delegating to even-toolkit's moveHighlight
 * for consistent clamped cursor behavior across glasses UI.
 * @param {number} currentIndex
 * @param {number} listSize
 * @param {number} delta
 * @returns {number}
 */
export function nextIndex(currentIndex, listSize, delta) {
  if (listSize < 1) {
    return 0;
  }

  const direction = delta < 0 ? "up" : "down";
  const steps = Math.abs(delta);
  let next = currentIndex;
  for (let i = 0; i < steps; i += 1) {
    next = moveHighlight(next, direction, listSize - 1);
  }
  return next;
}
