import assert from "node:assert/strict";
import test from "node:test";
import { mapEvenHubEvent, readListSelection, readListSelectionIndex } from "../src/input/evenHubEventMapper.js";

const resolver = {
  fromJson(value) {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return undefined;
  }
};

test("maps numeric event types to navigation inputs", () => {
  assert.equal(mapEvenHubEvent({ sysEvent: { eventType: 1 } }, resolver), "Up");
  assert.equal(mapEvenHubEvent({ sysEvent: { eventType: 2 } }, resolver), "Down");
  assert.equal(mapEvenHubEvent({ sysEvent: { eventType: 3 } }, resolver), "DoubleClick");
});

test("maps string event types", () => {
  assert.equal(mapEvenHubEvent({ textEvent: { eventType: "0" } }, resolver), "Click");
});

test("regression: falls back to Click when event branch exists without explicit type", () => {
  assert.equal(mapEvenHubEvent({ sysEvent: {} }, resolver), "Click");
});

test("extracts selection index from list event payload", () => {
  assert.equal(
    readListSelectionIndex({ listEvent: { currentSelectItemIndex: 3 } }),
    3
  );
});

test("extracts selection metadata including container name", () => {
  const selection = readListSelection({
    listEvent: { containerName: "detail-options", currentSelectItemIndex: 1 }
  });

  assert.equal(selection?.containerName, "detail-options");
  assert.equal(selection?.index, 1);
});

test("regression: selection events do not map to Click", () => {
  assert.equal(
    mapEvenHubEvent({ listEvent: { currentSelectItemIndex: 2 } }, resolver),
    null
  );
});
