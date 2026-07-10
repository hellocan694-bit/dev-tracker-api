import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';

/**
 * LoginGuard — blocks unauthenticated users from accessing protected routes.
 * Previously read from sessionStorage; now reads the in-memory isLoggedIn flag
 * because the JWT lives in an HttpOnly cookie that JS cannot access.
 */
export const loginGuard: CanActivateFn = () => {
  const router = inject(Router);
  const toaster = inject(ToastrService);
  const auth = inject(AuthService);

  if (auth.loggedIn.value) {
    return true;
  }

  toaster.info('Please login to access your dashboard');
  return router.createUrlTree(['/home/guesthomepage']);
};