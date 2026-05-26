import assert from "node:assert/strict";
import test from "node:test";
import { buildGlassesLayout } from "../src/glassesLayout.js";
import { SCREEN } from "../src/state.js";

function fromFullwidth(value) {
  return String(value)
    .replace(/\u3000/g, " ")
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
}

const sampleCaches = [
  {
    id: "GC1",
    name: "River View Micro",
    description: "Scenic geocache near the river bend.",
    hint: "Look under the third bench.",
    difficulty: 2,
    terrain: 2,
    type: "Traditional",
    size: "Micro",
    direction: "NE",
    distanceKm: 1.23
  }
];

const sampleTrackMetrics = {
  cacheName: "River View Micro",
  arrow: "↗",
  direction: "NW",
  distanceKm: 1.23,
  bearing: 230,
  heading: 42,
  relativeBearing: 0
};

test("list layout contains one event capture list container", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.LIST,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    activeTrack: { cacheId: "GC1", cacheName: "River View Micro" },
    activeTrackMetrics: sampleTrackMetrics
  });

  // compass frame + image + title + cache-list text + version overlay = 5 containers
  assert.equal(layout.containerTotalNum, 5);
  assert.equal(layout.textObject?.[0]?.containerName, "compass-frame");
  assert.equal(layout.imageObject?.[0]?.containerName, "compass-image");
  const hasListTitle = (layout.textObject ?? []).some((entry) => String(entry?.content ?? "").includes("GEOCACHE - LIST"));
  assert.ok(hasListTitle);
  // fake-button list (replaces native list widget)
  const listContainer = layout.textObject?.find((entry) => entry?.containerName === "cache-list");
  assert.equal(listContainer?.isEventCapture, 1);
  assert.equal(listContainer?.containerName, "cache-list");
  const listContent = String(listContainer?.content);
  // selected item (index 0) must have > cursor
  assert.ok(listContent.startsWith(">"));
  // item content includes direction
  assert.ok(listContent.includes("NE"));
  // active-track cache (GC1) must show the ▶ marker
  assert.ok(listContent.includes("\u25b6"), "active track entry shows ▶ marker");
  // no native listObject expected
  assert.ok(!layout.listObject || layout.listObject.length === 0);
  assert.equal(layout.textObject?.[3]?.containerName, "version");
});

test("list compass is technical-only", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.LIST,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    activeTrack: { cacheId: "GC1", cacheName: "River View Micro" },
    activeTrackMetrics: sampleTrackMetrics
  });

  assert.equal(layout.textObject?.[0]?.containerName, "compass-frame");
  assert.equal(layout.imageObject?.[0]?.containerName, "compass-image");
});

test("list layout shows load failure reason and reload fake button when no caches are loaded", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.LIST,
    geocaches: [],
    selectedIndex: 0,
    showHint: false,
    geocacheLoadError: "Geocaching request failed: Failed to fetch"
  });

  assert.equal(layout.containerTotalNum, 3);
  const listContainer = layout.textObject?.[1];
  assert.equal(listContainer?.containerName, "cache-list");
  assert.equal(listContainer?.isEventCapture, 1);
  const content = String(listContainer?.content);
  assert.ok(content.includes("No geocaches available."));
  assert.ok(content.includes("Reason:"));
  assert.ok(content.includes("Failed to fetch"));
  assert.ok(content.includes("> Reload"));
  assert.equal(layout.textObject?.[2]?.containerName, "version");
});

test("list layout shows loading state while geocaches are reloading", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.LIST,
    geocaches: [],
    selectedIndex: 0,
    showHint: false,
    geocachesLoading: true
  });

  const content = String(layout.textObject?.[1]?.content);
  assert.ok(content.includes("Loading geocaches"));
  assert.ok(!content.includes("> Reload"));
  assert.equal(layout.textObject?.[2]?.containerName, "version");
});

test("detail layout scroll phase: full-height scrollable text, no options list", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    activeTrack: { cacheId: "GC1", cacheName: "River View Micro" },
    activeTrackMetrics: sampleTrackMetrics,
    detailPhase: "scroll"
  });

  // compass frame + image + detail text + version overlay = 4 containers
  assert.equal(layout.containerTotalNum, 4);
  assert.equal(layout.textObject?.[0]?.containerName, "compass-frame");
  assert.equal(layout.imageObject?.[0]?.containerName, "compass-image");
  // textObject[1] = scrollable detail text (isEventCapture=1)
  const detail = layout.textObject?.[1];
  assert.equal(detail?.isEventCapture, 1);
  assert.equal(detail?.containerName, "detail");
  const content = String(detail?.content);
  assert.ok(content.includes("Difficulty"));
  assert.ok(content.includes("Terrain"));
  assert.ok(content.includes("GeoTrack: ACTIVE"));
  assert.ok(content.includes("1.23km"));
  // no empty lines
  assert.ok(!content.includes("\n\n"));
  // no options list in scroll phase
  assert.ok(!layout.listObject || layout.listObject.length === 0);
});

test("detail layout options phase: fake-button text container", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    activeTrack: { cacheId: "GC1", cacheName: "River View Micro" },
    activeTrackMetrics: sampleTrackMetrics,
    detailPhase: "options",
    detailOptionIndex: 0
  });

  // compass frame + image + options fake-button text + version overlay = 4 containers
  assert.equal(layout.containerTotalNum, 4);
  // no native list widget
  assert.ok(!layout.listObject || layout.listObject.length === 0);
  // textObject[1] = options fake-button container
  const opts = layout.textObject?.[1];
  assert.equal(opts?.containerName, "detail-options");
  assert.equal(opts?.isEventCapture, 1);
  const content = String(opts?.content);
  // cache name in brackets
  assert.ok(content.includes("[River View Micro]"));
  // cursor on first option (GeoTrack)
  assert.ok(content.includes("> GeoTrack"));
  // second option without cursor
  assert.ok(content.includes("  Hint"));
  // back hint
  assert.ok(content.includes("↑ back"));
});

test("detail layout toggles inline hint visibility", () => {
  const hiddenHintLayout = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    detailPhase: "scroll"
  });

  const visibleHintLayout = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: true,
    detailPhase: "scroll",
    activeTrackMetrics: sampleTrackMetrics
  });

  const detailWithHiddenHint = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    detailPhase: "options"
  });

  const detailWithVisibleHint = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: true,
    detailPhase: "options"
  });

  // No active track: detail container is textObject[0]
  assert.ok(String(hiddenHintLayout.textObject?.[0]?.content).includes("Hint: hidden"));
  // Active track: compass frame/image precede detail text
  assert.ok(String(visibleHintLayout.textObject?.[1]?.content).includes("Hint:"));
  assert.ok(String(visibleHintLayout.textObject?.[1]?.content).includes("Look under the third bench."));
  assert.equal(visibleHintLayout.textObject?.[0]?.containerName, "compass-frame");
  assert.equal(visibleHintLayout.imageObject?.[0]?.containerName, "compass-image");
  // detail options phase uses fake-button text container — no listObject
  // showHint=false: Hint option shows "Show"; showHint=true: shows "Hide"
  const optionsContent = String(detailWithHiddenHint.textObject?.[0]?.content);
  assert.ok(optionsContent.includes("Show"), "Hint option shows Show when hint off");
  const optionsContentVisible = String(detailWithVisibleHint.textObject?.[0]?.content);
  assert.ok(optionsContentVisible.includes("Hide"), "Hint option shows Hide when hint on");
  assert.ok(!detailWithHiddenHint.listObject || detailWithHiddenHint.listObject.length === 0);
});
