export interface RestaurantSearchResult {
  id: string;
  name: string;
  city: string;
  placeId?: string;
  lat?: number;
  lon?: number;
}

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

export async function searchRestaurantsViaPhoton(
  query: string,
  city: string,
  maxResults = 10,
): Promise<RestaurantSearchResult[]> {
  const searchText = `${query.trim()} ${city.trim()}`;
  const url = new URL(PHOTON_API);
  url.searchParams.set('q', searchText);
  url.searchParams.set('limit', '20');
  url.searchParams.set('lang', 'en');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Photon API error (${response.status})`);
  }

  const body = (await response.json()) as {
    features?: Array<{ properties: Record<string, string>; geometry: { coordinates: number[] } }>;
  };

  const seen = new Set<string>();
  const foodFirst: RestaurantSearchResult[] = [];
  const other: RestaurantSearchResult[] = [];

  for (const [index, feature] of (body.features ?? []).entries()) {
    const suggestion = mapFeature(feature, city, index);
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

  return [...foodFirst, ...other].slice(0, maxResults);
}

function mapFeature(
  feature: { properties: Record<string, string>; geometry: { coordinates: number[] } },
  cityFallback: string,
  index: number,
): RestaurantSearchResult | null {
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
  const osmId = feature.properties['osm_id'];
  const osmType = feature.properties['osm_type'] ?? 'place';
  const id =
    osmId !== undefined && osmId !== ''
      ? `${osmType}-${osmId}`
      : `${name}-${city}-${lng}-${lat}-${index}`;

  return {
    id,
    name,
    city,
    lat,
    lon: lng,
    placeId: osmId !== undefined && osmId !== '' ? osmId : undefined,
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
