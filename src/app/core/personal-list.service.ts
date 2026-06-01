import { Injectable, signal } from '@angular/core';
import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { toFirestoreDocumentId } from './firestore-id';
import { db } from './firebase';
import { buildMapUrls, resolveStoredMapUrls } from './map-links';
import type { RestaurantSuggestion, UserRestaurant } from './models';

type FirestoreUserRestaurant = Omit<UserRestaurant, 'id' | 'restaurantId'> & {
  restaurantId?: string;
  country?: string;
  city?: string;
  imageUrl?: string;
  mapsUrl?: string;
  mapsEmbedUrl?: string;
};

@Injectable({ providedIn: 'root' })
export class PersonalListService {
  private readonly restaurantsState = signal<UserRestaurant[]>([]);
  readonly restaurants = this.restaurantsState.asReadonly();

  async loadByUser(userId: string): Promise<void> {
    const q = query(collection(db, 'userRestaurants'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const restaurants = snapshot.docs.map((d) => this.mapDocument(d.id, d.data() as FirestoreUserRestaurant));
    this.restaurantsState.set(restaurants);
  }

  async addRestaurant(userId: string, restaurant: RestaurantSuggestion, userRate?: number): Promise<void> {
    const restaurantId = toFirestoreDocumentId(restaurant.id);
    const generated = buildMapUrls(restaurant);
    const mapUrls = {
      mapsUrl: restaurant.mapsUrl ?? generated.mapsUrl,
      mapsEmbedUrl: restaurant.mapsEmbedUrl ?? generated.mapsEmbedUrl,
    };

    const sharedFields = {
      name: restaurant.name,
      city: restaurant.city,
      country: restaurant.country ?? '',
      placeId: restaurant.placeId ?? restaurant.id,
      lat: restaurant.lat ?? null,
      lon: restaurant.lon ?? null,
      mapsUrl: mapUrls.mapsUrl ?? '',
      mapsEmbedUrl: mapUrls.mapsEmbedUrl ?? '',
    };

    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await setDoc(restaurantRef, sharedFields, { merge: true });

    const userRestaurant: Omit<UserRestaurant, 'id'> = {
      userId,
      restaurantId,
      ...sharedFields,
      lat: restaurant.lat,
      lon: restaurant.lon,
      mapsUrl: mapUrls.mapsUrl,
      mapsEmbedUrl: mapUrls.mapsEmbedUrl,
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

  private mapDocument(id: string, data: FirestoreUserRestaurant): UserRestaurant {
    const mapUrls = resolveStoredMapUrls({
      mapsUrl: data.mapsUrl,
      mapsEmbedUrl: data.mapsEmbedUrl,
      imageUrl: data.imageUrl,
      lat: data.lat,
      lon: data.lon,
      name: data.name,
    });

    return {
      ...data,
      id,
      restaurantId: data.restaurantId ?? id,
      city: data.city ?? '',
      country: data.country ?? undefined,
      mapsUrl: mapUrls.mapsUrl,
      mapsEmbedUrl: mapUrls.mapsEmbedUrl,
    };
  }
}
