import { selectScreenPayload } from "./glass/selectors.js";

/**
 * Builds the EvenHub container payload for the current app state.
 * Public facade — delegates to the per-screen architecture in `src/glass/`.
 * @param {import("./glass/shared.js").GlassSnapshot} state
 * @returns {{containerTotalNum: number, textObject?: Record<string, unknown>[], listObject?: Record<string, unknown>[], imageObject?: Record<string, unknown>[]}}
 */
export function buildGlassesLayout(state) {
  return selectScreenPayload(state);
}
