import { fetchNearbyGeocaches } from "./geocachingApi.js";
import { cardinalToArrow } from "./geo.js";
import { nextIndex, SCREEN } from "./state.js";

const root = document.getElementById("glass-screen");

const state = {
  screen: SCREEN.LIST,
  origin: { latitude: 47.3769, longitude: 8.5417 },
  geocaches: [],
  selectedIndex: 0,
  showHint: false
};

function clampLabel(value, maxLength = 64) {
  if (!value) {
    return "";
  }
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function selectedGeocache() {
  return state.geocaches[state.selectedIndex];
}

function geocacheItemTemplate(item, index) {
  const selected = index === state.selectedIndex;
  const selectedClass = selected ? "selected" : "";
  const marker = selected ? "▶" : "▷";
  return `<li class="geocache-item ${selectedClass}" data-index="${index}">
    <p>${marker} ${clampLabel(item.name, 52)}</p>
    <p>${item.direction} · ${item.distanceKm.toFixed(2)} km</p>
  </li>`;
}

function renderList() {
  const list = state.geocaches.slice(0, 20).map(geocacheItemTemplate).join("");
  root.innerHTML = `
    <p class="screen-title">G2 GEOCACHE // LIST</p>
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
    <div class="detail-block">
      <p class="detail-name">${clampLabel(geocache.name)}</p>
      <p>${clampLabel(geocache.description, 180)}</p>
    </div>
    <div class="detail-block">
      <p>DST ${geocache.distanceKm.toFixed(2)}km · ${geocache.direction}</p>
      <p>DIFF ${geocache.difficulty} · TERR ${geocache.terrain}</p>
      <p>${clampLabel(`TYPE ${geocache.type} · SIZE ${geocache.size}`, 40)}</p>
      <p>CODE ${geocache.id}</p>
    </div>
    <p class="helper">click finder · dblclick list</p>
  `;

  root.onclick = () => {
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
  const hint = state.showHint ? `<p class="hint-text">HINT ${clampLabel(geocache.hint, 220)}</p>` : "";

  root.innerHTML = `
    <p class="screen-title">CACHE // FINDER</p>
    <p>${clampLabel(geocache.name, 54)}</p>
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
  render();
}

registerListNavigation();
loadGeocaches();
