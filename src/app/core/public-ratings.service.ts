import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { resolveStoredMapUrls } from './map-links';
import type { Opinion, Restaurant, RestaurantStats } from './models';

@Injectable({ providedIn: 'root' })
export class PublicRatingsService {
  async getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    const snapshot = await getDoc(doc(db, 'restaurants', restaurantId));
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as Omit<Restaurant, 'id'> & {
      country?: string;
      imageUrl?: string;
    };
    const mapUrls = resolveStoredMapUrls({
      mapsUrl: data.mapsUrl,
      mapsEmbedUrl: data.mapsEmbedUrl,
      imageUrl: data.imageUrl,
      lat: data.lat,
      lon: data.lon,
      name: data.name,
    });

    return {
      id: snapshot.id,
      ...data,
      city: data.city ?? '',
      country: data.country ?? undefined,
      mapsUrl: mapUrls.mapsUrl,
      mapsEmbedUrl: mapUrls.mapsEmbedUrl,
    };
  }

  async getStats(restaurantId: string): Promise<RestaurantStats> {
    const snapshot = await getDoc(doc(db, 'restaurantStats', restaurantId));
    if (!snapshot.exists()) {
      return { restaurantId, globalRateAvg: 0, ratingsCount: 0 };
    }
    return snapshot.data() as RestaurantStats;
  }

  async getOpinions(restaurantId: string): Promise<Opinion[]> {
    const q = query(collection(db, 'opinions'), where('restaurantId', '==', restaurantId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => d.data() as Opinion)
      .sort((a, b) => {
        if (a.rate !== b.rate) {
          return b.rate - a.rate;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async getUserOpinion(restaurantId: string, userId: string): Promise<Opinion | null> {
    const q = query(
      collection(db, 'opinions'),
      where('restaurantId', '==', restaurantId),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const firstDoc = snapshot.docs.at(0);
    return firstDoc ? (firstDoc.data() as Opinion) : null;
  }
}
