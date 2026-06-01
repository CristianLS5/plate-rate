import { doc, setDoc } from 'firebase/firestore';
import { toFirestoreDocumentId } from './firestore-id';
import { db } from './firebase';

export function restaurantRatingDocId(restaurantId: string, userId: string): string {
  return toFirestoreDocumentId(`${restaurantId}__${userId}`);
}

export async function syncRestaurantRating(entry: {
  restaurantId: string;
  userId: string;
  userName?: string;
  userRate?: number | null;
}): Promise<void> {
  await setDoc(
    doc(db, 'restaurantRatings', restaurantRatingDocId(entry.restaurantId, entry.userId)),
    {
      restaurantId: entry.restaurantId,
      userId: entry.userId,
      userName: entry.userName?.trim() || null,
      userRate: entry.userRate ?? null,
    },
    { merge: true },
  );
}
