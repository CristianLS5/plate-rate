import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { displayNameFromAuthUser } from '../core/display-name';
import type { CommunityEntry, Opinion, Restaurant, RestaurantStats, UserRestaurant } from '../core/models';
import { isPermissionDenied } from '../core/firestore-error';
import { PublicRatingsService } from '../core/public-ratings.service';
import { syncRestaurantRating } from '../core/restaurant-rating-sync';
import { hasUserRate, parseUserRate } from '../core/user-rate';

@Component({
  selector: 'app-public-detail-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './public-detail.page.html',
  styleUrl: './public-detail.page.scss',
  animations: [
    trigger('staggerEntries', [
      transition('* => *', [
        query(
          '.community-item',
          [
            style({ opacity: 0, transform: 'translateY(8px)' }),
            stagger(70, [animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PublicRatingsService);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly restaurant = signal<Restaurant | null>(null);
  readonly stats = signal<RestaurantStats | null>(null);
  readonly community = signal<CommunityEntry[]>([]);
  readonly myListEntry = signal<UserRestaurant | null>(null);
  readonly myOpinion = signal<Opinion | null>(null);
  readonly loadError = signal('');
  readonly communityListLimited = signal(false);
  readonly isSaving = signal(false);
  readonly saveError = signal('');

  readonly commentControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  private readonly user = this.authService.user;

  readonly myRate = computed(() => parseUserRate(this.myListEntry()?.userRate) ?? null);

  readonly myCommentText = computed(() => this.myOpinion()?.text?.trim() || '');

  readonly showMyEmptyPrompt = computed(() => {
    if (!this.user()) {
      return false;
    }
    return this.myRate() == null && !this.myCommentText();
  });

  readonly myEmptyPrompt = computed(() => {
    if (!this.myListEntry()) {
      return 'Add this restaurant to your list and give it a rating to share your opinion with others.';
    }
    return "You haven't shared an opinion about this restaurant yet. Add a rating from your list to appear here, then you can leave a written comment.";
  });

  readonly canWriteComment = computed(() => this.myRate() != null);

  readonly displayGlobalStats = computed((): RestaurantStats | null => {
    const restaurantId = this.restaurant()?.id ?? '';
    const server = this.stats();
    if (server && server.ratingsCount > 0) {
      return server;
    }
    const entries = this.community();
    if (entries.length === 0) {
      return null;
    }
    const rated = entries.filter((entry) => entry.userRate != null);
    if (rated.length === 0) {
      return null;
    }
    const sum = rated.reduce((acc, entry) => acc + entry.userRate!, 0);
    return {
      restaurantId,
      globalRateAvg: sum / rated.length,
      ratingsCount: rated.length,
    };
  });

  readonly hasGlobalRate = computed(() => (this.displayGlobalStats()?.ratingsCount ?? 0) > 0);

  readonly mapEmbedSrc = computed((): SafeResourceUrl | null => {
    const embedUrl = this.restaurant()?.mapsEmbedUrl?.trim();
    if (!embedUrl) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  });

  readonly mapsLink = computed((): string | null => {
    const url = this.restaurant()?.mapsUrl?.trim();
    return url || null;
  });

  constructor() {
    effect(() => {
      this.user();
      const restaurantId = this.route.snapshot.paramMap.get('restaurantId');
      if (restaurantId) {
        void this.load(restaurantId);
      }
    });
  }

  formatLocation(item: { city: string; country?: string }): string {
    const city = item.city.trim();
    const country = item.country?.trim();
    return country ? `${city}, ${country}` : city;
  }

  async submitComment(): Promise<void> {
    if (this.commentControl.invalid || this.isSaving()) {
      this.commentControl.markAllAsTouched();
      return;
    }
    const user = this.user();
    const restaurantId = this.restaurant()?.id;
    const entry = this.myListEntry();
    if (!user?.uid || !restaurantId || !entry || this.myRate() == null) {
      this.saveError.set('You need a rating on your list before posting a comment.');
      return;
    }

    const userName =
      entry.userName?.trim() ??
      displayNameFromAuthUser(user) ??
      'You';

    this.isSaving.set(true);
    this.saveError.set('');
    try {
      await this.service.saveOpinion(
        restaurantId,
        user.uid,
        userName,
        this.commentControl.value,
        this.myOpinion()?.createdAt,
      );
      await this.reloadCommunity(restaurantId, user.uid);
    } catch (error: unknown) {
      if (isPermissionDenied(error)) {
        this.saveError.set(
          'Could not save your comment: Firestore rules must be updated. See DEPLOY-FIRESTORE-RULES.md and publish firestore.rules in Firebase Console, then try again.',
        );
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.saveError.set(`Could not save your comment: ${message}`);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  private async load(restaurantId: string): Promise<void> {
    this.loadError.set('');
    this.communityListLimited.set(false);
    try {
      const userId = this.user()?.uid;
      const [restaurant, stats, opinions, myEntry, myOpinion] = await Promise.all([
        this.service.getRestaurant(restaurantId),
        this.service.getStats(restaurantId),
        this.service.getOpinionTexts(restaurantId),
        userId ? this.service.getUserRestaurantEntry(restaurantId, userId) : Promise.resolve(null),
        userId ? this.service.getUserOpinion(restaurantId, userId) : Promise.resolve(null),
      ]);

      if (myEntry && userId) {
        await syncRestaurantRating({
          restaurantId: myEntry.restaurantId,
          userId,
          userName: myEntry.userName,
          userRate: myEntry.userRate ?? null,
        }).catch(() => undefined);
      }

      const ratings = await this.loadCommunityRatings(restaurantId, myEntry);

      this.restaurant.set(restaurant);
      this.stats.set(stats);
      this.myListEntry.set(myEntry);
      this.myOpinion.set(myOpinion);
      this.community.set(
        this.service.buildCommunityEntries(ratings, opinions, userId, this.user() ?? null),
      );
      this.commentControl.setValue(myOpinion?.text ?? '', { emitEvent: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.loadError.set(message);
    }
  }

  private async loadCommunityRatings(
    restaurantId: string,
    myEntry: UserRestaurant | null,
  ): Promise<UserRestaurant[]> {
    try {
      return await this.service.getRatingsForRestaurant(restaurantId);
    } catch (error: unknown) {
      if (!isPermissionDenied(error)) {
        throw error;
      }
      this.communityListLimited.set(true);
      if (myEntry && hasUserRate(myEntry.userRate)) {
        return [myEntry];
      }
      return [];
    }
  }

  private async reloadCommunity(restaurantId: string, userId: string): Promise<void> {
    try {
      const myEntry = this.myListEntry();
      if (myEntry) {
        await syncRestaurantRating({
          restaurantId: myEntry.restaurantId,
          userId,
          userName: myEntry.userName,
          userRate: myEntry.userRate ?? null,
        }).catch(() => undefined);
      }

      const [opinions, myOpinion] = await Promise.all([
        this.service.getOpinionTexts(restaurantId),
        this.service.getUserOpinion(restaurantId, userId),
      ]);
      const ratings = await this.loadCommunityRatings(restaurantId, myEntry);
      this.myOpinion.set(myOpinion);
      this.community.set(
        this.service.buildCommunityEntries(ratings, opinions, userId, this.user() ?? null),
      );
      this.commentControl.setValue(myOpinion?.text ?? '', { emitEvent: false });
    } catch (error: unknown) {
      if (isPermissionDenied(error)) {
        this.saveError.set(
          'Comment saved may have failed, or Firestore rules need updating. Publish firestore.rules from this project in Firebase Console, then reload.',
        );
        return;
      }
      throw error;
    }
  }
}
