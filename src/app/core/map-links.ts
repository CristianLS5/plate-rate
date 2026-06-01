/**
 * Google Maps embed from coordinates (no API key).
 * Note: Share → "Embed a map" in Google Maps UI produces a long `pb=...` URL for one
 * specific place. We build an equivalent embed from Photon lat/lon instead.
 */
export function googleMapsEmbedUrl(lat: number, lon: number, name?: string, zoom = 15): string {
  const label = name?.trim();
  const query = label ? encodeURIComponent(`${label}@${lat},${lon}`) : `${lat},${lon}`;
  return `https://www.google.com/maps?q=${query}&z=${zoom}&output=embed`;
}

/** Opens the full Google Maps app/site (new tab). */
export function googleMapsUrl(lat: number, lon: number, name?: string): string {
  const label = name?.trim();
  const query = label ? encodeURIComponent(`${label}@${lat},${lon}`) : `${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function hasCoordinates(item: { lat?: number; lon?: number }): item is { lat: number; lon: number } {
  return Number.isFinite(item.lat) && Number.isFinite(item.lon);
}
