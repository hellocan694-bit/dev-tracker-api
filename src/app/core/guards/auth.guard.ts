import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

/**
 * AuthGuard — ensures a user is logged in before proceeding.
 * Previously checked a token from router navigation state extras.
 * Now uses the in-memory isLoggedIn flag from AuthService because
 * the JWT is stored in an HttpOnly cookie and is not accessible to JS.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (auth.loggedIn.value) {
    return true;
  }

  return router.createUrlTree(['/auth/register']);
};
