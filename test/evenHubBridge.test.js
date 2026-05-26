import assert from "node:assert/strict";
import test from "node:test";
import { EvenHubBridgeClient } from "../src/bridge/evenHubBridge.js";

test("updateImage returns false when hardware bridge stalls", async () => {
  const client = new EvenHubBridgeClient();
  client.ready = true;
  client.bridge = {
    updateImageRawData: () => new Promise(() => {})
  };

  const start = Date.now();
  const result = await client.updateImage({
    containerID: 11,
    containerName: "compass-image-left",
    imageData: new Uint8Array([0])
  });
  const elapsed = Date.now() - start;

  assert.equal(result, false);
  assert.ok(elapsed < 1000, `timeout fallback should return quickly, got ${elapsed}ms`);
});
