import assert from "node:assert/strict";
import test from "node:test";
import { buildGlassesLayout } from "../src/glassesLayout.js";
import { SCREEN } from "../src/state.js";

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

  assert.equal(layout.containerTotalNum, 2);
  assert.equal(layout.listObject?.[0]?.isEventCapture, 1);
  assert.ok(layout.listObject?.[0]?.itemContainer?.itemName?.[0].includes("NE"));
  const content = String(layout.textObject?.[0]?.content);
  assert.ok(content.includes("╭"));
  assert.ok(content.includes("╰"));
  assert.ok(content.includes("NW (230 Grad) 1,23km"));
  assert.ok(content.includes("▲") || content.includes("◆"));
  assert.ok(content.includes("│") || content.includes("◆"));
  assert.ok(!content.includes("┬"));
  assert.ok(content.includes("[") && content.includes("]"));
  assert.ok(content.includes("15") || content.includes("30") || content.includes("45"));
  const tickCount = (content.match(/┬/g) ?? []).length;
  assert.ok(tickCount <= 18);
  const bandTickCount = (content.match(/─/g) ?? []).length;
  assert.ok(bandTickCount > 0);
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

  const content = String(layout.textObject?.[0]?.content);
  assert.ok(content.includes("TRACK"));
  assert.ok(!content.includes("TARGET"));
  assert.ok(!content.includes("┿"));
  assert.ok(!content.includes("┃"));
  assert.ok(content.includes("15"));
  assert.ok(content.includes("N"));
  assert.ok(content.includes("NE"));

  const lines = content.split("\n");
  const cardinalLine = lines[2] ?? "";
  const tokens = cardinalLine.match(/\b(NW|NE|SE|SW|N|E|S|W)\b/g) ?? [];
  assert.equal(new Set(tokens).size, tokens.length);
});

test("detail layout includes requested geocache metadata", () => {
  const layout = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false,
    activeTrack: { cacheId: "GC1", cacheName: "River View Micro" },
    activeTrackMetrics: sampleTrackMetrics
  });

  const content = layout.textObject?.[0]?.content;
  assert.equal(layout.containerTotalNum, 2);
  assert.equal(layout.textObject?.[0]?.isEventCapture, 0);
  assert.equal(layout.listObject?.[0]?.containerName, "detail-options");
  assert.equal(layout.listObject?.[0]?.isEventCapture, 1);
  assert.ok(String(content).includes("Difficulty"));
  assert.ok(String(content).includes("Terrain"));
  assert.ok(String(content).includes("GeoTrack: ACTIVE"));
  assert.ok(String(content).includes("TRACK"));
  assert.ok(String(content).includes("1.23km"));
});

test("finder layout toggles hint visibility", () => {
  const hiddenHintLayout = buildGlassesLayout({
    screen: SCREEN.FINDER,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false
  });

  const visibleHintLayout = buildGlassesLayout({
    screen: SCREEN.FINDER,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: true,
    activeTrackMetrics: sampleTrackMetrics
  });

  const detailWithHiddenHint = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: false
  });

  const detailWithVisibleHint = buildGlassesLayout({
    screen: SCREEN.DETAIL,
    geocaches: sampleCaches,
    selectedIndex: 0,
    showHint: true
  });

  assert.ok(String(hiddenHintLayout.textObject?.[0]?.content).includes("Show hint"));
  assert.ok(String(visibleHintLayout.textObject?.[0]?.content).includes("Hint:"));
  assert.ok(String(visibleHintLayout.textObject?.[0]?.content).includes("TRACK"));
  assert.ok(String(visibleHintLayout.textObject?.[0]?.content).includes("1.23km"));
  assert.ok(String(detailWithHiddenHint.listObject?.[0]?.itemContainer?.itemName?.[1]).includes("Show"));
  assert.ok(String(detailWithVisibleHint.listObject?.[0]?.itemContainer?.itemName?.[1]).includes("Hide"));
});
