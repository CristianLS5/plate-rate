import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  template: `
    <section class="center-panel">
      <h1>Plate Rate</h1>
      <p>Sign in with Google to manage your restaurant ratings.</p>
      <button type="button" (click)="login()">Continue with Google</button>
    </section>
  `,
  styleUrl: './shared-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly authService = inject(AuthService);

  async login(): Promise<void> {
    await this.authService.loginWithGoogle();
  }
}
