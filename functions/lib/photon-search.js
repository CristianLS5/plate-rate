"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRestaurantsViaPhoton = searchRestaurantsViaPhoton;
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
async function searchRestaurantsViaPhoton(query, country, maxResults = 10) {
    const searchText = `${query.trim()} ${country.trim()}`;
    const url = new URL(PHOTON_API);
    url.searchParams.set('q', searchText);
    url.searchParams.set('limit', '20');
    url.searchParams.set('lang', 'en');
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Photon API error (${response.status})`);
    }
    const body = (await response.json());
    const seen = new Set();
    const foodFirst = [];
    const other = [];
    for (const [index, feature] of (body.features ?? []).entries()) {
        const suggestion = mapFeature(feature, country, index);
        if (!suggestion || seen.has(suggestion.id)) {
            continue;
        }
        seen.add(suggestion.id);
        const osmValue = feature.properties['osm_value'] ?? '';
        if (FOOD_OSM_VALUES.has(osmValue)) {
            foodFirst.push(suggestion);
        }
        else {
            other.push(suggestion);
        }
    }
    return [...foodFirst, ...other].slice(0, maxResults);
}
function mapFeature(feature, countryFallback, index) {
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
    const country = feature.properties['country']?.trim() || countryFallback.trim();
    const osmId = feature.properties['osm_id'];
    const osmType = feature.properties['osm_type'] ?? 'place';
    const id = osmId !== undefined && osmId !== ''
        ? `${osmType}-${osmId}`
        : `${name}-${country}-${lng}-${lat}-${index}`;
    return {
        id,
        name,
        country,
        lat,
        lon: lng,
        placeId: osmId !== undefined && osmId !== '' ? osmId : undefined,
    };
}
