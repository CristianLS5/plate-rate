import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { RestaurantSuggestion } from './models';
import { environment } from '../../environments/environment';

interface SearchResponse {
  suggestions: RestaurantSuggestion[];
}

@Injectable({ providedIn: 'root' })
export class RestaurantSearchService {
  private readonly http = inject(HttpClient);

  async search(query: string, country: string): Promise<RestaurantSuggestion[]> {
    if (query.trim().length < 2) {
      return [];
    }

    const params = new HttpParams().set('query', query).set('country', country);

    if (environment.apiBaseUrl) {
      const response = await firstValueFrom(
        this.http.get<SearchResponse>(`${environment.apiBaseUrl}/searchRestaurants`, { params }),
      );
      return response.suggestions;
    }

    const photonResponse = await firstValueFrom(
      this.http.get<{ features: Array<{ properties: Record<string, string>; geometry: { coordinates: number[] } }> }>(
        'https://photon.komoot.io/api/',
        { params: new HttpParams().set('q', `${query} ${country}`).set('limit', 10) },
      ),
    );

    return photonResponse.features
      .map((feature) => {
        const name = feature.properties['name'] ?? '';
        const area = feature.properties['country'] ?? country;
        if (!name || !area) {
          return null;
        }
        const id = `${name}-${area}-${feature.geometry.coordinates.join('-')}`;
        return { id, name, country: area } satisfies RestaurantSuggestion;
      })
      .filter((item): item is RestaurantSuggestion => item !== null);
  }
}
