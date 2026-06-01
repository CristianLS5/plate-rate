import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { searchRestaurantsViaPhoton } from './photon-search';
import type { RestaurantSuggestion } from './models';
import { environment } from '../../environments/environment';

interface SearchResponse {
  suggestions: RestaurantSuggestion[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class RestaurantSearchService {
  private readonly http = inject(HttpClient);

  async search(query: string, city: string): Promise<RestaurantSuggestion[]> {
    if (query.trim().length < 2 || city.trim().length < 2) {
      return [];
    }

    if (environment.apiBaseUrl) {
      const params = new HttpParams().set('query', query).set('city', city);
      const response = await firstValueFrom(
        this.http.get<SearchResponse>(`${environment.apiBaseUrl}/searchRestaurants`, { params }),
      );
      if (response.error) {
        console.warn('Restaurant search failed:', response.error);
      }
      return response.suggestions ?? [];
    }

    try {
      return await searchRestaurantsViaPhoton(query, city, 10);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown Photon error';
      console.warn('Restaurant search failed:', message);
      return [];
    }
  }
}
