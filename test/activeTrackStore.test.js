import assert from "node:assert/strict";
import test from "node:test";
import { loadActiveTrack, normalizeActiveTrack, saveActiveTrack } from "../src/activeTrackStore.js";

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

test("normalizeActiveTrack validates fields and coordinate ranges", () => {
  const normalized = normalizeActiveTrack({
    cacheId: "GC123",
    cacheName: "Demo Cache",
    latitude: "47.11",
    longitude: "8.55"
  });
  assert.deepEqual(normalized, {
    cacheId: "GC123",
    cacheName: "Demo Cache",
    latitude: 47.11,
    longitude: 8.55
  });

  assert.equal(normalizeActiveTrack({ cacheId: "GC123", cacheName: "Demo", latitude: 190, longitude: 8 }), null);
  assert.equal(normalizeActiveTrack({ cacheId: "GC123", cacheName: "Demo", latitude: 47, longitude: 181 }), null);
});

test("saveActiveTrack persists normalized track and can clear it", () => {
  const storage = createStorage();
  const saved = saveActiveTrack(
    { cacheId: "GC55", cacheName: "Track Name", latitude: 47.3, longitude: 8.4 },
    storage
  );

  assert.equal(saved?.cacheId, "GC55");
  assert.ok(storage.getItem("even-g2.active-geotrack"));

  const cleared = saveActiveTrack(null, storage);
  assert.equal(cleared, null);
  assert.equal(storage.getItem("even-g2.active-geotrack"), null);
});

test("loadActiveTrack returns null for invalid or malformed payload", () => {
  const malformedStorage = createStorage({ "even-g2.active-geotrack": "not-json" });
  assert.equal(loadActiveTrack(malformedStorage), null);

  const invalidStorage = createStorage({
    "even-g2.active-geotrack": JSON.stringify({ cacheId: "GC1", cacheName: "X", latitude: 95, longitude: 8 })
  });
  assert.equal(loadActiveTrack(invalidStorage), null);
});
