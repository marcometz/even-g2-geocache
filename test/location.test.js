import assert from "node:assert/strict";
import test from "node:test";
import {
  GEOCACHE_REFRESH_DISTANCE_KM,
  GPS_DESIRED_ACCURACY_METERS,
  INITIAL_GEOLOCATION_OPTIONS,
  WATCH_GEOLOCATION_OPTIONS,
  describeGeolocationError,
  isGpsAccuracyGoodEnough,
  readGpsFix,
  shouldRefreshGeocaches
} from "../src/location.js";

test("geolocation options request fresh high-accuracy fixes", () => {
  assert.equal(INITIAL_GEOLOCATION_OPTIONS.enableHighAccuracy, true);
  assert.equal(INITIAL_GEOLOCATION_OPTIONS.maximumAge, 0);
  assert.equal(WATCH_GEOLOCATION_OPTIONS.enableHighAccuracy, true);
  assert.equal(WATCH_GEOLOCATION_OPTIONS.maximumAge, 0);
  assert.ok(WATCH_GEOLOCATION_OPTIONS.timeout <= INITIAL_GEOLOCATION_OPTIONS.timeout);
});

test("cache refresh threshold is 5 meters, not the old 500 meters", () => {
  assert.equal(GPS_DESIRED_ACCURACY_METERS, 5);
  assert.equal(GEOCACHE_REFRESH_DISTANCE_KM, 0.005);

  const loadedAt = { latitude: 47.3769, longitude: 8.5417 };
  const movedAboutSixMeters = { latitude: 47.376954, longitude: 8.5417 };

  assert.equal(shouldRefreshGeocaches(loadedAt, movedAboutSixMeters), true);
});

test("cache refresh does not trigger below 5 meters", () => {
  const loadedAt = { latitude: 47.3769, longitude: 8.5417 };
  const movedAboutTwoMeters = { latitude: 47.376918, longitude: 8.5417 };

  assert.equal(shouldRefreshGeocaches(loadedAt, movedAboutTwoMeters), false);
});

test("cache refresh triggers when there is no previous load origin", () => {
  assert.equal(shouldRefreshGeocaches(null, { latitude: 47.3769, longitude: 8.5417 }), true);
});

test("readGpsFix normalizes browser geolocation positions", () => {
  const fix = readGpsFix({
    coords: { latitude: 47.3769, longitude: 8.5417, accuracy: 4.3 },
    timestamp: 1710000000000
  });

  assert.deepEqual(fix, {
    latitude: 47.3769,
    longitude: 8.5417,
    accuracyMeters: 4.3,
    updatedAt: 1710000000000
  });
});

test("readGpsFix rejects invalid coordinates", () => {
  assert.throws(
    () => readGpsFix({ coords: { latitude: Number.NaN, longitude: 8.5417, accuracy: 4 } }),
    /Invalid GPS position/
  );
});

test("GPS accuracy helper enforces the 5 meter target", () => {
  assert.equal(isGpsAccuracyGoodEnough(5), true);
  assert.equal(isGpsAccuracyGoodEnough(5.1), false);
  assert.equal(isGpsAccuracyGoodEnough(null), false);
});

test("describeGeolocationError explains blocked dev origins", () => {
  const message = describeGeolocationError({
    message: "Origin does not have permission to use Geolocation service"
  });

  assert.ok(message.includes("WebView origin"));
  assert.ok(message.includes("trusted HTTPS"));
});

test("describeGeolocationError explains denied location permission", () => {
  const message = describeGeolocationError({ message: "User denied Geolocation" });

  assert.ok(message.includes("Allow location access"));
});
