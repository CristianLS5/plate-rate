import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

const db = getFirestore();

export const searchRestaurants = onRequest(async (req, res) => {
  const queryValue = String(req.query.query ?? '').trim();
  const country = String(req.query.country ?? '').trim();
  if (queryValue.length < 2) {
    res.status(200).json({ suggestions: [] });
    return;
  }

  const photonQuery = encodeURIComponent(`${queryValue} ${country}`.trim());
  const response = await fetch(`https://photon.komoot.io/api/?q=${photonQuery}&limit=10`);
  const body = (await response.json()) as {
    features?: Array<{ properties?: { name?: string; country?: string }; geometry?: { coordinates?: number[] } }>;
  };

  const suggestions =
    body.features
      ?.map((feature) => {
        const name = feature.properties?.name;
        const itemCountry = feature.properties?.country ?? country;
        const coordinates = feature.geometry?.coordinates ?? [];
        if (!name || !itemCountry || coordinates.length < 2) {
          return null;
        }
        return {
          id: `${name}-${itemCountry}-${coordinates[0]}-${coordinates[1]}`,
          name,
          country: itemCountry,
        };
      })
      .filter((item): item is { id: string; name: string; country: string } => item !== null) ?? [];

  res.status(200).json({ suggestions });
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
