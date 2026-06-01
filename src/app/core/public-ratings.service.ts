import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { toFirestoreDocumentId } from './firestore-id';
import type { User } from 'firebase/auth';
import { resolveCommunityDisplayName, resolveRatedDisplayName } from './display-name';
import { parseUserRate } from './user-rate';
import { isPermissionDenied } from './firestore-error';
import { db } from './firebase';
import { resolveStoredMapUrls } from './map-links';
import type {
  CommunityEntry,
  Opinion,
  Restaurant,
  RestaurantStats,
  UserRestaurant,
} from './models';

type FirestoreUserRestaurant = Omit<UserRestaurant, 'id'> & {
  restaurantId?: string;
  imageUrl?: string;
};

function opinionDocId(restaurantId: string, userId: string): string {
  return toFirestoreDocumentId(`${restaurantId}__${userId}`);
}

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

  async getUserRestaurantEntry(
    restaurantId: string,
    userId: string,
  ): Promise<UserRestaurant | null> {
    const q = query(
      collection(db, 'userRestaurants'),
      where('restaurantId', '==', restaurantId),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs.at(0);
    if (!first) {
      return null;
    }
    return this.mapUserRestaurantDoc(first.id, first.data() as FirestoreUserRestaurant);
  }

  async getRatingsForRestaurant(restaurantId: string): Promise<UserRestaurant[]> {
    try {
      return await this.queryRatingsCollection('restaurantRatings', restaurantId);
    } catch (error: unknown) {
      if (!isPermissionDenied(error)) {
        throw error;
      }
    }
    return this.queryRatingsCollection('userRestaurants', restaurantId);
  }

  private async queryRatingsCollection(
    collectionName: 'restaurantRatings' | 'userRestaurants',
    restaurantId: string,
  ): Promise<UserRestaurant[]> {
    const q = query(collection(db, collectionName), where('restaurantId', '==', restaurantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) =>
      this.mapRatingRow(d.id, d.data() as FirestoreUserRestaurant),
    );
  }

  async getOpinionTexts(restaurantId: string): Promise<Opinion[]> {
    const q = query(collection(db, 'opinions'), where('restaurantId', '==', restaurantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data() as Opinion & { rate?: number };
      return {
        restaurantId: data.restaurantId,
        userId: data.userId,
        userName: data.userName ?? '',
        text: data.text ?? '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  }

  computeStatsFromRatings(restaurantId: string, ratings: UserRestaurant[]): RestaurantStats {
    const rates = ratings
      .map((row) => parseUserRate(row.userRate))
      .filter((rate): rate is number => rate != null);
    const ratingsCount = rates.length;
    const globalRateAvg =
      ratingsCount > 0 ? rates.reduce((sum, value) => sum + value, 0) / ratingsCount : 0;
    return { restaurantId, ratingsCount, globalRateAvg };
  }

  buildCommunityEntries(
    ratings: UserRestaurant[],
    opinions: Opinion[],
    currentUserId: string | undefined,
    currentAuthUser: User | null | undefined,
  ): CommunityEntry[] {
    const comments = new Map(
      opinions
        .filter((o) => o.text?.trim())
        .map((o) => [o.userId, o] as const),
    );
    const ratingsByUser = new Map(ratings.map((row) => [row.userId, row] as const));
    const userIds = new Set([...ratingsByUser.keys(), ...comments.keys()]);

    const entries: CommunityEntry[] = [];
    for (const userId of userIds) {
      const row = ratingsByUser.get(userId);
      const opinion = comments.get(userId);
      const commentText = opinion?.text?.trim() || undefined;
      const userRate = parseUserRate(row?.userRate);
      const hasRate = userRate != null;

      if (!hasRate && !commentText) {
        continue;
      }

      const storedUserName = row?.userName ?? opinion?.userName;
      const displayName = hasRate
        ? resolveRatedDisplayName({
            userId,
            userRate,
            storedUserName,
            currentUserId,
            currentAuthUser,
          })
        : resolveCommunityDisplayName({
            userId,
            storedUserName,
            currentUserId,
            currentAuthUser,
          });

      if (!displayName && !hasRate) {
        continue;
      }

      entries.push({
        userId,
        userRate: hasRate ? userRate : undefined,
        displayName,
        commentText,
        commentCreatedAt: opinion?.createdAt,
        isCurrentUser: Boolean(currentUserId && userId === currentUserId),
      });
    }

    return entries.sort((a, b) => {
      const rateA = a.userRate ?? -1;
      const rateB = b.userRate ?? -1;
      if (rateA !== rateB) {
        return rateB - rateA;
      }
      return (a.displayName ?? '').localeCompare(b.displayName ?? '');
    });
  }

  async getUserOpinion(restaurantId: string, userId: string): Promise<Opinion | null> {
    const q = query(
      collection(db, 'opinions'),
      where('restaurantId', '==', restaurantId),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const first = snapshot.docs.at(0);
    if (!first) {
      return null;
    }
    const data = first.data() as Opinion;
    const text = data.text?.trim();
    if (!text) {
      return null;
    }
    return { ...data, text };
  }

  async saveOpinion(
    restaurantId: string,
    userId: string,
    userName: string,
    text: string,
    existingCreatedAt?: string,
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Opinion text cannot be empty.');
    }
    const now = new Date().toISOString();
    const payload = {
      restaurantId,
      userId,
      userName: userName.trim(),
      text: trimmed,
      updatedAt: now,
    };

    const existingQuery = query(
      collection(db, 'opinions'),
      where('restaurantId', '==', restaurantId),
      where('userId', '==', userId),
    );
    const existing = await getDocs(existingQuery);

    if (existing.empty) {
      await setDoc(doc(db, 'opinions', opinionDocId(restaurantId, userId)), {
        ...payload,
        createdAt: existingCreatedAt ?? now,
      });
      return;
    }

    await updateDoc(existing.docs[0].ref, payload);
  }

  private mapRatingRow(id: string, data: FirestoreUserRestaurant): UserRestaurant {
    const userRate = parseUserRate(data.userRate);
    return {
      id,
      userId: data.userId,
      restaurantId: data.restaurantId ?? id,
      name: data.name ?? '',
      city: data.city ?? '',
      country: data.country ?? undefined,
      userName: data.userName?.trim() || undefined,
      userRate,
      addedAt: data.addedAt ?? '',
      mapsUrl: data.mapsUrl,
      mapsEmbedUrl: data.mapsEmbedUrl,
      lat: data.lat,
      lon: data.lon,
    };
  }

  private mapUserRestaurantDoc(id: string, data: FirestoreUserRestaurant): UserRestaurant {
    const mapUrls = resolveStoredMapUrls({
      mapsUrl: data.mapsUrl,
      mapsEmbedUrl: data.mapsEmbedUrl,
      imageUrl: data.imageUrl,
      lat: data.lat,
      lon: data.lon,
      name: data.name,
    });
    const userRate = parseUserRate(data.userRate);

    return {
      ...data,
      id,
      restaurantId: data.restaurantId ?? id,
      city: data.city ?? '',
      country: data.country ?? undefined,
      userName: data.userName?.trim() || undefined,
      userRate,
      mapsUrl: mapUrls.mapsUrl,
      mapsEmbedUrl: mapUrls.mapsEmbedUrl,
    };
  }
}
