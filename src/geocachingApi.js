import { bearingDegrees, bearingToCardinal, haversineDistanceKm } from "./geo.js";

export const DIRECT_GROUNDSPEAK_API_BASE_URL = "https://api.groundspeak.com";
export const OPENCACHING_API_BASE_URL = "https://www.opencaching.de/okapi";
export const OPENCACHING_CONSUMER_KEY = "2SDESnjdLc7zykb3gQBP";

const FALLBACK_CACHES = [
  {
    code: "OCDEMO01",
    name: "River View Micro",
    short_description: "Local test cache near the river bend.",
    hint2: "Look under the third bench.",
    difficulty: 2.0,
    terrain: 2.0,
    type: "Traditional",
    size2: "micro",
    latitudeOffset: 0.0007,
    longitudeOffset: 0.0002
  },
  {
    code: "OCDEMO02",
    name: "Forest Edge Box",
    short_description: "Local test cache hidden by old trees.",
    hint2: "North side of the fallen trunk.",
    difficulty: 3.0,
    terrain: 2.5,
    type: "Traditional",
    size2: "regular",
    latitudeOffset: -0.0011,
    longitudeOffset: 0.0006
  },
  {
    code: "OCDEMO03",
    name: "Town Clock Puzzle",
    short_description: "Local test puzzle cache close to the clock tower.",
    hint2: "Count the bells first.",
    difficulty: 3.5,
    terrain: 1.5,
    type: "Puzzle",
    size2: "small",
    latitudeOffset: 0.0004,
    longitudeOffset: -0.001
  }
];

const OPENCACHING_CACHE_FIELDS = [
  "code",
  "name",
  "location",
  "type",
  "status",
  "difficulty",
  "terrain",
  "size2",
  "hint2",
  "short_description",
  "description",
  "attribution_note",
  "url",
  "gc_code"
].join("|");

export class GeocacheLoadError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = "GeocacheLoadError";
  }
}

/**
 * Converts low-level WebView fetch failures into an actionable network message.
 * @param {unknown} error
 * @returns {string}
 */
export function describeGeocachingFetchError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower === "load failed" || lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return [
      "The geocache API request is blocked by the phone WebView/CORS.",
      "Check app.json network.whitelist and verify that the API returns CORS headers."
    ].join(" ");
  }

  return message;
}

/**
 * @param {ImportMeta["env"]|Record<string, string|undefined>|undefined} [env]
 * @returns {string}
 */
export function getConfiguredOpenCachingConsumerKey(env = import.meta.env) {
  return String(env?.VITE_OPENCACHING_CONSUMER_KEY ?? OPENCACHING_CONSUMER_KEY).trim();
}

/**
 * @param {ImportMeta["env"]|Record<string, string|undefined>|undefined} [env]
 * @returns {string}
 */
export function getConfiguredOpenCachingApiBaseUrl(env = import.meta.env) {
  return String(env?.VITE_OPENCACHING_API_BASE_URL ?? OPENCACHING_API_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

/**
 * Enables demo caches for local simulator/WebView testing only.
 * @param {ImportMeta["env"]|Record<string, string|boolean|undefined>|undefined} [env]
 * @returns {boolean}
 */
export function isLocalGeocacheFallbackEnabled(env = import.meta.env) {
  const rawFlag = env?.VITE_GEOCACHE_FALLBACK;
  const flag = typeof rawFlag === "string" ? rawFlag.toLowerCase() : rawFlag;
  if (flag === "0" || flag === "false") {
    return false;
  }
  if (flag === "1" || flag === "true") {
    return true;
  }
  return env?.DEV === true;
}

/**
 * @param {string} value
 * @returns {string}
 */
function stripHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {unknown} value
 * @returns {{latitude: number, longitude: number}|null}
 */
function parseCoordinatePair(value) {
  if (typeof value === "string") {
    const [lat, lon] = value.split(/[|,]/).map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitude: lat, longitude: lon };
    }
    return null;
  }

  if (value && typeof value === "object") {
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{latitude: number, longitude: number}|null}
 */
function readCoordinates(raw) {
  return (
    parseCoordinatePair(raw.location) ??
    parseCoordinatePair(raw.point) ??
    parseCoordinatePair(`${raw.latitude}|${raw.longitude}`)
  );
}

export function normalizeGeocache(raw, origin) {
  const coordinates = readCoordinates(raw);

  if (!coordinates) {
    return null;
  }

  const { latitude, longitude } = coordinates;
  const position = coordinates;
  const distanceKm = haversineDistanceKm(origin, position);
  const direction = bearingToCardinal(bearingDegrees(origin, position));
  const rawDescription = raw.short_description ?? raw.shortDescription ?? raw.description ?? "";
  const description = stripHtml(rawDescription) || "No description";
  const attribution = stripHtml(raw.attribution_note ?? "");

  return {
    id: String(raw.id ?? raw.code ?? raw.geocacheCode ?? `${latitude}:${longitude}`),
    name: raw.name ?? raw.title ?? "Unnamed geocache",
    description: attribution ? `${description} ${attribution}` : description,
    hint: raw.hint2 ?? raw.hint ?? raw.geocacheHint ?? "No hint available",
    difficulty: Number(raw.difficulty ?? 0),
    terrain: Number(raw.terrain ?? 0),
    type: raw.type ?? raw.geocacheType ?? "Unknown",
    size: raw.size2 ?? raw.size ?? raw.containerType ?? "Unknown",
    distanceKm,
    direction,
    latitude,
    longitude
  };
}

/**
 * Builds three deterministic nearby caches around the current test origin.
 * @param {{latitude: number, longitude: number}} origin
 * @returns {ReturnType<typeof normalizeGeocache>[]}
 */
export function buildFallbackGeocaches(origin) {
  return FALLBACK_CACHES.map((cache) =>
    normalizeGeocache(
      {
        ...cache,
        location: `${origin.latitude + cache.latitudeOffset}|${origin.longitude + cache.longitudeOffset}`
      },
      origin
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * @param {{apiBaseUrl?: string, origin: {latitude: number, longitude: number}, radiusKm?: number, consumerKey: string, limit?: number}} options
 * @returns {string}
 */
export function buildOpenCachingSearchUrl({
  apiBaseUrl = OPENCACHING_API_BASE_URL,
  origin,
  radiusKm = 5,
  consumerKey,
  limit = 25
}) {
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/services/caches/shortcuts/search_and_retrieve`);
  const center = `${origin.latitude}|${origin.longitude}`;
  const params = new URLSearchParams({
    consumer_key: consumerKey,
    search_method: "services/caches/search/nearest",
    search_params: JSON.stringify({
      center,
      radius: radiusKm,
      limit,
      status: "Available"
    }),
    retr_method: "services/caches/geocaches",
    retr_params: JSON.stringify({
      fields: OPENCACHING_CACHE_FIELDS,
      langpref: "de|en",
      my_location: center,
      attribution_append: "none",
      oc_team_annotation: "separate"
    }),
    wrap: "false"
  });
  url.search = params.toString();
  return url.toString();
}

/**
 * @param {unknown} payload
 * @param {{latitude: number, longitude: number}} origin
 * @param {number} radiusKm
 * @returns {ReturnType<typeof normalizeGeocache>[]}
 */
export function normalizeOpenCachingResponse(payload, origin, radiusKm) {
  const resultMap = payload?.results && typeof payload.results === "object" ? payload.results : payload;
  if (!resultMap || typeof resultMap !== "object" || Array.isArray(resultMap)) {
    throw new GeocacheLoadError("OpenCaching OKAPI returned an unsupported response shape.");
  }

  return Object.entries(resultMap)
    .map(([code, item]) => (item && typeof item === "object" ? normalizeGeocache({ code, ...item }, origin) : null))
    .filter(Boolean)
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function readApiErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload?.error?.developer_message ?? payload?.error?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function fetchNearbyGeocaches({
  origin,
  radiusKm = 5,
  apiBaseUrl = getConfiguredOpenCachingApiBaseUrl(),
  consumerKey = getConfiguredOpenCachingConsumerKey(),
  allowFallback = isLocalGeocacheFallbackEnabled(),
  fetchImpl = fetch
}) {
  if (apiBaseUrl === DIRECT_GROUNDSPEAK_API_BASE_URL) {
    throw new GeocacheLoadError(
      "Direct geocaching.com API access is not available from the EvenHub WebView because Groundspeak does not expose a CORS-compatible browser API for this app."
    );
  }

  if (!consumerKey) {
    if (allowFallback) {
      return buildFallbackGeocaches(origin);
    }

    throw new GeocacheLoadError(
      "OpenCaching OKAPI consumer key is missing. Set VITE_OPENCACHING_CONSUMER_KEY before building the packaged app."
    );
  }

  const endpoint = buildOpenCachingSearchUrl({
    apiBaseUrl,
    origin,
    radiusKm,
    consumerKey
  });

  try {
    const response = await fetchImpl(endpoint);
    if (!response.ok) {
      throw new GeocacheLoadError(`OpenCaching OKAPI returned ${await readApiErrorMessage(response)}.`);
    }

    const payload = await response.json();
    const normalized = normalizeOpenCachingResponse(payload, origin, radiusKm);

    if (Object.keys(payload?.results ?? payload ?? {}).length === 0) {
      if (allowFallback) {
        return buildFallbackGeocaches(origin);
      }
      throw new GeocacheLoadError("OpenCaching OKAPI returned no caches.");
    }

    if (normalized.length === 0) {
      if (allowFallback) {
        return buildFallbackGeocaches(origin);
      }
      throw new GeocacheLoadError(`No geocaches found within ${radiusKm}km of current GPS position.`);
    }

    return normalized;
  } catch (error) {
    if (error instanceof GeocacheLoadError) {
      if (allowFallback) {
        return buildFallbackGeocaches(origin);
      }
      throw error;
    }

    if (allowFallback) {
      return buildFallbackGeocaches(origin);
    }

    const message = describeGeocachingFetchError(error);
    throw new GeocacheLoadError(`Geocaching request failed: ${message}`);
  }
}
