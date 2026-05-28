import { Injectable, signal } from '@angular/core';
import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import type { RestaurantSuggestion, UserRestaurant } from './models';

@Injectable({ providedIn: 'root' })
export class PersonalListService {
  private readonly restaurantsState = signal<UserRestaurant[]>([]);
  readonly restaurants = this.restaurantsState.asReadonly();

  async loadByUser(userId: string): Promise<void> {
    const q = query(collection(db, 'userRestaurants'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const restaurants = snapshot.docs.map((d) => ({ ...(d.data() as Omit<UserRestaurant, 'id'>), id: d.id }));
    this.restaurantsState.set(restaurants);
  }

  async addRestaurant(userId: string, restaurant: RestaurantSuggestion, userRate?: number): Promise<void> {
    const restaurantRef = doc(db, 'restaurants', restaurant.id);
    await setDoc(
      restaurantRef,
      {
        name: restaurant.name,
        country: restaurant.country,
        imageUrl: restaurant.imageUrl ?? '',
      },
      { merge: true },
    );

    await addDoc(collection(db, 'userRestaurants'), {
      userId,
      restaurantId: restaurant.id,
      name: restaurant.name,
      country: restaurant.country,
      imageUrl: restaurant.imageUrl ?? '',
      userRate: userRate ?? null,
      addedAt: new Date().toISOString(),
    });

    await this.loadByUser(userId);
  }
}
