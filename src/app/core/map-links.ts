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

export interface MapUrlFields {
  mapsUrl?: string;
  mapsEmbedUrl?: string;
}

export function buildMapUrls(item: {
  lat?: number;
  lon?: number;
  name?: string;
}): MapUrlFields {
  const name = item.name;
  if (!hasCoordinates(item)) {
    return {};
  }
  return {
    mapsUrl: googleMapsUrl(item.lat, item.lon, name),
    mapsEmbedUrl: googleMapsEmbedUrl(item.lat, item.lon, name),
  };
}

/** Resolve stored map fields from Firestore, including legacy `imageUrl` embeds. */
export function resolveStoredMapUrls(data: {
  mapsUrl?: string;
  mapsEmbedUrl?: string;
  imageUrl?: string;
  lat?: number;
  lon?: number;
  name?: string;
}): MapUrlFields {
  const mapsUrl = data.mapsUrl?.trim() || undefined;
  const legacyEmbed = data.imageUrl?.trim();
  const mapsEmbedUrl =
    data.mapsEmbedUrl?.trim() ||
    (legacyEmbed && legacyEmbed.includes('google.com/maps') ? legacyEmbed : undefined);

  if (mapsUrl && mapsEmbedUrl) {
    return { mapsUrl, mapsEmbedUrl };
  }

  const generated = buildMapUrls(data);
  return {
    mapsUrl: mapsUrl ?? generated.mapsUrl,
    mapsEmbedUrl: mapsEmbedUrl ?? generated.mapsEmbedUrl,
  };
}
