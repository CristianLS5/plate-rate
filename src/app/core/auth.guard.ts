import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

/** Waits for Firebase Auth to finish loading before allowing protected routes. */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.isLoading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() => {
      if (authService.isAuthenticated()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
