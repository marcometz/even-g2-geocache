import test from "node:test";
import assert from "node:assert/strict";

import { assertUrlReachable, parseTargetUrl } from "../scripts/simulator.js";

test("parseTargetUrl uses CLI URL when provided", () => {
  const url = parseTargetUrl(["node", "scripts/simulator.js", "http://127.0.0.1:5173"]);
  assert.equal(url, "http://127.0.0.1:5173");
});

test("parseTargetUrl falls back to localhost when CLI URL is missing", () => {
  const url = parseTargetUrl(["node", "scripts/simulator.js"]);
  assert.equal(url, "http://localhost:5173");
});

test("assertUrlReachable resolves when HEAD request succeeds", async () => {
  const fetchImpl = async () => ({ ok: true, status: 200 });
  await assert.doesNotReject(() => assertUrlReachable("http://localhost:5173", { fetchImpl }));
});

test("assertUrlReachable throws a readable error when server is unavailable", async () => {
  const fetchImpl = async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:5173");
  };

  await assert.rejects(
    () => assertUrlReachable("http://localhost:5173", { fetchImpl }),
    /Could not reach http:\/\/localhost:5173/
  );
});
