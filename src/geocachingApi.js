import { bearingDegrees, bearingToCardinal, haversineDistanceKm } from "./geo.js";

const FALLBACK_CACHES = [
  {
    id: "GCDEMO01",
    name: "River View Micro",
    description: "Scenic geocache near the river bend.",
    hint: "Look under the third bench.",
    difficulty: 2.0,
    terrain: 2.0,
    type: "Traditional",
    size: "Micro",
    latitudeOffset: 0.008,
    longitudeOffset: 0.003
  },
  {
    id: "GCDEMO02",
    name: "Forest Edge Box",
    description: "Regular cache hidden by old trees.",
    hint: "North side of the fallen trunk.",
    difficulty: 3.0,
    terrain: 2.5,
    type: "Traditional",
    size: "Regular",
    latitudeOffset: -0.009,
    longitudeOffset: 0.007
  },
  {
    id: "GCDEMO03",
    name: "Town Clock Puzzle",
    description: "Puzzle cache with final close to the clock tower.",
    hint: "Count the bells first.",
    difficulty: 3.5,
    terrain: 1.5,
    type: "Puzzle",
    size: "Small",
    latitudeOffset: 0.004,
    longitudeOffset: -0.01
  }
];

export function normalizeGeocache(raw, origin) {
  const latitude = Number(raw.latitude ?? raw.location?.latitude ?? raw.point?.latitude);
  const longitude = Number(raw.longitude ?? raw.location?.longitude ?? raw.point?.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const position = { latitude, longitude };
  const distanceKm = haversineDistanceKm(origin, position);
  const direction = bearingToCardinal(bearingDegrees(origin, position));

  return {
    id: String(raw.id ?? raw.code ?? raw.geocacheCode ?? `${latitude}:${longitude}`),
    name: raw.name ?? raw.title ?? "Unnamed geocache",
    description: raw.shortDescription ?? raw.description ?? "No description",
    hint: raw.hint ?? raw.geocacheHint ?? "No hint available",
    difficulty: Number(raw.difficulty ?? 0),
    terrain: Number(raw.terrain ?? 0),
    type: raw.type ?? raw.geocacheType ?? "Unknown",
    size: raw.size ?? raw.containerType ?? "Unknown",
    distanceKm,
    direction,
    latitude,
    longitude
  };
}

function fallbackGeocaches(origin) {
  return FALLBACK_CACHES.map((cache) =>
    normalizeGeocache(
      {
        ...cache,
        latitude: origin.latitude + cache.latitudeOffset,
        longitude: origin.longitude + cache.longitudeOffset
      },
      origin
    )
  ).filter(Boolean);
}

export async function fetchNearbyGeocaches({
  origin,
  radiusKm = 5,
  apiBaseUrl = "https://api.groundspeak.com",
  authToken = "",
  fetchImpl = fetch
}) {
  const endpoint = `${apiBaseUrl}/LiveV6Geocaching.svc/SearchForGeocaches?origin=${origin.latitude},${origin.longitude}&radius=${radiusKm}&take=25`;
  try {
    const response = await fetchImpl(endpoint, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    if (!response.ok) {
      throw new Error(`Failed geocaching request: ${response.status}`);
    }

    const payload = await response.json();
    const items = payload?.results ?? payload?.data ?? payload?.geocaches ?? payload ?? [];

    const normalized = items
      .map((item) => normalizeGeocache(item, origin))
      .filter(Boolean)
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // fallback to demo content for local development or API access limitations
  }

  return fallbackGeocaches(origin).sort((a, b) => a.distanceKm - b.distanceKm);
}
