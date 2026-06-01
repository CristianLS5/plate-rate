import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { AuthService } from '../core/auth.service';
import type { RestaurantSuggestion, UserRestaurant } from '../core/models';
import { PersonalListService } from '../core/personal-list.service';
import { isRestaurantAlreadyInList } from '../core/restaurant-match';
import { rateAriaLabel, rateLabel, rateTone, type RateTone } from '../core/rate-tone';
import { RestaurantSearchService } from '../core/restaurant-search.service';

type ViewMode = 'card' | 'table';
type SortKey = 'name' | 'city' | 'rate' | 'date';

const MIN_LIST_SEARCH_LENGTH = 3;

@Component({
  selector: 'app-personal-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './personal.page.html',
  styleUrl: './personal.page.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalPage {
  private readonly authService = inject(AuthService);
  private readonly listService = inject(PersonalListService);
  private readonly searchService = inject(RestaurantSearchService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly mapEmbedCache = new Map<string, SafeResourceUrl>();

  readonly restaurants = this.listService.restaurants;
  readonly suggestions = signal<RestaurantSuggestion[]>([]);
  readonly selectedSuggestion = signal<RestaurantSuggestion | null>(null);
  readonly isSubmitting = signal(false);
  readonly addError = signal('');
  readonly viewMode = signal<ViewMode>('card');
  readonly sortKey = signal<SortKey>('name');

  readonly listSearch = new FormControl('', { nonNullable: true });
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly addCityControl = new FormControl('', { nonNullable: true });
  readonly rateControl = new FormControl<number | null>(null);

  private readonly listSearchRaw = toSignal(
    this.listSearch.valueChanges.pipe(startWith(this.listSearch.value), debounceTime(200)),
    { initialValue: '' },
  );

  readonly activeListSearch = computed(() => {
    const q = this.listSearchRaw().trim().toLowerCase();
    return q.length >= MIN_LIST_SEARCH_LENGTH ? q : '';
  });

  readonly filteredRestaurants = computed(() => {
    const q = this.activeListSearch();
    const key = this.sortKey();
    const list = this.restaurants().filter((item) => {
      if (!q) {
        return true;
      }
      const haystack = `${item.name} ${item.city} ${item.country ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
    return [...list].sort((a, b) => this.compare(a, b, key));
  });

  readonly isListSearchActive = computed(() => this.activeListSearch().length > 0);

  readonly canSubmitAdd = computed(() => {
    const candidate = this.resolveSuggestionCandidate();
    if (!this.authService.user()?.uid || !candidate || this.isSubmitting()) {
      return false;
    }
    return !this.isAlreadyInList(candidate);
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user?.uid) {
        void this.listService.loadByUser(user.uid);
      }
    });

    this.searchControl.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe((query) => {
      const selected = this.selectedSuggestion();
      if (selected && selected.name.toLowerCase() !== query.trim().toLowerCase()) {
        this.selectedSuggestion.set(null);
      }
      void this.loadSuggestions(query);
    });

    this.addCityControl.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => {
      this.selectedSuggestion.set(null);
      void this.loadSuggestions(this.searchControl.value);
    });
  }

  applyListSearch(): void {
    const trimmed = this.listSearch.value.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_LIST_SEARCH_LENGTH) {
      return;
    }
    this.listSearch.setValue(trimmed, { emitEvent: true });
  }

  setViewMode(mode: ViewMode | null): void {
    if (mode === 'card' || mode === 'table') {
      this.viewMode.set(mode);
    }
  }

  setSort(sort: SortKey | null): void {
    if (sort === 'name' || sort === 'city' || sort === 'rate' || sort === 'date') {
      this.sortKey.set(sort);
    }
  }

  chooseSuggestion(suggestion: RestaurantSuggestion): void {
    if (this.isAlreadyInList(suggestion)) {
      this.addError.set('This restaurant is already in your list.');
      return;
    }
    this.addError.set('');
    this.selectedSuggestion.set(suggestion);
    this.searchControl.setValue(suggestion.name);
    this.suggestions.set([]);
  }

  async addRestaurant(): Promise<void> {
    const userId = this.authService.user()?.uid;
    const suggestion = this.resolveSuggestionCandidate();
    if (!userId || !suggestion) {
      this.addError.set('Select a restaurant suggestion before adding.');
      return;
    }
    if (this.isAlreadyInList(suggestion)) {
      this.addError.set('This restaurant is already in your list.');
      return;
    }
    this.isSubmitting.set(true);
    this.addError.set('');
    try {
      await this.listService.addRestaurant(userId, suggestion, this.rateControl.value ?? undefined);
      this.selectedSuggestion.set(null);
      this.suggestions.set([]);
      this.searchControl.setValue('');
      this.addCityControl.setValue('');
      this.rateControl.setValue(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.addError.set(`Could not add the restaurant: ${message}`);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  isAlreadyInList(suggestion: RestaurantSuggestion): boolean {
    return isRestaurantAlreadyInList(this.restaurants(), suggestion);
  }

  formatLocation(item: { city: string; country?: string }): string {
    const city = item.city.trim();
    const country = item.country?.trim();
    return country ? `${city}, ${country}` : city;
  }

  mapEmbedSrc(item: UserRestaurant): SafeResourceUrl | null {
    const embedUrl = item.mapsEmbedUrl?.trim();
    if (!embedUrl) {
      return null;
    }
    const cached = this.mapEmbedCache.get(item.restaurantId);
    if (cached) {
      return cached;
    }
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    this.mapEmbedCache.set(item.restaurantId, safeUrl);
    return safeUrl;
  }

  mapsLink(item: UserRestaurant): string | null {
    const url = item.mapsUrl?.trim();
    return url || null;
  }

  readonly rateTone = rateTone;
  readonly rateLabel = rateLabel;
  readonly rateAriaLabel = rateAriaLabel;

  rateBadgeClass(tone: RateTone): string {
    if (tone === 'none') {
      return 'badge';
    }
    return `badge badge--${tone}`;
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
    const city = this.addCityControl.value.trim();
    if (query.trim().length < 2 || city.length < 2) {
      this.suggestions.set([]);
      return;
    }
    const suggestions = await this.searchService.search(query, city);
    this.suggestions.set(suggestions);
  }

  private resolveSuggestionCandidate(): RestaurantSuggestion | null {
    const selected = this.selectedSuggestion();
    const query = this.searchControl.value.trim().toLowerCase();
    if (selected) {
      return selected;
    }
    if (!query || this.suggestions().length === 0) {
      return null;
    }
    const exact = this.suggestions().find((item) => item.name.trim().toLowerCase() === query);
    return exact ?? this.suggestions()[0] ?? null;
  }
}
