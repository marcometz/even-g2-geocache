import { mapEvenHubEvent, readListSelection } from "../input/evenHubEventMapper.js";

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

      const mapped = mapEvenHubEvent(event, this.osEventTypeList);
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
