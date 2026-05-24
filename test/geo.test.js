import assert from "node:assert/strict";
import test from "node:test";
import { bearingDegrees, bearingToCardinal, haversineDistanceKm } from "../src/geo.js";

test("haversineDistanceKm returns approximately 0 for equal points", () => {
  const point = { latitude: 47.0, longitude: 8.0 };
  assert.ok(haversineDistanceKm(point, point) < 0.001);
});

test("bearingToCardinal maps major directions", () => {
  assert.equal(bearingToCardinal(0), "N");
  assert.equal(bearingToCardinal(90), "E");
  assert.equal(bearingToCardinal(180), "S");
  assert.equal(bearingToCardinal(270), "W");
});

test("bearingDegrees stays normalized to 0..359", () => {
  const from = { latitude: 47.3769, longitude: 8.5417 };
  const to = { latitude: 47.3769, longitude: 8.5317 };
  const degrees = bearingDegrees(from, to);
  assert.ok(degrees >= 0 && degrees < 360);
});
