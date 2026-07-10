import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { map, take, switchMap, of, filter } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const router  = inject(Router);
  const toastr  = inject(ToastrService);
  const auth    = inject(AuthService);

  return auth.currentUser$.pipe(
    take(1),
    map(user => {
      if (user?.role === 'admin') {
        return true;
      }
      toastr.error('Access denied. Admins only.', 'Forbidden');
      return router.createUrlTree(['/home/masterhome']);
    })
  );
};
