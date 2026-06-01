export interface Restaurant {
  id: string;
  name: string;
  city: string;
  country?: string;
  /** @deprecated Use mapsEmbedUrl. Legacy documents may still have embed URLs here. */
  imageUrl?: string;
  mapsUrl?: string;
  mapsEmbedUrl?: string;
  placeId?: string;
  lat?: number;
  lon?: number;
}

export interface UserRestaurant extends Restaurant {
  userId: string;
  restaurantId: string;
  /** Snapshot of display name when the place was saved (preferred for public lists). */
  userName?: string;
  userRate?: number;
  addedAt: string;
}

/** Written commentary only; does not affect rating averages. */
export interface Opinion {
  restaurantId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RestaurantStats {
  restaurantId: string;
  globalRateAvg: number;
  ratingsCount: number;
}

export interface RestaurantSuggestion {
  id: string;
  name: string;
  city: string;
  country?: string;
  mapsUrl?: string;
  mapsEmbedUrl?: string;
  placeId?: string;
  lat?: number;
  lon?: number;
}

/** Merged public row: rating from `userRestaurants`, optional text from `opinions`. */
export interface CommunityEntry {
  userId: string;
  /** Set only when the user saved a numeric rating on their list. */
  userRate?: number;
  displayName?: string;
  commentText?: string;
  commentCreatedAt?: string;
  isCurrentUser: boolean;
}
