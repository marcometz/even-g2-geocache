import appManifest from "../app.json" with { type: "json" };

/**
 * Application version shown in companion and glasses UI.
 * Sourced directly from `app.json` so release metadata and UI stay aligned.
 */
export const APP_VERSION = String(appManifest.version ?? "0.0.0");
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
