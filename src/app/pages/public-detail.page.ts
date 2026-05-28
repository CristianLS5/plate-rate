import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import type { Opinion, Restaurant, RestaurantStats } from '../core/models';
import { PublicRatingsService } from '../core/public-ratings.service';

@Component({
  selector: 'app-public-detail-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './public-detail.page.html',
  styleUrl: './shared-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PublicRatingsService);
  private readonly authService = inject(AuthService);

  readonly restaurant = signal<Restaurant | null>(null);
  readonly stats = signal<RestaurantStats | null>(null);
  readonly opinions = signal<Opinion[]>([]);
  readonly myOpinion = signal<Opinion | null>(null);

  constructor() {
    const restaurantId = this.route.snapshot.paramMap.get('restaurantId');
    if (restaurantId) {
      void this.load(restaurantId);
    }
  }

  private async load(restaurantId: string): Promise<void> {
    const [restaurant, stats, opinions] = await Promise.all([
      this.service.getRestaurant(restaurantId),
      this.service.getStats(restaurantId),
      this.service.getOpinions(restaurantId),
    ]);
    this.restaurant.set(restaurant);
    this.stats.set(stats);
    this.opinions.set(opinions);

    const userId = this.authService.user()?.uid;
    if (userId) {
      this.myOpinion.set(await this.service.getUserOpinion(restaurantId, userId));
    }
  }
}
