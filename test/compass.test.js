import assert from "node:assert/strict";
import test from "node:test";
import {
  startCompassTicker,
  getCompassContent,
  getCompassImageBytes,
  pushCompassImage,
  COMPASS_CONTAINER_ID,
  COMPASS_CONTAINER_NAME,
  COMPASS_HEIGHT,
  COMPASS_IMAGE_CONTAINER_ID,
  COMPASS_IMAGE_CONTAINER_NAME
} from "../src/glass/screens/compass.js";
import { buildCompassTiles } from "../src/glass/compassImage.js";

function installCanvasMock() {
  globalThis.document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        font: "",
        textAlign: "",
        textBaseline: "",
        fillRect() {},
        fillText() {},
        measureText: (text) => ({ width: String(text).length * 6 }),
        drawImage() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        closePath() {},
        fill() {}
      }),
      toDataURL: () => "data:image/png;base64,AA=="
    })
  };
  globalThis.atob = (value) => Buffer.from(value, "base64").toString("binary");
}

installCanvasMock();

const sampleMetrics = {
  cacheName: "River View Micro",
  arrow: "↗",
  direction: "NW",
  distanceKm: 1.23,
  bearing: 230,
  heading: 42,
  relativeBearing: 0
};

test("getCompassContent returns empty string when no activeTrackMetrics", () => {
  assert.equal(getCompassContent({ activeTrackMetrics: null }), "");
  assert.equal(getCompassContent({}), "");
  assert.equal(getCompassContent(null), "");
});

test("getCompassContent returns a stable summary token when activeTrackMetrics are present", () => {
  const content = getCompassContent({ activeTrackMetrics: sampleMetrics });
  assert.ok(content.includes("River View Micro"));
  assert.ok(content.includes("NW"));
  assert.ok(content.includes("230"));
});

test("buildCompassTiles returns a narrower 7-segment compass window", () => {
  const tiles = buildCompassTiles(sampleMetrics);
  assert.equal(tiles.length, 7);
  assert.equal(tiles[0].offset, -45);
  assert.equal(tiles[3].offset, 0);
  assert.equal(tiles[6].offset, 45);
  assert.equal(tiles.filter((tile) => tile.isMajor).length, 3);
});

test("getCompassImageBytes returns image data when metrics exist", () => {
  const imageBytes = getCompassImageBytes({ activeTrackMetrics: sampleMetrics });
  assert.ok(imageBytes.length > 0);
});

test("pushCompassImage updates the single safe-width image container", async () => {
  const calls = [];
  await pushCompassImage(
    {
      updateImage: async (payload) => {
        calls.push(payload);
        return true;
      }
    },
    { activeTrackMetrics: sampleMetrics }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].containerID, COMPASS_IMAGE_CONTAINER_ID);
  assert.equal(calls[0].containerName, COMPASS_IMAGE_CONTAINER_NAME);
  assert.ok(calls[0].imageData instanceof Uint8Array);
});

test("compass container constants remain within conservative SDK bounds", () => {
  assert.equal(COMPASS_CONTAINER_ID, 10);
  assert.equal(COMPASS_CONTAINER_NAME, "compass-frame");
  assert.ok(COMPASS_HEIGHT <= 62);
});

test("ticker updates the image compass when visible content changes", async () => {
  const calls = [];
  let metricsRef = { ...sampleMetrics, heading: 0 };
  let tickCallback = null;

  const stop = startCompassTicker({
    bridge: {
      updateImage: async (payload) => {
        calls.push(payload);
        return true;
      }
    },
    getState: () => ({ activeTrackMetrics: metricsRef }),
    isStartupRendered: () => true,
    intervalMs: 1000,
    scheduler: {
      setInterval: (fn, ms) => {
        tickCallback = fn;
        assert.equal(ms, 1000);
        return 1;
      },
      clearInterval: () => {}
    }
  });

  await tickCallback();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].containerID, COMPASS_IMAGE_CONTAINER_ID);

  await tickCallback();
  assert.equal(calls.length, 1, "duplicate content not re-sent");

  metricsRef = { ...sampleMetrics, bearing: 90, direction: "E" };
  await tickCallback();
  assert.equal(calls.length, 2, "changed visible compass content triggers a fresh image update");

  stop();
});

test("ticker is silent when startup is not rendered", async () => {
  const calls = [];
  let tickCallback = null;

  const stop = startCompassTicker({
    bridge: { updateImage: async (payload) => { calls.push(payload); return true; } },
    getState: () => ({ activeTrackMetrics: sampleMetrics }),
    isStartupRendered: () => false,
    scheduler: {
      setInterval: (fn) => { tickCallback = fn; return 1; },
      clearInterval: () => {}
    }
  });

  await tickCallback();
  assert.equal(calls.length, 0);
  stop();
});

test("ticker is silent when no active track metrics exist", async () => {
  const calls = [];
  let tickCallback = null;

  const stop = startCompassTicker({
    bridge: { updateImage: async (payload) => { calls.push(payload); return true; } },
    getState: () => ({ activeTrackMetrics: null }),
    isStartupRendered: () => true,
    scheduler: {
      setInterval: (fn) => { tickCallback = fn; return 1; },
      clearInterval: () => {}
    }
  });

  await tickCallback();
  assert.equal(calls.length, 0);
  stop();
});

test("ticker does not fire concurrently when image update is slow", async () => {
  let resolveCall;
  let updateCallCount = 0;
  let tickCallback = null;

  const stop = startCompassTicker({
    bridge: {
      updateImage: async () => {
        updateCallCount++;
        await new Promise((resolve) => {
          resolveCall = resolve;
        });
        return true;
      }
    },
    getState: () => ({ activeTrackMetrics: sampleMetrics }),
    isStartupRendered: () => true,
    scheduler: {
      setInterval: (fn) => { tickCallback = fn; return 1; },
      clearInterval: () => {}
    }
  });

  tickCallback();
  await Promise.resolve();
  assert.equal(updateCallCount, 1);

  await tickCallback();
  assert.equal(updateCallCount, 1);

  resolveCall?.();
  stop();
});

test("ticker suppresses image updates shortly after user input", async () => {
  const calls = [];
  let tickCallback = null;
  let lastInputAt = 0;

  const stop = startCompassTicker({
    bridge: { updateImage: async (payload) => { calls.push(payload); return true; } },
    getState: () => ({ activeTrackMetrics: sampleMetrics }),
    isStartupRendered: () => true,
    getLastInputAt: () => lastInputAt,
    suppressAfterInputMs: 700,
    scheduler: {
      setInterval: (fn) => { tickCallback = fn; return 1; },
      clearInterval: () => {}
    }
  });

  lastInputAt = Date.now() - 300;
  await tickCallback();
  assert.equal(calls.length, 0);

  lastInputAt = Date.now() - 800;
  await tickCallback();
  assert.equal(calls.length, 1);

  stop();
});

test("ticker calls refreshMetrics before reading content", async () => {
  let refreshCallCount = 0;
  let headingRef = 0;
  let metricsRef = { ...sampleMetrics, heading: 0 };
  let tickCallback = null;

  const stop = startCompassTicker({
    bridge: { updateImage: async () => true },
    getState: () => ({ activeTrackMetrics: metricsRef }),
    isStartupRendered: () => true,
    refreshMetrics: () => {
      refreshCallCount++;
      metricsRef = { ...sampleMetrics, heading: headingRef };
    },
    scheduler: {
      setInterval: (fn) => { tickCallback = fn; return 1; },
      clearInterval: () => {}
    }
  });

  headingRef = 90;
  await tickCallback();
  assert.equal(refreshCallCount, 1);
  assert.equal(metricsRef.heading, 90);

  stop();
});
