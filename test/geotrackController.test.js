import assert from "node:assert/strict";
import test from "node:test";
import { DETAIL_OPTION, handleGeoTrackInput, toggleDetailOption } from "../src/geotrackController.js";
import { SCREEN } from "../src/state.js";

function createState(overrides = {}) {
  return {
    screen: SCREEN.DETAIL,
    geocaches: [
      { id: "GC1", name: "Cache One", latitude: 47.1, longitude: 8.5 },
      { id: "GC2", name: "Cache Two", latitude: 47.2, longitude: 8.6 }
    ],
    selectedIndex: 1,
    detailOptionIndex: DETAIL_OPTION.GEOTRACK,
    activeTrack: null,
    companionStatus: "",
    showHint: false,
    ...overrides
  };
}

test("Down in detail activates selected geotrack", () => {
  const state = createState();
  const handled = handleGeoTrackInput(state, "Down", (track) => track);

  assert.equal(handled, true);
  assert.equal(state.activeTrack?.cacheId, "GC2");
  assert.equal(state.companionStatus, "GeoTrack activated.");
});

test("Up in detail stops active geotrack", () => {
  const state = createState({
    activeTrack: { cacheId: "GC2", cacheName: "Cache Two", lat: 47.2, lon: 8.6 }
  });

  const handled = handleGeoTrackInput(state, "Up", () => null);
  assert.equal(handled, true);
  assert.equal(state.activeTrack, null);
  assert.equal(state.companionStatus, "GeoTrack stopped.");
});

test("non-detail screen does not consume geotrack inputs", () => {
  const state = createState({ screen: SCREEN.LIST });
  const handled = handleGeoTrackInput(state, "Down", (track) => track);
  assert.equal(handled, false);
});

test("detail option click toggles geotrack", () => {
  const state = createState({ detailOptionIndex: DETAIL_OPTION.GEOTRACK, selectedIndex: 0 });
  const toggled = toggleDetailOption(state, (track) => track);

  assert.equal(toggled, true);
  assert.equal(state.activeTrack?.cacheId, "GC1");
});

test("detail option click toggles hint flag", () => {
  const state = createState({ detailOptionIndex: DETAIL_OPTION.HINT, showHint: false });
  const toggled = toggleDetailOption(state, (track) => track);

  assert.equal(toggled, true);
  assert.equal(state.showHint, true);
});
