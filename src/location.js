import { haversineDistanceKm } from "./geo.js";

export const GPS_DESIRED_ACCURACY_METERS = 5;
export const GEOCACHE_REFRESH_DISTANCE_KM = GPS_DESIRED_ACCURACY_METERS / 1000;

export const INITIAL_GEOLOCATION_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 8000
});

export const WATCH_GEOLOCATION_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 2000
});

/**
 * Converts a browser GeolocationPosition into the app's location shape.
 * @param {{ coords?: { latitude?: number, longitude?: number, accuracy?: number }, timestamp?: number }} position
 * @returns {{ latitude: number, longitude: number, accuracyMeters: number|null, updatedAt: number }}
 */
export function readGpsFix(position) {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid GPS position");
  }

  const accuracy = Number(position?.coords?.accuracy);
  const timestamp = Number(position?.timestamp);

  return {
    latitude,
    longitude,
    accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
    updatedAt: Number.isFinite(timestamp) ? timestamp : Date.now()
  };
}

/**
 * Decides when nearby-cache data should be refreshed for a moved origin.
 * @param {{ latitude: number, longitude: number }|null|undefined} loadedAt
 * @param {{ latitude: number, longitude: number }} current
 * @param {number} [thresholdKm]
 * @returns {boolean}
 */
export function shouldRefreshGeocaches(loadedAt, current, thresholdKm = GEOCACHE_REFRESH_DISTANCE_KM) {
  if (!loadedAt) {
    return true;
  }

  return haversineDistanceKm(loadedAt, current) >= thresholdKm;
}

/**
 * @param {number|null|undefined} accuracyMeters
 * @param {number} [targetMeters]
 * @returns {boolean}
 */
export function isGpsAccuracyGoodEnough(accuracyMeters, targetMeters = GPS_DESIRED_ACCURACY_METERS) {
  return Number.isFinite(accuracyMeters) && Number(accuracyMeters) <= targetMeters;
}

/**
 * Converts browser geolocation errors into actionable user-facing messages.
 * @param {unknown} error
 * @returns {string}
 */
export function describeGeolocationError(error) {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message)
    : String(error ?? "Position unavailable");
  const lower = message.toLowerCase();

  if (lower.includes("origin does not have permission")) {
    return [
      "This WebView origin is not allowed to use phone GPS.",
      "Use a packaged EvenHub build with the app.json location permission, or serve the dev URL over trusted HTTPS."
    ].join(" ");
  }

  if (lower.includes("denied") || lower.includes("permission")) {
    return "Location permission was denied. Allow location access for the Even Realities app and reload.";
  }

  if (lower.includes("timeout")) {
    return "GPS lookup timed out. Move outdoors or wait for a better phone GPS fix, then reload.";
  }

  return message || "Position unavailable";
}
