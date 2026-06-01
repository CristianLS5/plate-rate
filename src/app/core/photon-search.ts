import { buildMapUrls } from './map-links';
import type { RestaurantSuggestion } from './models';

const PHOTON_API = 'https://photon.komoot.io/api/';

const FOOD_OSM_VALUES = new Set([
  'restaurant',
  'cafe',
  'bar',
  'fast_food',
  'food_court',
  'biergarten',
  'pub',
  'ice_cream',
  'bakery',
]);

interface PhotonFeature {
  properties: Record<string, string>;
  geometry: { coordinates: number[] };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

export async function searchRestaurantsViaPhoton(
  query: string,
  city: string,
  maxResults = 10,
): Promise<RestaurantSuggestion[]> {
  const searchText = `${query.trim()} ${city.trim()}`;
  const url = new URL(PHOTON_API);
  url.searchParams.set('q', searchText);
  url.searchParams.set('limit', '20');
  url.searchParams.set('lang', 'en');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Photon API error (${response.status})`);
  }

  const body = (await response.json()) as PhotonResponse;
  const seen = new Set<string>();
  const suggestions: RestaurantSuggestion[] = [];
  const foodFirst: RestaurantSuggestion[] = [];
  const other: RestaurantSuggestion[] = [];

  for (const [index, feature] of (body.features ?? []).entries()) {
    const suggestion = mapFeatureToSuggestion(feature, city, index);
    if (!suggestion || seen.has(suggestion.id)) {
      continue;
    }
    seen.add(suggestion.id);

    const osmValue = feature.properties['osm_value'] ?? '';
    if (FOOD_OSM_VALUES.has(osmValue)) {
      foodFirst.push(suggestion);
    } else {
      other.push(suggestion);
    }
  }

  for (const item of [...foodFirst, ...other]) {
    suggestions.push(item);
    if (suggestions.length >= maxResults) {
      break;
    }
  }

  return suggestions;
}

function mapFeatureToSuggestion(
  feature: PhotonFeature,
  cityFallback: string,
  index: number,
): RestaurantSuggestion | null {
  const name = feature.properties['name']?.trim();
  if (!name) {
    return null;
  }

  const coordinates = feature.geometry?.coordinates ?? [];
  if (coordinates.length < 2) {
    return null;
  }

  const [lng, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const city = resolveCity(feature.properties, cityFallback);
  const country = feature.properties['country']?.trim() || undefined;
  const osmId = feature.properties['osm_id'];
  const osmType = feature.properties['osm_type'] ?? 'place';
  const id =
    osmId !== undefined && osmId !== ''
      ? `${osmType}-${osmId}`
      : `${name}-${city}-${lng}-${lat}-${index}`;

  const base = {
    id,
    name,
    city,
    country,
    lat,
    lon: lng,
    placeId: osmId !== undefined && osmId !== '' ? osmId : undefined,
  };

  return {
    ...base,
    ...buildMapUrls(base),
  };
}

function resolveCity(properties: Record<string, string>, cityFallback: string): string {
  return (
    properties['city']?.trim() ||
    properties['town']?.trim() ||
    properties['district']?.trim() ||
    properties['municipality']?.trim() ||
    cityFallback.trim()
  );
}
