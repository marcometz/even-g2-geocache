const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(from, to) {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function bearingDegrees(from, to) {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLon);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

export function bearingToCardinal(degrees) {
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % labels.length;
  return labels[index];
}

export function cardinalToArrow(cardinal) {
  const arrows = {
    N: "↑",
    NE: "↗",
    E: "→",
    SE: "↘",
    S: "↓",
    SW: "↙",
    W: "←",
    NW: "↖"
  };

  return arrows[cardinal] ?? "↑";
}
