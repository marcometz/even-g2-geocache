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

test("list click opens detail and detail click opens finder", () => {
  const state = createState();
  applyGlassesInput(state, "Click");
  assert.equal(state.screen, SCREEN.DETAIL);

  applyGlassesInput(state, "Click");
  assert.equal(state.screen, SCREEN.FINDER);
});

test("finder click shows hint and double click goes back", () => {
  const state = createState({ screen: SCREEN.FINDER, showHint: false });

  applyGlassesInput(state, "Click");
  assert.equal(state.showHint, true);

  applyGlassesInput(state, "DoubleClick");
  assert.equal(state.screen, SCREEN.DETAIL);
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
