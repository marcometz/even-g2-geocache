import { buildFallbackGeocaches, fetchNearbyGeocaches, isLocalGeocacheFallbackEnabled } from "./geocachingApi.js";
import { SCREEN } from "./state.js";
import { buildGlassesLayout } from "./glassesLayout.js";
import { EvenHubBridgeClient } from "./bridge/evenHubBridge.js";
import { applyGlassesInput } from "./appStateMachine.js";
import { loadActiveTrack, saveActiveTrack } from "./activeTrackStore.js";
import { DETAIL_OPTION, handleGeoTrackInput, toggleDetailOption } from "./geotrackController.js";
import { computeActiveTrackMetrics, normalizeDegrees } from "./trackMetrics.js";
import {
  GPS_DESIRED_ACCURACY_METERS,
  INITIAL_GEOLOCATION_OPTIONS,
  WATCH_GEOLOCATION_OPTIONS,
  describeGeolocationError,
  isGpsAccuracyGoodEnough,
  readGpsFix,
  shouldRefreshGeocaches
} from "./location.js";
import { pushCompassImage, startCompassTicker } from "./glass/screens/compass.js";
import { LIST_CONTAINER_ID, LIST_CONTAINER_NAME, buildListContent } from "./glass/screens/list.js";
import { APP_VERSION_LABEL } from "./version.js";

const root = document.getElementById("glass-screen");
const companionRoot = document.getElementById("companion-content");
const bridgeClient = new EvenHubBridgeClient();
const localGeocacheFallbackEnabled = isLocalGeocacheFallbackEnabled();
let startupRendered = false;
let stopCompassTicker = null;
let renderInFlight = false;
let geocacheRefreshInFlight = null;

/**
 * Pushes the current image compass without blocking the main interaction flow.
 * Bridge updates can be slow or stall; callers should not await this
 * in input handlers.
 * @returns {void}
 */
function scheduleCompassImagePush() {
  void pushCompassImage({ updateImage: (payload) => bridgeClient.updateImage(payload) }, state).catch(() => {
    // Keep interaction responsive even when image pushes fail on hardware.
  });
}

/**
 * Refreshes live track metrics and pushes only the compass/companion updates
 * needed for heading or small GPS changes, avoiding a full page rebuild.
 * @returns {void}
 */
function updateLiveTrackPresentation() {
  if (!state.activeTrack) {
    return;
  }

  refreshActiveTrackMetrics();
  renderCompanion();
  if (startupRendered) {
    scheduleCompassImagePush();
  }
}

const state = {
  screen: SCREEN.LIST,
  origin: { latitude: 47.3769, longitude: 8.5417 },
  originIsGps: false,
  originAccuracyMeters: null,
  originUpdatedAt: null,
  originError: "",
  geocachesLoadedAt: null,
  geocachesLoading: false,
  geocacheLoadError: "",
  reloadRequested: false,
  geocaches: [],
  selectedIndex: 0,
  detailOptionIndex: DETAIL_OPTION.GEOTRACK,
  showHint: false,
  viewerHeading: 0,
  activeTrack: loadActiveTrack(),
  activeTrackMetrics: null,
  companionStatus: "",
  detailPhase: "scroll",
  lastInputAt: 0
};

/**
 * Recomputes active geotrack metrics from live position and heading.
 * @returns {void}
 */
function refreshActiveTrackMetrics() {
  state.activeTrackMetrics = computeActiveTrackMetrics(state.origin, state.activeTrack, state.viewerHeading);
}

/**
 * Renders a minimal local preview message in the WebView host.
 * @returns {void}
 */
function renderLocalHostPreview() {
  if (!root) {
    return;
  }

  root.innerHTML = `
    <p class="screen-title">Glasses output active</p>
    <p class="helper">Rendering is handled via EvenHub containers on the glasses display.</p>
    <p class="app-version">${APP_VERSION_LABEL}</p>
  `;
}

/**
 * Creates startup or rebuild calls depending on bridge lifecycle state.
 * @returns {Promise<void>}
 */
async function renderGlasses() {
  if (renderInFlight) {
    return;
  }

  renderInFlight = true;
  try {
    refreshActiveTrackMetrics();
    const layout = buildGlassesLayout(state);
    if (!startupRendered) {
      startupRendered = await bridgeClient.createStartup(layout);
      if (!startupRendered) {
        await bridgeClient.rebuild(layout);
      }
      if (startupRendered) {
        scheduleCompassImagePush();
      }
      return;
    }

    await bridgeClient.rebuild(layout);
    scheduleCompassImagePush();
  } finally {
    renderInFlight = false;
  }
}

/**
 * Starts the 1Hz compass ticker once the bridge is ready.
 * The ticker refreshes only the compass container via textContainerUpgrade,
 * avoiding full-screen rebuilds every second.
 * @returns {void}
 */
function ensureCompassTicker() {
  if (stopCompassTicker !== null) {
    return;
  }

  stopCompassTicker = startCompassTicker({
    bridge: {
      updateImage: (payload) => bridgeClient.updateImage(payload)
    },
    getState: () => state,
    refreshMetrics: () => refreshActiveTrackMetrics(),
    getLastInputAt: () => state.lastInputAt,
    isStartupRendered: () => startupRendered
  });
}

function renderCompanion() {
  if (!companionRoot) {
    return;
  }

  const loadedAtLabel = state.geocachesLoadedAt
    ? `Caches loaded from ${formatCoordinate(state.geocachesLoadedAt.latitude)}, ${formatCoordinate(state.geocachesLoadedAt.longitude)}`
    : "Geocaches not yet loaded";
  const gpsPanel = renderGpsPanel();
  const loadPanel = renderGeocacheLoadPanel();

  if (!state.activeTrack) {
    companionRoot.innerHTML = `
      <p><strong>Active GeoTrack:</strong> none</p>
      ${gpsPanel}
      ${loadPanel}
      <p class="helper">${loadedAtLabel} (${state.geocaches.length} caches)</p>
      <p class="app-version">${APP_VERSION_LABEL}</p>
      ${state.companionStatus ? `<p class="companion-status">${escapeHtml(state.companionStatus)}</p>` : ""}
    `;
    bindCompanionReloadButton();
    return;
  }

  const metrics = state.activeTrackMetrics;
  const metricsBlock = metrics
    ? `<p>Realtime: ${metrics.arrow} ${metrics.direction} · ${metrics.distanceKm.toFixed(2)}km (HDG ${Math.round(metrics.heading)}°)</p>`
    : "<p>Realtime: waiting for live location...</p>";

  companionRoot.innerHTML = `
    <p><strong>Active GeoTrack:</strong> ${escapeHtml(state.activeTrack.cacheName)} (${escapeHtml(state.activeTrack.cacheId)})</p>
    ${gpsPanel}
    ${loadPanel}
    <p><strong>Target:</strong> Lat ${formatCoordinate(state.activeTrack.lat)} Lng ${formatCoordinate(state.activeTrack.lon)}</p>
    <p class="helper">${loadedAtLabel} (${state.geocaches.length} caches)</p>
    ${metricsBlock}
    <button type="button" id="stop-track">Stop GeoTrack</button>
    <p class="app-version">${APP_VERSION_LABEL}</p>
    ${state.companionStatus ? `<p class="companion-status">${escapeHtml(state.companionStatus)}</p>` : ""}
  `;

  const stopButton = document.getElementById("stop-track");
  stopButton?.addEventListener("click", async () => {
    state.activeTrack = saveActiveTrack(null);
    state.companionStatus = "GeoTrack stopped.";
    renderCompanion();
    await renderGlasses();
  });
  bindCompanionReloadButton();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

/**
 * @returns {string}
 */
function renderGpsPanel() {
  const hasTargetAccuracy = isGpsAccuracyGoodEnough(state.originAccuracyMeters);
  const gpsStatus = state.originIsGps
    ? hasTargetAccuracy
      ? `GPS accuracy target met (<=${GPS_DESIRED_ACCURACY_METERS}m)`
      : `GPS active, waiting for <=${GPS_DESIRED_ACCURACY_METERS}m accuracy`
    : "GPS not yet available";
  const accuracyLabel = Number.isFinite(state.originAccuracyMeters)
    ? `+/- ${Number(state.originAccuracyMeters).toFixed(1)}m`
    : "unknown";
  const updatedLabel = state.originUpdatedAt
    ? new Date(state.originUpdatedAt).toLocaleTimeString()
    : "not yet";
  const statusClass = state.originIsGps && hasTargetAccuracy ? "gps-good" : "gps-pending";
  const positionLabel = state.originIsGps
    ? `Lat ${formatCoordinate(state.origin.latitude)} Lng ${formatCoordinate(state.origin.longitude)}`
    : "Lat -- Lng --";

  return `
    <div class="companion-location ${statusClass}">
      <p><strong>Own GPS position</strong></p>
      <p>${positionLabel}</p>
      <p class="helper">${gpsStatus}; accuracy ${accuracyLabel}; updated ${updatedLabel}</p>
      ${state.originError ? `<p class="helper">GPS warning: ${escapeHtml(state.originError)}</p>` : ""}
    </div>
  `;
}

/**
 * @returns {string}
 */
function renderGeocacheLoadPanel() {
  if (!state.geocachesLoading && !state.geocacheLoadError) {
    return "";
  }

  const status = state.geocachesLoading
    ? "Loading nearby geocaches..."
    : `Load failed: ${state.geocacheLoadError}`;

  return `
    <div class="companion-load-status">
      <p>${escapeHtml(status)}</p>
      <button type="button" id="reload-geocaches" ${state.geocachesLoading ? "disabled" : ""}>Reload geocaches</button>
    </div>
  `;
}

function bindCompanionReloadButton() {
  const reloadButton = document.getElementById("reload-geocaches");
  reloadButton?.addEventListener("click", () => {
    void reloadGeocachesFromCurrentOrigin();
  });
}

/**
 * @param {GeolocationPosition} position
 * @returns {void}
 */
function applyGpsFix(position) {
  const fix = readGpsFix(position);
  state.origin = {
    latitude: fix.latitude,
    longitude: fix.longitude
  };
  state.originAccuracyMeters = fix.accuracyMeters;
  state.originUpdatedAt = fix.updatedAt;
  state.originIsGps = true;
  state.originError = "";
}

/**
 * @param {unknown} error
 * @returns {void}
 */
function rememberGpsError(error) {
  state.originError = describeGeolocationError(error);
}

/**
 * Refreshes nearby caches from the current origin, with a single in-flight request.
 * @returns {Promise<boolean>} true when a refresh completed in this call
 */
async function refreshGeocachesForCurrentOrigin() {
  if (geocacheRefreshInFlight) {
    return geocacheRefreshInFlight;
  }

  if (!state.originIsGps) {
    if (localGeocacheFallbackEnabled) {
      const fallbackOrigin = { ...state.origin };
      state.geocaches = buildFallbackGeocaches(fallbackOrigin);
      state.geocachesLoadedAt = fallbackOrigin;
      state.selectedIndex = 0;
      state.geocacheLoadError = "";
      state.geocachesLoading = false;
      return true;
    }

    state.geocaches = [];
    state.geocachesLoadedAt = null;
    state.selectedIndex = 0;
    state.geocacheLoadError = state.originError
      ? `GPS position unavailable: ${state.originError}`
      : "GPS position unavailable. Allow location access on the phone, then reload.";
    state.geocachesLoading = false;
    return false;
  }

  const refreshOrigin = { ...state.origin };
  state.geocachesLoading = true;
  state.geocacheLoadError = "";
  geocacheRefreshInFlight = fetchNearbyGeocaches({
    origin: refreshOrigin,
    radiusKm: 5
  })
    .then((geocaches) => {
      state.geocaches = geocaches;
      state.geocachesLoadedAt = refreshOrigin;
      state.selectedIndex = 0;
      state.geocacheLoadError = "";
      return true;
    })
    .catch((error) => {
      state.geocaches = [];
      state.geocachesLoadedAt = null;
      state.selectedIndex = 0;
      state.geocacheLoadError = error instanceof Error ? error.message : String(error);
      return false;
    })
    .finally(() => {
      state.geocachesLoading = false;
      geocacheRefreshInFlight = null;
    });

  return geocacheRefreshInFlight;
}

/**
 * Reloads nearby caches and refreshes both companion and glasses UI around
 * the async request so the user gets visible feedback.
 * @returns {Promise<boolean>}
 */
async function reloadGeocachesFromCurrentOrigin() {
  state.reloadRequested = false;
  state.companionStatus = "Reloading geocaches...";
  const refreshPromise = refreshGeocachesForCurrentOrigin();
  renderCompanion();
  await renderGlasses();
  const loaded = await refreshPromise;
  state.companionStatus = loaded ? "Geocaches reloaded." : "Geocache reload failed.";
  refreshActiveTrackMetrics();
  renderCompanion();
  await renderGlasses();
  return loaded;
}

async function loadGeocaches() {
  if (root) {
    const loading = document.createElement("p");
    loading.innerText = "Loading geocaches...";
    root.replaceChildren(loading);
  }

  if (navigator.geolocation) {
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyGpsFix(position);
          resolve();
        },
        (error) => {
          rememberGpsError(error);
          resolve();
        },
        INITIAL_GEOLOCATION_OPTIONS
      );
    });
  } else {
    rememberGpsError("Browser geolocation is not available in this WebView.");
  }

  await reloadGeocachesFromCurrentOrigin();
  state.detailOptionIndex = DETAIL_OPTION.GEOTRACK;
  state.screen = SCREEN.LIST;
  state.showHint = false;
  refreshActiveTrackMetrics();

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      async (position) => {
        try {
          applyGpsFix(position);
        } catch (error) {
          rememberGpsError(error);
          renderCompanion();
          return;
        }

        const needsCacheRefresh = shouldRefreshGeocaches(state.geocachesLoadedAt, state.origin);
        if (needsCacheRefresh) {
          await reloadGeocachesFromCurrentOrigin();
          return;
        }

        refreshActiveTrackMetrics();
        renderCompanion();
        if (state.activeTrack) {
          updateLiveTrackPresentation();
        }
      },
      (error) => {
        rememberGpsError(error);
        renderCompanion();
      },
      WATCH_GEOLOCATION_OPTIONS
    );
  }

  const handleOrientation = async (event) => {
    if (!Number.isFinite(event?.alpha)) {
      return;
    }

    state.viewerHeading = normalizeDegrees(360 - event.alpha);
    updateLiveTrackPresentation();
  };

  window.addEventListener("deviceorientationabsolute", handleOrientation);
  window.addEventListener("deviceorientation", handleOrientation);

  bridgeClient.onHeading((heading) => {
    state.viewerHeading = normalizeDegrees(heading);
    updateLiveTrackPresentation();
  });

  bridgeClient.onInput(async (input) => {
    state.lastInputAt = Date.now();
    if (input.type === "SelectionChange") {
      // detail-options SelectionChange removed — options use fake buttons now
      return;
    }

    if (state.screen === SCREEN.DETAIL && state.detailPhase === "options" && input.type === "Click") {
      const toggled = toggleDetailOption(state, (track) => saveActiveTrack(track));
      if (toggled) {
        refreshActiveTrackMetrics();
        renderCompanion();
        await renderGlasses();
        return;
      }
    }

    const consumedByGeoTrack = handleGeoTrackInput(state, input.type, (track) => saveActiveTrack(track));
    if (consumedByGeoTrack) {
      refreshActiveTrackMetrics();
      renderCompanion();
      await renderGlasses();
      return;
    }

    applyGlassesInput(state, input.type);

    if (state.reloadRequested) {
      await reloadGeocachesFromCurrentOrigin();
      return;
    }

    // Up/Down on the list screen: refresh only the list text container via
    // textContainerUpgrade — avoids a full page rebuild (no flicker).
    if (state.screen === SCREEN.LIST && (input.type === "Up" || input.type === "Down")) {
      await bridgeClient.upgradeText({
        containerID: LIST_CONTAINER_ID,
        containerName: LIST_CONTAINER_NAME,
        content: buildListContent(state)
      });
      return;
    }

    await renderGlasses();
  });

  await renderGlasses();
  renderCompanion();
  renderLocalHostPreview();
}

async function boot() {
  renderCompanion();
  renderLocalHostPreview();

  try {
    await bridgeClient.connect();
    ensureCompassTicker();
    await loadGeocaches();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (root) {
      root.innerHTML = `<p class="helper">Bridge startup failed: ${message}</p>`;
    }
  }
}

boot();
