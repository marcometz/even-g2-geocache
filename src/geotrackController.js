import { SCREEN } from "./state.js";

export const DETAIL_OPTION = {
  GEOTRACK: 0,
  HINT: 1
};

/**
 * Handles detail-screen geotrack actions based on Up/Down input.
 * @param {{ screen: string, geocaches: Array<{id: string, name: string, latitude: number, longitude: number}>, selectedIndex: number, activeTrack: {cacheId: string, cacheName: string, lat: number, lon: number}|null, companionStatus: string }} state
 * @param {"Up"|"Down"|"Click"|"DoubleClick"} input
 * @param {(track: {cacheId: string, cacheName: string, lat: number, lon: number}|null) => {cacheId: string, cacheName: string, lat: number, lon: number}|null} persistTrack
 * @returns {boolean}
 */
export function handleGeoTrackInput(state, input, persistTrack) {
  if (state.screen !== SCREEN.DETAIL) {
    return false;
  }

  if (input === "Down") {
    const selected = state.geocaches[state.selectedIndex];
    if (!selected) {
      return true;
    }

    state.activeTrack = persistTrack({
      cacheId: selected.id,
      cacheName: selected.name,
      lat: selected.latitude,
      lon: selected.longitude
    });
    state.companionStatus = state.activeTrack ? "GeoTrack activated." : "GeoTrack activation failed.";
    return true;
  }

  if (input === "Up") {
    state.activeTrack = persistTrack(null);
    state.companionStatus = "GeoTrack stopped.";
    return true;
  }

  return false;
}

/**
 * Handles detail option click toggles.
 * @param {{ screen: string, detailOptionIndex: number, geocaches: Array<{id: string, name: string, latitude: number, longitude: number}>, selectedIndex: number, activeTrack: {cacheId: string, cacheName: string, lat: number, lon: number}|null, companionStatus: string, showHint: boolean }} state
 * @param {(track: {cacheId: string, cacheName: string, lat: number, lon: number}|null) => {cacheId: string, cacheName: string, lat: number, lon: number}|null} persistTrack
 * @returns {boolean}
 */
export function toggleDetailOption(state, persistTrack) {
  if (state.screen !== SCREEN.DETAIL) {
    return false;
  }

  const selected = state.geocaches[state.selectedIndex];
  if (!selected) {
    return true;
  }

  if (state.detailOptionIndex === DETAIL_OPTION.GEOTRACK) {
    const isActive = state.activeTrack?.cacheId === selected.id;
    state.activeTrack = isActive
      ? persistTrack(null)
      : persistTrack({
        cacheId: selected.id,
        cacheName: selected.name,
        lat: selected.latitude,
        lon: selected.longitude
      });

    state.companionStatus = state.activeTrack ? "GeoTrack activated." : "GeoTrack stopped.";
    return true;
  }

  if (state.detailOptionIndex === DETAIL_OPTION.HINT) {
    state.showHint = !state.showHint;
    state.companionStatus = state.showHint ? "Hint enabled." : "Hint hidden.";
    return true;
  }

  return false;
}
