import assert from "node:assert/strict";
import test from "node:test";
import {
  DIRECT_GROUNDSPEAK_API_BASE_URL,
  GeocacheLoadError,
  OPENCACHING_API_BASE_URL,
  OPENCACHING_CONSUMER_KEY,
  buildFallbackGeocaches,
  buildOpenCachingSearchUrl,
  describeGeocachingFetchError,
  fetchNearbyGeocaches,
  getConfiguredOpenCachingApiBaseUrl,
  getConfiguredOpenCachingConsumerKey,
  isLocalGeocacheFallbackEnabled,
  normalizeGeocache,
  normalizeOpenCachingResponse
} from "../src/geocachingApi.js";

const origin = { latitude: 47.3769, longitude: 8.5417 };
const consumerKey = "test-consumer-key";

test("normalizeGeocache maps OKAPI payload to app model", () => {
  const normalized = normalizeGeocache(
    {
      code: "OC123",
      name: "Test Cache",
      short_description: "Test Description",
      hint2: "Test Hint",
      difficulty: 2,
      terrain: 3,
      type: "Traditional",
      size2: "micro",
      location: "47.38|8.54",
      attribution_note: "<a href=\"https://www.opencaching.de\">OpenCaching.DE</a>"
    },
    origin
  );

  assert.equal(normalized.id, "OC123");
  assert.equal(normalized.name, "Test Cache");
  assert.equal(normalized.description.includes("OpenCaching.DE"), true);
  assert.equal(normalized.hint, "Test Hint");
  assert.equal(normalized.size, "micro");
  assert.equal(normalized.direction.length > 0, true);
});

test("buildOpenCachingSearchUrl creates a browser-safe OKAPI request", () => {
  const url = new URL(buildOpenCachingSearchUrl({ origin, radiusKm: 5, consumerKey }));
  const searchParams = JSON.parse(url.searchParams.get("search_params"));
  const retrParams = JSON.parse(url.searchParams.get("retr_params"));

  assert.equal(url.origin + url.pathname, `${OPENCACHING_API_BASE_URL}/services/caches/shortcuts/search_and_retrieve`);
  assert.equal(url.searchParams.get("consumer_key"), consumerKey);
  assert.equal(url.searchParams.get("search_method"), "services/caches/search/nearest");
  assert.equal(searchParams.center, "47.3769|8.5417");
  assert.equal(searchParams.radius, 5);
  assert.equal(retrParams.fields.includes("hint2"), true);
  assert.equal(url.searchParams.get("wrap"), "false");
});

test("getConfiguredOpenCachingConsumerKey reads Vite env", () => {
  assert.equal(getConfiguredOpenCachingConsumerKey({ VITE_OPENCACHING_CONSUMER_KEY: " key-123 " }), "key-123");
  assert.equal(getConfiguredOpenCachingConsumerKey({}), OPENCACHING_CONSUMER_KEY);
});

test("getConfiguredOpenCachingApiBaseUrl reads Vite env and trims trailing slash", () => {
  assert.equal(
    getConfiguredOpenCachingApiBaseUrl({ VITE_OPENCACHING_API_BASE_URL: " https://opencache.uk/okapi/ " }),
    "https://opencache.uk/okapi"
  );
  assert.equal(getConfiguredOpenCachingApiBaseUrl({}), OPENCACHING_API_BASE_URL);
});

test("isLocalGeocacheFallbackEnabled defaults to Vite dev mode and supports explicit override", () => {
  assert.equal(isLocalGeocacheFallbackEnabled({ DEV: true }), true);
  assert.equal(isLocalGeocacheFallbackEnabled({ DEV: true, VITE_GEOCACHE_FALLBACK: "0" }), false);
  assert.equal(isLocalGeocacheFallbackEnabled({ DEV: false, VITE_GEOCACHE_FALLBACK: "1" }), true);
  assert.equal(isLocalGeocacheFallbackEnabled({ DEV: false }), false);
});

test("buildFallbackGeocaches returns three nearby local test caches", () => {
  const caches = buildFallbackGeocaches(origin);

  assert.equal(caches.length, 3);
  assert.deepEqual(caches.map((cache) => cache.id), ["OCDEMO01", "OCDEMO03", "OCDEMO02"]);
  assert.ok(caches.every((cache) => cache.distanceKm < 0.2));
});

test("normalizeOpenCachingResponse returns sorted OKAPI data within radius", () => {
  const caches = normalizeOpenCachingResponse(
    {
      "OC-FAR": {
        name: "Too Far",
        location: "48.3769|8.5417"
      },
      "OC-NEAR": {
        name: "Near Cache",
        location: "47.377|8.5417"
      }
    },
    origin,
    5
  );

  assert.equal(caches.length, 1);
  assert.equal(caches[0].id, "OC-NEAR");
});

test("fetchNearbyGeocaches calls OpenCaching OKAPI without custom headers", async () => {
  let requestedUrl = "";
  let requestedOptions;
  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return {
      ok: true,
      json: async () => ({
        "OC-NEAR": {
          name: "Near Cache",
          short_description: "Nearby OpenCaching listing",
          location: "47.377|8.5417",
          difficulty: 1,
          terrain: 1,
          type: "Traditional",
          size2: "small"
        }
      })
    };
  };

  const caches = await fetchNearbyGeocaches({
    origin,
    radiusKm: 5,
    consumerKey,
    fetchImpl
  });

  const url = new URL(requestedUrl);
  assert.equal(url.origin, "https://www.opencaching.de");
  assert.equal(url.searchParams.get("consumer_key"), consumerKey);
  assert.equal(requestedOptions, undefined);
  assert.equal(caches.length, 1);
  assert.equal(caches[0].id, "OC-NEAR");
});

test("fetchNearbyGeocaches explains a missing OpenCaching consumer key", async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return { ok: true, json: async () => ({}) };
  };

  await assert.rejects(
    () => fetchNearbyGeocaches({ origin, consumerKey: "", fetchImpl }),
    /VITE_OPENCACHING_CONSUMER_KEY/
  );
  assert.equal(called, false);
});

test("fetchNearbyGeocaches can use fallback caches for local testing without API access", async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    throw new TypeError("Load failed");
  };

  const caches = await fetchNearbyGeocaches({
    origin,
    consumerKey: "",
    allowFallback: true,
    fetchImpl
  });

  assert.equal(caches.length, 3);
  assert.equal(called, false, "missing key uses local fallback before fetch");
});

test("fetchNearbyGeocaches falls back to local test caches when local API request fails", async () => {
  const fetchImpl = async () => {
    throw new TypeError("Load failed");
  };

  const caches = await fetchNearbyGeocaches({
    origin,
    consumerKey,
    allowFallback: true,
    fetchImpl
  });

  assert.equal(caches.length, 3);
  assert.equal(caches[0].id.startsWith("OCDEMO"), true);
});

test("fetchNearbyGeocaches throws instead of falling back to demo data on API failure", async () => {
  const failingFetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      error: {
        developer_message: "This method requires the consumer_key argument."
      }
    })
  });

  await assert.rejects(
    () => fetchNearbyGeocaches({ origin, consumerKey, allowFallback: false, fetchImpl: failingFetch }),
    (error) => error instanceof GeocacheLoadError && error.message.includes("consumer_key")
  );
});

test("fetchNearbyGeocaches explains WebView load failed network errors", async () => {
  const failingFetch = async () => {
    throw new TypeError("Load failed");
  };

  await assert.rejects(
    () => fetchNearbyGeocaches({ origin, consumerKey, fetchImpl: failingFetch }),
    /network\.whitelist/
  );
});

test("fetchNearbyGeocaches rejects direct Groundspeak WebView access before fetch", async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return { ok: true, json: async () => ({}) };
  };

  await assert.rejects(
    () => fetchNearbyGeocaches({ origin, apiBaseUrl: DIRECT_GROUNDSPEAK_API_BASE_URL, consumerKey, fetchImpl }),
    /Direct geocaching\.com API access is not available/
  );
  assert.equal(called, false);
});

test("describeGeocachingFetchError keeps specific errors intact", () => {
  assert.equal(describeGeocachingFetchError(new Error("OAuth token expired")), "OAuth token expired");
});

test("fetchNearbyGeocaches explains when no caches are returned", async () => {
  const emptyFetch = async () => ({ ok: true, json: async () => ({}) });

  await assert.rejects(
    () => fetchNearbyGeocaches({ origin, consumerKey, fetchImpl: emptyFetch }),
    /returned no caches/
  );
});

test("fetchNearbyGeocaches explains when returned caches are outside radius", async () => {
  const farFetch = async () => ({
    ok: true,
    json: async () => ({
      "OC-FAR": { name: "Too Far", location: "48.3769|8.5417" }
    })
  });

  await assert.rejects(
    () => fetchNearbyGeocaches({ origin, radiusKm: 5, consumerKey, fetchImpl: farFetch }),
    /within 5km/
  );
});
