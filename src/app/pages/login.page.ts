import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { animate, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [MatCardModule, MatButtonModule],
  template: `
    <section class="center-panel" [@fadeIn]>
      <mat-card class="w-full max-w-xl rounded-2xl p-2 shadow-lg">
        <mat-card-header>
          <mat-card-title>Plate Rate</mat-card-title>
          <mat-card-subtitle>Discover, rate and compare restaurants.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="mb-6 mt-4 text-slate-700">Sign in with Google to manage your restaurant ratings.</p>
          <button mat-flat-button type="button" color="primary" (click)="login()">
            Continue with Google
          </button>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styleUrl: './shared-page.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('240ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly authService = inject(AuthService);

  async login(): Promise<void> {
    await this.authService.loginWithGoogle();
  }
}
