import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../core/auth.service';
import type { RestaurantSuggestion, UserRestaurant } from '../core/models';
import { PersonalListService } from '../core/personal-list.service';
import { RestaurantSearchService } from '../core/restaurant-search.service';

type ViewMode = 'card' | 'table';
type SortKey = 'name' | 'country' | 'rate' | 'date';

@Component({
  selector: 'app-personal-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './personal.page.html',
  styleUrl: './personal.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalPage {
  private readonly authService = inject(AuthService);
  private readonly listService = inject(PersonalListService);
  private readonly searchService = inject(RestaurantSearchService);

  readonly restaurants = this.listService.restaurants;
  readonly suggestions = signal<RestaurantSuggestion[]>([]);
  readonly selectedSuggestion = signal<RestaurantSuggestion | null>(null);
  readonly viewMode = signal<ViewMode>('card');
  readonly sortKey = signal<SortKey>('name');
  readonly nameFilter = new FormControl('', { nonNullable: true });
  readonly countryFilter = new FormControl('', { nonNullable: true });
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly addCountryControl = new FormControl('', { nonNullable: true });
  readonly rateControl = new FormControl<number | null>(null);

  readonly filteredRestaurants = computed(() => {
    const name = this.nameFilter.value.toLowerCase();
    const country = this.countryFilter.value.toLowerCase();
    const key = this.sortKey();
    const list = this.restaurants().filter((item) => {
      const byName = item.name.toLowerCase().includes(name);
      const byCountry = item.country.toLowerCase().includes(country);
      return byName && byCountry;
    });

    return [...list].sort((a, b) => this.compare(a, b, key));
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user?.uid) {
        void this.listService.loadByUser(user.uid);
      }
    });

    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
      void this.loadSuggestions(query);
    });
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  setSort(sort: SortKey): void {
    this.sortKey.set(sort);
  }

  chooseSuggestion(suggestion: RestaurantSuggestion): void {
    this.selectedSuggestion.set(suggestion);
    this.searchControl.setValue(suggestion.name);
    this.suggestions.set([]);
  }

  async addRestaurant(): Promise<void> {
    const userId = this.authService.user()?.uid;
    const suggestion = this.selectedSuggestion();
    if (!userId || !suggestion) {
      return;
    }
    await this.listService.addRestaurant(userId, suggestion, this.rateControl.value ?? undefined);
    this.selectedSuggestion.set(null);
    this.searchControl.setValue('');
    this.addCountryControl.setValue('');
    this.rateControl.setValue(null);
  }

  private compare(a: UserRestaurant, b: UserRestaurant, key: SortKey): number {
    if (key === 'rate') {
      return (b.userRate ?? -1) - (a.userRate ?? -1);
    }
    if (key === 'date') {
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    }
    return a[key].localeCompare(b[key]);
  }

  private async loadSuggestions(query: string): Promise<void> {
    const country = this.addCountryControl.value.trim();
    if (query.trim().length < 2 || country.length < 2) {
      this.suggestions.set([]);
      return;
    }
    const suggestions = await this.searchService.search(query, country);
    this.suggestions.set(suggestions);
  }
}
