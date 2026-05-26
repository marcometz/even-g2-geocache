import assert from "node:assert/strict";
import test from "node:test";
import { applyGlassesInput, applyListSelectionChange } from "../src/appStateMachine.js";
import { SCREEN } from "../src/state.js";

function createState(overrides = {}) {
  return {
    screen: SCREEN.LIST,
    selectedIndex: 0,
    geocaches: [{ id: "A" }, { id: "B" }],
    showHint: false,
    ...overrides
  };
}

test("list screen navigation handles Up and Down", () => {
  const state = createState({ selectedIndex: 1 });

  applyGlassesInput(state, "Up");
  assert.equal(state.selectedIndex, 0);

  applyGlassesInput(state, "Down");
  assert.equal(state.selectedIndex, 1);
});

test("list click opens detail and detail click toggles hint inline", () => {
  const state = createState();
  applyGlassesInput(state, "Click");
  assert.equal(state.screen, SCREEN.DETAIL);
  assert.equal(state.detailPhase, "scroll", "entering detail resets to scroll phase");

  applyGlassesInput(state, "Click");
  assert.equal(state.screen, SCREEN.DETAIL);
  assert.equal(state.showHint, true);
});

test("list click with no geocaches requests reload instead of opening detail", () => {
  const state = createState({ geocaches: [], reloadRequested: false });

  applyGlassesInput(state, "Click");

  assert.equal(state.screen, SCREEN.LIST);
  assert.equal(state.reloadRequested, true);
});

test("detail Down (SCROLL_BOTTOM_EVENT) switches from scroll to options phase", () => {
  const state = createState({ screen: SCREEN.DETAIL, detailPhase: "scroll" });
  applyGlassesInput(state, "Down");
  assert.equal(state.detailPhase, "options");
  assert.equal(state.screen, SCREEN.DETAIL, "stays on detail screen");
});

test("detail Up (SCROLL_TOP_EVENT) switches from options back to scroll phase", () => {
  const state = createState({ screen: SCREEN.DETAIL, detailPhase: "options" });
  applyGlassesInput(state, "Up");
  assert.equal(state.detailPhase, "scroll");
  assert.equal(state.screen, SCREEN.DETAIL, "stays on detail screen");
});

test("detail DoubleClick from options phase returns to list and resets phase", () => {
  const state = createState({ screen: SCREEN.DETAIL, detailPhase: "options" });
  applyGlassesInput(state, "DoubleClick");
  assert.equal(state.screen, SCREEN.LIST);
  assert.equal(state.detailPhase, "scroll");
});

test("detail Click in scroll phase toggles hint without leaving detail", () => {
  const state = createState({ screen: SCREEN.DETAIL, detailPhase: "scroll" });
  applyGlassesInput(state, "Click");
  assert.equal(state.screen, SCREEN.DETAIL);
  assert.equal(state.showHint, true);
});

test("detail click toggles hint on and off", () => {
  const state = createState({ screen: SCREEN.DETAIL, showHint: false, detailPhase: "scroll" });

  applyGlassesInput(state, "Click");
  assert.equal(state.showHint, true);

  applyGlassesInput(state, "Click");
  assert.equal(state.showHint, false);
});

test("selection change updates selected list index without opening detail", () => {
  const state = createState({ screen: SCREEN.LIST, selectedIndex: 0 });
  const openedDetail = applyListSelectionChange(state, 1);

  assert.equal(openedDetail, false);
  assert.equal(state.selectedIndex, 1);
  assert.equal(state.screen, SCREEN.LIST);
});

test("selection change on already selected row opens detail as click surrogate", () => {
  const state = createState({ screen: SCREEN.LIST, selectedIndex: 1 });
  const openedDetail = applyListSelectionChange(state, 1);

  assert.equal(openedDetail, true);
  assert.equal(state.screen, SCREEN.DETAIL);
});

test("selection change with no geocaches does not open detail", () => {
  const state = createState({ screen: SCREEN.LIST, geocaches: [], selectedIndex: 0 });
  const openedDetail = applyListSelectionChange(state, 0);

  assert.equal(openedDetail, false);
  assert.equal(state.screen, SCREEN.LIST);
  assert.equal(state.selectedIndex, 0);
});
