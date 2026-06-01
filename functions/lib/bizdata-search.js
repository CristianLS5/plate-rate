"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRestaurantsViaBizData = searchRestaurantsViaBizData;
const DEFAULT_BIZDATA_API_URL = 'https://bizdata-web.vercel.app';
async function searchRestaurantsViaBizData(query, country, maxResults = 10, baseUrl = process.env.BIZDATA_API_URL?.trim() || DEFAULT_BIZDATA_API_URL) {
    const apiRoot = baseUrl.replace(/\/$/, '');
    const url = new URL(`${apiRoot}/api/businesses`);
    url.searchParams.set('location', country.trim());
    url.searchParams.set('category', 'restaurant');
    url.searchParams.set('limit', '50');
    url.searchParams.set('radius_km', '25');
    const response = await fetch(url.toString());
    if (!response.ok) {
        const details = await response.text();
        throw new Error(`BizData API error (${response.status}): ${details}`);
    }
    const body = (await response.json());
    if (body.error) {
        throw new Error(body.error);
    }
    const needle = query.trim().toLowerCase();
    const countryLabel = resolveCountryLabel(body.location_resolved, country);
    const seen = new Set();
    const suggestions = [];
    for (const business of body.businesses ?? []) {
        if (!business.name.toLowerCase().includes(needle)) {
            continue;
        }
        const osmId = business.osm_id;
        const id = osmId !== undefined ? `osm-${osmId}` : `${business.name}-${countryLabel}`;
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        suggestions.push({
            id,
            name: business.name,
            country: countryLabel,
            placeId: osmId !== undefined ? String(osmId) : undefined,
        });
        if (suggestions.length >= maxResults) {
            break;
        }
    }
    return suggestions;
}
function resolveCountryLabel(locationResolved, fallback) {
    if (!locationResolved?.trim()) {
        return fallback.trim();
    }
    const parts = locationResolved.split(',').map((part) => part.trim()).filter(Boolean);
    return parts.at(-1) ?? fallback.trim();
}
