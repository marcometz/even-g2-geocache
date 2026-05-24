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
  const lat = normalizeCoordinate(raw.lat, { min: -90, max: 90 });
  const lon = normalizeCoordinate(raw.lon, { min: -180, max: 180 });

  if (!cacheId || !cacheName || lat === null || lon === null) {
    return null;
  }

  return { cacheId, cacheName, lat, lon };
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
