import { fetchNearbyGeocaches } from "./geocachingApi.js";
import { SCREEN } from "./state.js";
import { buildGlassesLayout } from "./glassesLayout.js";
import { EvenHubBridgeClient } from "./bridge/evenHubBridge.js";
import { applyGlassesInput, applyListSelectionChange } from "./appStateMachine.js";
import { loadActiveTrack, saveActiveTrack } from "./activeTrackStore.js";
import { DETAIL_OPTION, handleGeoTrackInput, toggleDetailOption } from "./geotrackController.js";
import { computeActiveTrackMetrics, normalizeDegrees } from "./trackMetrics.js";

const root = document.getElementById("glass-screen");
const companionRoot = document.getElementById("companion-content");
const bridgeClient = new EvenHubBridgeClient();
let startupRendered = false;
let liveRenderIntervalId = null;
let renderInFlight = false;

const state = {
  screen: SCREEN.LIST,
  origin: { latitude: 47.3769, longitude: 8.5417 },
  geocaches: [],
  selectedIndex: 0,
  detailOptionIndex: DETAIL_OPTION.GEOTRACK,
  showHint: false,
  viewerHeading: 0,
  activeTrack: loadActiveTrack(),
  activeTrackMetrics: null,
  companionStatus: ""
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
    return;
  }

  await bridgeClient.rebuild(layout);
  } finally {
    renderInFlight = false;
  }
}

/**
 * Ensures periodic rerenders for realtime heading/distance updates.
 * @returns {void}
 */
function ensureRealtimeRenderLoop() {
  if (liveRenderIntervalId !== null) {
    return;
  }

  liveRenderIntervalId = window.setInterval(async () => {
    if (!startupRendered || !state.activeTrack) {
      return;
    }

    refreshActiveTrackMetrics();
    renderCompanion();
    await renderGlasses();
  }, 1000);
}

function renderCompanion() {
  if (!companionRoot) {
    return;
  }

  if (!state.activeTrack) {
    companionRoot.innerHTML = `
      <p><strong>Active GeoTrack:</strong> none</p>
      <p class="helper">On glasses detail screen: Down activates the selected cache as GeoTrack.</p>
      ${state.companionStatus ? `<p class="companion-status">${state.companionStatus}</p>` : ""}
    `;
    return;
  }

  const metrics = state.activeTrackMetrics;
  const metricsBlock = metrics
    ? `<p>Realtime: ${metrics.arrow} ${metrics.direction} · ${metrics.distanceKm.toFixed(2)}km (HDG ${Math.round(metrics.heading)}°)</p>`
    : "<p>Realtime: waiting for live location...</p>";

  companionRoot.innerHTML = `
    <p><strong>Active GeoTrack:</strong> ${state.activeTrack.cacheName} (${state.activeTrack.cacheId})</p>
    <p>Latitude: ${state.activeTrack.lat}</p>
    <p>Longitude: ${state.activeTrack.lon}</p>
    ${metricsBlock}
    <button type="button" id="stop-track">Stop GeoTrack</button>
    ${state.companionStatus ? `<p class="companion-status">${state.companionStatus}</p>` : ""}
  `;

  const stopButton = document.getElementById("stop-track");
  stopButton?.addEventListener("click", async () => {
    state.activeTrack = saveActiveTrack(null);
    state.companionStatus = "GeoTrack stopped.";
    renderCompanion();
    await renderGlasses();
  });
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
          state.origin = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          resolve();
        },
        () => resolve(),
        { maximumAge: 60_000, timeout: 4_000 }
      );
    });
  }

  state.geocaches = await fetchNearbyGeocaches({ origin: state.origin, radiusKm: 5 });
  state.selectedIndex = 0;
  state.detailOptionIndex = DETAIL_OPTION.GEOTRACK;
  state.screen = SCREEN.LIST;
  state.showHint = false;
  refreshActiveTrackMetrics();

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      async (position) => {
        state.origin = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        if (state.activeTrack) {
          refreshActiveTrackMetrics();
          renderCompanion();
          await renderGlasses();
        }
      },
      () => {},
      { maximumAge: 10_000, enableHighAccuracy: true, timeout: 4_000 }
    );
  }

  const handleOrientation = async (event) => {
    if (!Number.isFinite(event?.alpha)) {
      return;
    }

    state.viewerHeading = normalizeDegrees(360 - event.alpha);
    if (state.activeTrack) {
      refreshActiveTrackMetrics();
      renderCompanion();
      await renderGlasses();
    }
  };

  window.addEventListener("deviceorientationabsolute", handleOrientation);
  window.addEventListener("deviceorientation", handleOrientation);

  bridgeClient.onHeading(async (heading) => {
    state.viewerHeading = normalizeDegrees(heading);
    if (state.activeTrack) {
      refreshActiveTrackMetrics();
      renderCompanion();
      await renderGlasses();
    }
  });

  bridgeClient.onInput(async (input) => {
    if (input.type === "SelectionChange") {
      const selection = input.selection;
      if (selection?.containerName === "cache-list" && Number.isInteger(selection.index)) {
        const changedScreen = applyListSelectionChange(state, selection.index);
        if (changedScreen) {
          await renderGlasses();
        }
      }
      if (selection?.containerName === "detail-options" && Number.isInteger(selection.index)) {
        state.detailOptionIndex = Math.min(Math.max(0, selection.index), 1);
      }
      return;
    }

    if (state.screen === SCREEN.DETAIL && input.type === "Click") {
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
    ensureRealtimeRenderLoop();
    await loadGeocaches();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (root) {
      root.innerHTML = `<p class="helper">Bridge startup failed: ${message}</p>`;
    }
  }
}

boot();
