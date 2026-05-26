import assert from "node:assert/strict";
import test from "node:test";
import appManifest from "../app.json" with { type: "json" };
import { APP_VERSION, APP_VERSION_LABEL } from "../src/version.js";

test("version exports are sourced from app.json", () => {
  assert.equal(APP_VERSION, String(appManifest.version));
  assert.equal(APP_VERSION_LABEL, `v${appManifest.version}`);
});
