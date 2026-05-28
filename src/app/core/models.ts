export interface Restaurant {
  id: string;
  name: string;
  country: string;
  imageUrl?: string;
  placeId?: string;
}

export interface UserRestaurant extends Restaurant {
  userId: string;
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
  country: string;
  imageUrl?: string;
}
