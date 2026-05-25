/**
 * @typedef {"Click"|"DoubleClick"|"Up"|"Down"} GlassInputEventType
 */

/**
 * Reads list selection metadata from event payload when provided by host.
 * @param {unknown} event
 * @returns {{ index: number, containerName: string|null, containerID: number|null }|null}
 */
export function readListSelection(event) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const payload = /** @type {Record<string, unknown>} */ (event);
  const candidates = [payload.listEvent, payload.jsonData];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = /** @type {Record<string, unknown>} */ (candidate);
    const rawIndex = record.currentSelectItemIndex ?? record.current_select_item_index ?? record.CurrentSelect_ItemIndex;
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 0) {
      continue;
    }

    const rawContainerName = record.containerName ?? record.container_name ?? null;
    const containerName = typeof rawContainerName === "string" ? rawContainerName : null;
    const rawContainerID = record.containerID ?? record.container_id ?? null;
    const containerID = Number.isInteger(Number(rawContainerID)) ? Number(rawContainerID) : null;

    return { index, containerName, containerID };
  }

  return null;
}

/**
 * Reads the selected list index from event payload when provided by host.
 * @param {unknown} event
 * @returns {number|null}
 */
export function readListSelectionIndex(event) {
  return readListSelection(event)?.index ?? null;
}

/**
 * Extracts an event type value from an SDK event branch.
 * @param {unknown} part
 * @returns {unknown}
 */
function readEventType(part) {
  if (!part || typeof part !== "object") {
    return undefined;
  }

  const record = /** @type {Record<string, unknown>} */ (part);
  return record.eventType ?? record.event_type ?? record.Event_Type;
}

/**
 * Maps an EvenHub event to a normalized input event for app navigation.
 * @param {unknown} event
 * @param {{ fromJson: (value: unknown) => number | undefined }} osEventTypeResolver
 * @returns {GlassInputEventType|null}
 */
export function mapEvenHubEvent(event, osEventTypeResolver) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const payload = /** @type {Record<string, unknown>} */ (event);
  const rawTypes = [
    readEventType(payload.listEvent),
    readEventType(payload.textEvent),
    readEventType(payload.sysEvent)
  ];

  for (const rawType of rawTypes) {
    if (rawType === undefined) {
      continue;
    }

    const normalized = osEventTypeResolver.fromJson(rawType);
    if (normalized === 0) {
      return "Click";
    }
    if (normalized === 1) {
      return "Up";
    }
    if (normalized === 2) {
      return "Down";
    }
    if (normalized === 3) {
      return "DoubleClick";
    }
  }

  if (readListSelection(event) !== null) {
    return null;
  }

  // Regression guard: host payloads can omit zero-valued click eventType.
  if (payload.sysEvent || payload.listEvent || payload.textEvent) {
    return "Click";
  }

  return null;
}
