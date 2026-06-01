import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { searchRestaurantsViaPhoton } from './photon-search';

initializeApp();

const db = getFirestore();

export const searchRestaurants = onRequest({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
  const queryValue = String(req.query.query ?? '').trim();
  const city = String(req.query.city ?? req.query.country ?? '').trim();
  if (queryValue.length < 2 || city.length < 2) {
    res.status(200).json({ suggestions: [] });
    return;
  }

  try {
    const suggestions = await searchRestaurantsViaPhoton(queryValue, city, 10);
    res.status(200).json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown Photon error';
    res.status(502).json({ error: message, suggestions: [] });
  }
});

export const aggregateRestaurantStats = onDocumentWritten('opinions/{opinionId}', async (event) => {
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  const restaurantId = String(after?.restaurantId ?? before?.restaurantId ?? '');
  if (!restaurantId) {
    return;
  }

  const snapshot = await db.collection('opinions').where('restaurantId', '==', restaurantId).get();
  const rates = snapshot.docs.map((doc) => Number(doc.data().rate)).filter((value) => Number.isFinite(value));
  const ratingsCount = rates.length;
  const globalRateAvg = ratingsCount > 0 ? rates.reduce((sum, value) => sum + value, 0) / ratingsCount : 0;

  await db.collection('restaurantStats').doc(restaurantId).set(
    {
      restaurantId,
      ratingsCount,
      globalRateAvg,
    },
    { merge: true },
  );
});
