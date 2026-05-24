const ACTIVE_TRACK_KEY = "even-g2.active-geotrack";

function normalizeCoordinate(value, { min, max }) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return null;
  }
  return number;
}

export function normalizeActiveTrack(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const cacheId = String(raw.cacheId ?? "").trim();
  const cacheName = String(raw.cacheName ?? "").trim();
  const latitude = normalizeCoordinate(raw.latitude, { min: -90, max: 90 });
  const longitude = normalizeCoordinate(raw.longitude, { min: -180, max: 180 });

  if (!cacheId || !cacheName || latitude === null || longitude === null) {
    return null;
  }

  return { cacheId, cacheName, latitude, longitude };
}

export function loadActiveTrack(storage = globalThis.localStorage) {
  try {
    if (!storage) {
      return null;
    }
    const serialized = storage.getItem(ACTIVE_TRACK_KEY);
    if (!serialized) {
      return null;
    }
    return normalizeActiveTrack(JSON.parse(serialized));
  } catch {
    return null;
  }
}

export function saveActiveTrack(track, storage = globalThis.localStorage) {
  try {
    if (!storage) {
      return null;
    }

    if (!track) {
      storage.removeItem(ACTIVE_TRACK_KEY);
      return null;
    }

    const normalized = normalizeActiveTrack(track);
    if (!normalized) {
      return null;
    }

    storage.setItem(ACTIVE_TRACK_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}
