"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchGooglePlacesViaApify = searchGooglePlacesViaApify;
const APIFY_ACTOR_ID = 'compass~crawler-google-places';
async function searchGooglePlacesViaApify(token, query, country, maxResults = 10) {
    const input = {
        searchStringsArray: [query],
        locationQuery: country,
        maxCrawledPlacesPerSearch: maxResults,
        language: 'en',
        scrapePlaceDetailPage: false,
        maxReviews: 0,
        maxImages: 0,
        skipClosedPlaces: true,
    };
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${encodeURIComponent(token)}&waitForFinish=180`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!runResponse.ok) {
        const details = await runResponse.text();
        throw new Error(`Apify actor run failed (${runResponse.status}): ${details}`);
    }
    const runPayload = (await runResponse.json());
    const datasetId = runPayload.data?.defaultDatasetId;
    if (!datasetId) {
        return [];
    }
    const itemsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&format=json&limit=${maxResults}`);
    if (!itemsResponse.ok) {
        const details = await itemsResponse.text();
        throw new Error(`Apify dataset fetch failed (${itemsResponse.status}): ${details}`);
    }
    const places = (await itemsResponse.json());
    const seen = new Set();
    const suggestions = [];
    for (const place of places) {
        const suggestion = mapPlaceToSuggestion(place);
        if (!suggestion || seen.has(suggestion.id)) {
            continue;
        }
        seen.add(suggestion.id);
        suggestions.push(suggestion);
    }
    return suggestions;
}
function mapPlaceToSuggestion(place) {
    const name = place.title?.trim();
    if (!name) {
        return null;
    }
    const placeId = place.placeId?.trim();
    const country = resolveCountryLabel(place);
    const id = placeId ?? `${name}-${country}`;
    return {
        id,
        name,
        country,
        imageUrl: place.imageUrl?.trim() || undefined,
        placeId: placeId || undefined,
    };
}
function resolveCountryLabel(place) {
    if (place.countryCode?.trim()) {
        return place.countryCode.trim();
    }
    if (place.state?.trim()) {
        return place.state.trim();
    }
    if (place.city?.trim()) {
        return place.city.trim();
    }
    return 'Unknown';
}
