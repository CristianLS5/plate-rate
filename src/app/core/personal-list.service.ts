import { Injectable, signal } from '@angular/core';
import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { toFirestoreDocumentId } from './firestore-id';
import { db } from './firebase';
import type { RestaurantSuggestion, UserRestaurant } from './models';

@Injectable({ providedIn: 'root' })
export class PersonalListService {
  private readonly restaurantsState = signal<UserRestaurant[]>([]);
  readonly restaurants = this.restaurantsState.asReadonly();

  async loadByUser(userId: string): Promise<void> {
    const q = query(collection(db, 'userRestaurants'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const restaurants = snapshot.docs.map((d) => {
      const data = d.data() as Omit<UserRestaurant, 'id' | 'city'> & {
        restaurantId?: string;
        country?: string;
        city?: string;
      };
      return {
        ...data,
        id: d.id,
        restaurantId: data.restaurantId ?? d.id,
        city: data.city ?? data.country ?? '',
      };
    });
    this.restaurantsState.set(restaurants);
  }

  async addRestaurant(userId: string, restaurant: RestaurantSuggestion, userRate?: number): Promise<void> {
    const restaurantId = toFirestoreDocumentId(restaurant.id);
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await setDoc(
      restaurantRef,
      {
        name: restaurant.name,
        city: restaurant.city,
        imageUrl: restaurant.imageUrl ?? '',
        placeId: restaurant.placeId ?? restaurant.id,
        lat: restaurant.lat ?? null,
        lon: restaurant.lon ?? null,
      },
      { merge: true },
    );

    const userRestaurant: Omit<UserRestaurant, 'id'> = {
      userId,
      restaurantId,
      name: restaurant.name,
      city: restaurant.city,
      imageUrl: restaurant.imageUrl ?? '',
      placeId: restaurant.placeId ?? restaurant.id,
      lat: restaurant.lat,
      lon: restaurant.lon,
      userRate: userRate ?? undefined,
      addedAt: new Date().toISOString(),
    };
    const addedRef = await addDoc(collection(db, 'userRestaurants'), {
      ...userRestaurant,
      userRate: userRate ?? null,
    });

    this.restaurantsState.update((current) => [{ ...userRestaurant, id: addedRef.id }, ...current]);

    try {
      await this.loadByUser(userId);
    } catch {
      // Writes succeeded; a failed reload should not block the add action.
    }
  }
}
