"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateRestaurantStats = exports.searchRestaurants = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const firestore_2 = require("firebase-admin/firestore");
const photon_search_1 = require("./photon-search");
(0, app_1.initializeApp)();
const db = (0, firestore_2.getFirestore)();
exports.searchRestaurants = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    const queryValue = String(req.query.query ?? '').trim();
    const city = String(req.query.city ?? req.query.country ?? '').trim();
    if (queryValue.length < 2 || city.length < 2) {
        res.status(200).json({ suggestions: [] });
        return;
    }
    try {
        const suggestions = await (0, photon_search_1.searchRestaurantsViaPhoton)(queryValue, city, 10);
        res.status(200).json({ suggestions });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Photon error';
        res.status(502).json({ error: message, suggestions: [] });
    }
});
async function recomputeRestaurantStats(restaurantId) {
    const snapshot = await db.collection('userRestaurants').where('restaurantId', '==', restaurantId).get();
    const rates = snapshot.docs
        .map((doc) => Number(doc.data().userRate))
        .filter((value) => Number.isFinite(value));
    const ratingsCount = rates.length;
    const globalRateAvg = ratingsCount > 0 ? rates.reduce((sum, value) => sum + value, 0) / ratingsCount : 0;
    await db.collection('restaurantStats').doc(restaurantId).set({
        restaurantId,
        ratingsCount,
        globalRateAvg,
    }, { merge: true });
}
exports.aggregateRestaurantStats = (0, firestore_1.onDocumentWritten)('userRestaurants/{entryId}', async (event) => {
    const after = event.data?.after.data();
    const before = event.data?.before.data();
    const restaurantId = String(after?.restaurantId ?? before?.restaurantId ?? '');
    if (!restaurantId) {
        return;
    }
    await recomputeRestaurantStats(restaurantId);
});
