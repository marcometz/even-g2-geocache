import assert from "node:assert/strict";
import test from "node:test";
import { fetchNearbyGeocaches, normalizeGeocache } from "../src/geocachingApi.js";

const origin = { latitude: 47.3769, longitude: 8.5417 };

test("normalizeGeocache maps API payload to app model", () => {
  const normalized = normalizeGeocache(
    {
      code: "GC123",
      name: "Test Cache",
      shortDescription: "Test Description",
      geocacheHint: "Test Hint",
      difficulty: 2,
      terrain: 3,
      type: "Traditional",
      size: "Micro",
      latitude: 47.38,
      longitude: 8.54
    },
    origin
  );

  assert.equal(normalized.id, "GC123");
  assert.equal(normalized.name, "Test Cache");
  assert.equal(normalized.direction.length > 0, true);
});

test("fetchNearbyGeocaches falls back to demo data on API failure", async () => {
  const failingFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const caches = await fetchNearbyGeocaches({ origin, fetchImpl: failingFetch });
  assert.ok(caches.length > 0);
  assert.ok(caches.every((cache) => cache.distanceKm <= 5));
});
