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
  userRate?: number;
  addedAt: string;
}

export interface Opinion {
  restaurantId: string;
  userId: string;
  userName: string;
  rate: number;
  text: string;
  createdAt: string;
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
