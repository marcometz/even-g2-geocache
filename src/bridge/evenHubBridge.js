import { mapEvenHubEvent, readListSelection } from "../input/evenHubEventMapper.js";

const IMAGE_UPDATE_TIMEOUT_MS = 350;

/**
 * Resolves a bridge promise with a timeout fallback so hardware-side stalls do
 * not block app interaction forever.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {T} fallbackValue
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, fallbackValue) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallbackValue);
      }
    }, timeoutMs);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallbackValue);
        }
      });
  });
}

/**
 * Minimal EvenHub bridge wrapper for startup rendering and input handling.
 */
export class EvenHubBridgeClient {
  constructor() {
    /** @type {any | null} */
    this.bridge = null;
    /** @type {boolean} */
    this.ready = false;
    /** @type {boolean} */
    this.created = false;
    /** @type {((() => void)) | null} */
    this.unsubscribe = null;
    /** @type {{ fromJson: (value: unknown) => number | undefined } | null} */
    this.osEventTypeList = null;
    /** @type {((heading: number) => void) | null} */
    this.headingHandler = null;
    /** @type {any | null} */
    this.imuReportPace = null;
    /** @type {((event: unknown) => { type: string, direction?: "up"|"down" }|null)|null} */
    this.toolkitEventMapper = null;
  }

  /**
   * Connects to the EvenHub runtime bridge.
   * @returns {Promise<void>}
   */
  async connect() {
    const sdk = await import("@evenrealities/even_hub_sdk");
    this.bridge = await sdk.waitForEvenAppBridge();
    this.osEventTypeList = sdk.OsEventTypeList;
    this.imuReportPace = sdk.ImuReportPace ?? null;

    try {
      const toolkit = await import("even-toolkit/action-map");
      this.toolkitEventMapper = typeof toolkit.mapGlassEvent === "function" ? toolkit.mapGlassEvent : null;
    } catch {
      this.toolkitEventMapper = null;
    }

    if (this.bridge?.imuControl && this.imuReportPace?.P500) {
      try {
        await this.bridge.imuControl(true, this.imuReportPace.P500);
      } catch {
        // Keep app running even when IMU is unavailable.
      }
    }

    this.ready = true;
  }

  /**
   * Registers heading callback from IMU sys events (fallback for missing DOM orientation events).
   * @param {(heading: number) => void} handler
   */
  onHeading(handler) {
    this.headingHandler = handler;
  }

  /**
   * Registers input callback mapped from EvenHub events.
    * @param {(input: { type: "Click"|"DoubleClick"|"Up"|"Down"|"SelectionChange", selectedIndex?: number }) => void} handler
   */
  onInput(handler) {
    if (!this.bridge?.onEvenHubEvent || !this.osEventTypeList) {
      return;
    }

    this.unsubscribe?.();
    this.unsubscribe = this.bridge.onEvenHubEvent((event) => {
      const imuHeading = readHeadingFromImuEvent(event);
      if (imuHeading !== null && this.headingHandler) {
        this.headingHandler(imuHeading);
      }

      const selection = readListSelection(event);
      if (selection) {
        handler({ type: "SelectionChange", selection });
        return;
      }

      const mapped = mapEvenHubEvent(event, this.osEventTypeList, this.toolkitEventMapper);
      if (mapped) {
        handler({ type: mapped });
      }
    });
  }

  /**
   * Creates startup page once.
   * @param {Record<string, unknown>} payload
   * @returns {Promise<boolean>}
   */
  async createStartup(payload) {
    if (!this.ready || !this.bridge?.createStartUpPageContainer) {
      return false;
    }

    if (this.created) {
      return true;
    }

    const result = await this.bridge.createStartUpPageContainer(payload);
    const success = result === 0 || result === true || result === "0" || result === "success";
    if (success) {
      this.created = true;
    }
    return success;
  }

  /**
   * Rebuilds page containers after startup.
   * @param {Record<string, unknown>} payload
   * @returns {Promise<boolean>}
   */
  async rebuild(payload) {
    if (!this.ready || !this.bridge?.rebuildPageContainer) {
      return false;
    }
    return this.bridge.rebuildPageContainer(payload);
  }

  /**
   * Partial in-place text update for a single existing text container.
   * Flicker-free on hardware compared to a full `rebuild`.
   * @param {{ containerID: number, containerName: string, content: string, contentOffset?: number, contentLength?: number }} payload
   * @returns {Promise<boolean>}
   */
  async upgradeText(payload) {
    if (!this.ready || !this.bridge?.textContainerUpgrade) {
      return false;
    }
    return this.bridge.textContainerUpgrade(payload);
  }

  /**
   * Updates an existing image container with PNG bytes.
   * @param {{ containerID: number, containerName: string, imageData: number[]|Uint8Array|ArrayBuffer|string }} payload
   * @returns {Promise<boolean>}
   */
  async updateImage(payload) {
    if (!this.ready || !this.bridge?.updateImageRawData) {
      return false;
    }

    // On real hardware, image pushes can occasionally stall and never resolve.
    // Protect the interaction loop by timing out quickly instead of awaiting
    // forever in click handlers or render paths.
    return withTimeout(this.bridge.updateImageRawData(payload), IMAGE_UPDATE_TIMEOUT_MS, false);
  }
}

/**
 * Attempts to derive heading degrees from IMU event payload.
 * @param {unknown} event
 * @returns {number|null}
 */
function readHeadingFromImuEvent(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const payload = /** @type {Record<string, unknown>} */ (event);
  const sys = payload.sysEvent;
  if (!sys || typeof sys !== "object") {
    return null;
  }

  const imuData = /** @type {Record<string, unknown>} */ (sys).imuData;
  if (!imuData || typeof imuData !== "object") {
    return null;
  }

  const x = Number((/** @type {Record<string, unknown>} */ (imuData)).x);
  const y = Number((/** @type {Record<string, unknown>} */ (imuData)).y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return Number.isFinite(heading) ? heading : null;
}
