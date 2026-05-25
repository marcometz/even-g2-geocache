import assert from "node:assert/strict";
import test from "node:test";
import { computeActiveTrackMetrics, normalizeDegrees } from "../src/trackMetrics.js";

test("normalizeDegrees keeps values in 0..359", () => {
  assert.equal(normalizeDegrees(361), 1);
  assert.equal(normalizeDegrees(-10), 350);
});

test("computeActiveTrackMetrics returns distance, bearing and heading-aware values", () => {
  const metrics = computeActiveTrackMetrics(
    { latitude: 47.3769, longitude: 8.5417 },
    { cacheId: "GC1", cacheName: "Target", lat: 47.3869, lon: 8.5417 },
    15
  );

  assert.ok(metrics);
  assert.equal(metrics?.cacheId, "GC1");
  assert.equal(typeof metrics?.distanceKm, "number");
  assert.equal(typeof metrics?.bearing, "number");
  assert.equal(typeof metrics?.relativeBearing, "number");
  assert.equal(metrics?.heading, 15);
  assert.ok(metrics?.arrow);
  assert.ok((metrics?.relativeBearing ?? 0) >= -180 && (metrics?.relativeBearing ?? 0) <= 180);
});

test("computeActiveTrackMetrics returns null without active track", () => {
  const metrics = computeActiveTrackMetrics({ latitude: 1, longitude: 1 }, null, 0);
  assert.equal(metrics, null);
});
