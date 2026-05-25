import { bearingDegrees, bearingToCardinal, cardinalToArrow, haversineDistanceKm } from "./geo.js";

/**
 * Normalizes degrees to 0..359.
 * @param {number} degrees
 * @returns {number}
 */
export function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Computes signed shortest-angle delta from heading to target bearing.
 * Result range: -180..180.
 * @param {number} targetBearing
 * @param {number} heading
 * @returns {number}
 */
function signedBearingDelta(targetBearing, heading) {
  const normalized = ((targetBearing - heading + 540) % 360) - 180;
  return normalized === -180 ? 180 : normalized;
}

/**
 * Computes realtime geotrack metrics from current origin and active track target.
 * @param {{ latitude: number, longitude: number }|null|undefined} origin
 * @param {{ cacheId: string, cacheName: string, lat: number, lon: number }|null|undefined} activeTrack
 * @param {number} [viewerHeading=0]
 * @returns {{
 *   cacheId: string,
 *   cacheName: string,
 *   distanceKm: number,
 *   bearing: number,
 *   direction: string,
 *   arrow: string,
 *   relativeBearing: number,
 *   heading: number
 * }|null}
 */
export function computeActiveTrackMetrics(origin, activeTrack, viewerHeading = 0) {
  if (!origin || !activeTrack) {
    return null;
  }

  const target = {
    latitude: activeTrack.lat,
    longitude: activeTrack.lon
  };

  const bearing = bearingDegrees(origin, target);
  const distanceKm = haversineDistanceKm(origin, target);
  const direction = bearingToCardinal(bearing);
  const heading = normalizeDegrees(viewerHeading);
  const relativeBearing = signedBearingDelta(bearing, heading);

  return {
    cacheId: activeTrack.cacheId,
    cacheName: activeTrack.cacheName,
    distanceKm,
    bearing,
    direction,
    arrow: cardinalToArrow(direction),
    relativeBearing,
    heading
  };
}
