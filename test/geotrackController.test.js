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

test("Down in detail no longer activates geotrack (use option click instead)", () => {
  const state = createState();
  const handled = handleGeoTrackInput(state, "Down", (track) => track);

  assert.equal(handled, false);
  assert.equal(state.activeTrack, null);
});

test("Up in detail no longer stops geotrack (use option click instead)", () => {
  const state = createState({
    activeTrack: { cacheId: "GC2", cacheName: "Cache Two", lat: 47.2, lon: 8.6 }
  });

  const handled = handleGeoTrackInput(state, "Up", () => null);
  assert.equal(handled, false);
  // track unchanged because handleGeoTrackInput is now a no-op
  assert.ok(state.activeTrack !== null);
});

test("non-detail screen does not consume geotrack inputs", () => {
  const state = createState({ screen: SCREEN.LIST });
  const handled = handleGeoTrackInput(state, "Down", (track) => track);
  assert.equal(handled, false);
});

test("handleGeoTrackInput is a no-op for all inputs", () => {
  const state = createState();
  for (const input of ["Up", "Down", "Click", "DoubleClick"]) {
    assert.equal(handleGeoTrackInput(state, input, (t) => t), false);
  }
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
