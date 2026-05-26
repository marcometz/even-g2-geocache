import { SCREEN } from "../state.js";
import { APP_VERSION_LABEL } from "../version.js";
import * as listScreen from "./screens/list.js";
import * as detailScreen from "./screens/detail.js";
import * as compassScreen from "./screens/compass.js";

const VERSION_CONTAINER_ID = 98;
const VERSION_CONTAINER_NAME = "version";

const SCREENS = {
  [SCREEN.LIST]: listScreen,
  [SCREEN.DETAIL]: detailScreen
};

/**
 * Routes the current state to the matching screen module's display function,
 * then overlays the compass screen as a separate text container at the top so
 * it can be updated independently via `textContainerUpgrade`.
 * Falls back to the list screen for unknown screen identifiers.
 * @param {import("./shared.js").GlassSnapshot} state
 * @returns {{containerTotalNum: number, textObject?: Record<string, unknown>[], listObject?: Record<string, unknown>[], imageObject?: Record<string, unknown>[]}}
 */
export function selectScreenPayload(state) {
  const screen = SCREENS[state.screen] ?? SCREENS[SCREEN.LIST];
  const payload = screen.display(state);
  const compass = compassScreen.display(state);
  const versionOverlay = {
    xPosition: 508,
    yPosition: 252,
    width: 60,
    height: 18,
    borderWidth: 0,
    borderColor: 0,
    borderRadius: 0,
    paddingLength: 0,
    containerID: VERSION_CONTAINER_ID,
    containerName: VERSION_CONTAINER_NAME,
    content: APP_VERSION_LABEL,
    isEventCapture: 0
  };

  if (!compass) {
    const textObject = [...(payload.textObject ?? []), versionOverlay];
    const imageObject = payload.imageObject ?? [];
    const listObject = payload.listObject ?? [];
    return {
      ...payload,
      containerTotalNum: textObject.length + listObject.length + imageObject.length,
      textObject,
      ...(imageObject.length > 0 ? { imageObject } : {}),
      ...(listObject.length > 0 ? { listObject } : {})
    };
  }

  const compassTextObjects = compass.textObject ?? [];
  const compassImageObjects = compass.imageObject ?? [];
  const textObject = [...compassTextObjects, ...(payload.textObject ?? []), versionOverlay];
  const imageObject = [...compassImageObjects, ...(payload.imageObject ?? [])];
  const listObject = payload.listObject ?? [];
  return {
    ...payload,
    containerTotalNum: textObject.length + listObject.length + imageObject.length,
    textObject,
    ...(imageObject.length > 0 ? { imageObject } : {}),
    ...(listObject.length > 0 ? { listObject } : {})
  };
}

/**
 * Dispatches a navigation input to the action handler of the active screen.
 * @param {import("./shared.js").GlassSnapshot} state
 * @param {"Click"|"DoubleClick"|"Up"|"Down"} input
 * @returns {void}
 */
export function dispatchScreenAction(state, input) {
  const screen = SCREENS[state.screen];
  if (screen && typeof screen.action === "function") {
    screen.action(state, input);
  }
}
