import { fetchNearbyGeocaches } from "./geocachingApi.js";
import { bearingDegrees, bearingToCardinal, cardinalToArrow, haversineDistanceKm } from "./geo.js";
import { nextIndex, SCREEN } from "./state.js";
import { loadActiveTrack, normalizeActiveTrack, saveActiveTrack } from "./activeTrackStore.js";

const root = document.getElementById("glass-screen");
const companionRoot = document.getElementById("companion-content");

const state = {
  screen: SCREEN.LIST,
  origin: { latitude: 47.3769, longitude: 8.5417 },
  geocaches: [],
  selectedIndex: 0,
  showHint: false,
  activeTrack: loadActiveTrack(),
  companionStatus: "",
  viewerHeading: 0
};

function clampLabel(value, maxLength = 64) {
  if (!value) {
    return "";
  }
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function selectedGeocache() {
  return state.geocaches[state.selectedIndex];
}

function activeTrackMetrics() {
  if (!state.activeTrack) {
    return null;
  }

  const target = { latitude: state.activeTrack.latitude, longitude: state.activeTrack.longitude };
  const bearing = bearingDegrees(state.origin, target);
  const distanceKm = haversineDistanceKm(state.origin, target);
  const direction = bearingToCardinal(bearing);
  return { bearing, distanceKm, direction };
}

function renderCompassStrip(relativeBearing) {
  const segmentCount = 31;
  const markerIndex = Math.round((normalizeDegrees(relativeBearing) / 360) * (segmentCount - 1));
  return Array.from({ length: segmentCount }, (_, index) => (index === markerIndex ? "▲" : "─")).join("");
}

function renderActiveTrackBanner() {
  const metrics = activeTrackMetrics();
  if (!metrics) {
    return "";
  }

  const relativeBearing = normalizeDegrees(metrics.bearing - state.viewerHeading);
  const heading = Math.round(state.viewerHeading);
  const target = Math.round(metrics.bearing);
  return `
    <div class="active-track-banner">
      <p class="active-track-title">TRACK ${clampLabel(state.activeTrack.cacheName, 40)}</p>
      <p class="compass-strip">${renderCompassStrip(relativeBearing)}</p>
      <p class="compass-meta">DST ${metrics.distanceKm.toFixed(2)}km · ${metrics.direction} · HDG ${heading}° → ${target}°</p>
    </div>
  `;
}

function setActiveTrack(track) {
  state.activeTrack = saveActiveTrack(track);
}

function startSelectedGeotrack() {
  const geocache = selectedGeocache();
  if (!geocache) {
    return;
  }

  if (state.activeTrack && state.activeTrack.cacheId !== geocache.id) {
    const keepGoing = window.confirm(
      "Ein anderer Geotrack ist aktiv. Soll dieser beendet und der neue Track gestartet werden?"
    );
    if (!keepGoing) {
      return;
    }
  }

  setActiveTrack({
    cacheId: geocache.id,
    cacheName: geocache.name,
    latitude: geocache.latitude,
    longitude: geocache.longitude
  });
  state.companionStatus = "Geotrack aktiv.";
  renderCompanion();
  render();
}

function geocacheItemTemplate(item, index) {
  const selected = index === state.selectedIndex;
  const selectedClass = selected ? "selected" : "";
  const marker = selected ? "▶" : "▷";
  return `<li class="geocache-item ${selectedClass}" data-index="${index}">
    <p>${marker} ${escapeHtml(clampLabel(item.name, 52))}</p>
    <p>${item.direction} · ${item.distanceKm.toFixed(2)} km</p>
  </li>`;
}

function renderList() {
  const list = state.geocaches.slice(0, 20).map(geocacheItemTemplate).join("");
  root.innerHTML = `
    <p class="screen-title">G2 GEOCACHE // LIST</p>
    ${renderActiveTrackBanner()}
    <p class="helper">Radius 5km · swipe/arrow scroll · click open</p>
    <ul class="geocache-list">${list}</ul>
  `;

  root.querySelectorAll(".geocache-item").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedIndex = Number(element.getAttribute("data-index"));
      state.screen = SCREEN.DETAIL;
      render();
    });
  });
}

function renderDetail() {
  const geocache = selectedGeocache();
  root.innerHTML = `
    <p class="screen-title">CACHE // DETAIL</p>
    ${renderActiveTrackBanner()}
    <div class="detail-block">
      <p class="detail-name">${escapeHtml(clampLabel(geocache.name))}</p>
      <p>${escapeHtml(clampLabel(geocache.description, 180))}</p>
    </div>
    <div class="detail-block">
      <p>DST ${geocache.distanceKm.toFixed(2)}km · ${geocache.direction}</p>
      <p>DIFF ${geocache.difficulty} · TERR ${geocache.terrain}</p>
      <p>${escapeHtml(clampLabel(`TYPE ${geocache.type} · SIZE ${geocache.size}`, 40))}</p>
      <p>CODE ${escapeHtml(geocache.id)}</p>
    </div>
    <button type="button" class="action-btn" data-action="start-track">Geotrack starten</button>
    <p class="helper">click button: track · click screen: finder · dblclick list</p>
  `;

  root.onclick = (event) => {
    if (event.target instanceof Element && event.target.closest('[data-action="start-track"]')) {
      startSelectedGeotrack();
      return;
    }

    state.screen = SCREEN.FINDER;
    state.showHint = false;
    render();
  };

  root.ondblclick = () => {
    state.screen = SCREEN.LIST;
    render();
  };
}

function renderFinder() {
  const geocache = selectedGeocache();
  const hint = state.showHint ? `<p class="hint-text">HINT ${escapeHtml(clampLabel(geocache.hint, 220))}</p>` : "";

  root.innerHTML = `
    <p class="screen-title">CACHE // FINDER</p>
    ${renderActiveTrackBanner()}
    <p>${escapeHtml(clampLabel(geocache.name, 54))}</p>
    <div class="arrow" aria-label="direction arrow">${cardinalToArrow(geocache.direction)}</div>
    <p>${geocache.direction} · ${geocache.distanceKm.toFixed(2)} km</p>
    ${hint}
    <p class="helper">click hint · dblclick detail</p>
  `;

  root.onclick = () => {
    state.showHint = true;
    render();
  };

  root.ondblclick = () => {
    state.screen = SCREEN.DETAIL;
    state.showHint = false;
    render();
  };
}

function render() {
  root.onclick = null;
  root.ondblclick = null;

  if (state.screen === SCREEN.DETAIL) {
    renderDetail();
    return;
  }

  if (state.screen === SCREEN.FINDER) {
    renderFinder();
    return;
  }

  renderList();
}

function renderCompanion() {
  if (!companionRoot) {
    return;
  }

  const track = state.activeTrack;
  const status = state.companionStatus ? `<p class="companion-status">${escapeHtml(state.companionStatus)}</p>` : "";

  if (!track) {
    companionRoot.innerHTML = `
      <p>Aktiver Geotrack: keiner</p>
      <p class="helper">Im Cache-Detailscreen kann ein Geotrack gestartet werden.</p>
      ${status}
    `;
    return;
  }

  companionRoot.innerHTML = `
    <p><strong>Aktiver Geotrack:</strong> ${escapeHtml(track.cacheName)} (${escapeHtml(track.cacheId)})</p>
    <form id="track-coordinate-form" class="track-form">
      <label>
        Latitude
        <input id="track-latitude" type="number" step="0.000001" value="${track.latitude}" required />
      </label>
      <label>
        Longitude
        <input id="track-longitude" type="number" step="0.000001" value="${track.longitude}" required />
      </label>
      <div class="companion-actions">
        <button type="submit">Koordinate speichern</button>
        <button type="button" id="stop-track">Geotrack stoppen</button>
      </div>
    </form>
    ${status}
  `;

  const form = document.getElementById("track-coordinate-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const latitudeInput = document.getElementById("track-latitude");
    const longitudeInput = document.getElementById("track-longitude");
    const nextTrack = normalizeActiveTrack({
      ...state.activeTrack,
      latitude: latitudeInput?.value,
      longitude: longitudeInput?.value
    });

    if (!nextTrack) {
      state.companionStatus = "Ungültige Koordinaten.";
      renderCompanion();
      return;
    }

    setActiveTrack(nextTrack);
    state.companionStatus = "Koordinate aktualisiert.";
    renderCompanion();
    render();
  });

  document.getElementById("stop-track")?.addEventListener("click", () => {
    setActiveTrack(null);
    state.companionStatus = "Geotrack beendet.";
    renderCompanion();
    render();
  });
}

function registerOrientation() {
  window.addEventListener("deviceorientationabsolute", (event) => {
    if (!Number.isFinite(event.alpha)) {
      return;
    }
    state.viewerHeading = normalizeDegrees(360 - event.alpha);
    render();
  });

  window.addEventListener("deviceorientation", (event) => {
    if (!Number.isFinite(event.alpha)) {
      return;
    }
    state.viewerHeading = normalizeDegrees(360 - event.alpha);
    render();
  });
}

function registerListNavigation() {
  window.addEventListener("wheel", (event) => {
    if (state.screen !== SCREEN.LIST) {
      return;
    }

    const delta = event.deltaY > 0 ? 1 : -1;
    state.selectedIndex = nextIndex(state.selectedIndex, state.geocaches.length, delta);
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (state.activeTrack && event.key === "ArrowLeft") {
      state.viewerHeading = normalizeDegrees(state.viewerHeading - 5);
      render();
      return;
    }

    if (state.activeTrack && event.key === "ArrowRight") {
      state.viewerHeading = normalizeDegrees(state.viewerHeading + 5);
      render();
      return;
    }

    if (state.screen !== SCREEN.LIST) {
      return;
    }

    if (event.key === "ArrowDown") {
      state.selectedIndex = nextIndex(state.selectedIndex, state.geocaches.length, 1);
      render();
    }

    if (event.key === "ArrowUp") {
      state.selectedIndex = nextIndex(state.selectedIndex, state.geocaches.length, -1);
      render();
    }
  });

  let touchStartY = 0;
  window.addEventListener("touchstart", (event) => {
    touchStartY = event.changedTouches[0]?.screenY ?? 0;
  });

  window.addEventListener("touchend", (event) => {
    if (state.screen !== SCREEN.LIST) {
      return;
    }

    const touchEndY = event.changedTouches[0]?.screenY ?? touchStartY;
    const movement = touchStartY - touchEndY;

    if (Math.abs(movement) < 20) {
      return;
    }

    state.selectedIndex = nextIndex(state.selectedIndex, state.geocaches.length, movement > 0 ? 1 : -1);
    render();
  });
}

function registerPositionTracking() {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      state.origin = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      if (state.activeTrack) {
        render();
      }
    },
    () => {},
    { maximumAge: 10_000, enableHighAccuracy: true, timeout: 4_000 }
  );
}

async function loadGeocaches() {
  const loading = document.createElement("p");
  loading.innerText = "Loading geocaches...";
  root.replaceChildren(loading);

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
  state.screen = SCREEN.LIST;
  renderCompanion();
  render();
}

registerListNavigation();
registerOrientation();
registerPositionTracking();
loadGeocaches();
