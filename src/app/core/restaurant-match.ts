import { toFirestoreDocumentId } from './firestore-id';
import type { RestaurantSuggestion, UserRestaurant } from './models';

export function isRestaurantAlreadyInList(
  restaurants: UserRestaurant[],
  suggestion: RestaurantSuggestion,
): boolean {
  const docId = toFirestoreDocumentId(suggestion.id);
  const name = suggestion.name.trim().toLowerCase();
  const city = suggestion.city.trim().toLowerCase();

  return restaurants.some((item) => {
    if (item.restaurantId === docId) {
      return true;
    }
    return item.name.trim().toLowerCase() === name && item.city.trim().toLowerCase() === city;
  });
}
