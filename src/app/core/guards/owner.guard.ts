import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/core/services/auth.service';
import { FeedbackService } from 'src/app/features/feedback/services/feedback.service';
import { map, take, switchMap, catchError, of } from 'rxjs';

/**
 * OwnerGuard — Protects feedback/:id edit & delete routes.
 * Passes if caller is: (a) admin, OR (b) owner of the feedback.
 * Fetches the single feedback from the API to compare developer IDs.
 */
export const ownerGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);
  const feedbackService = inject(FeedbackService);

  const feedbackId = route.paramMap.get('id');
  if (!feedbackId) {
    return router.createUrlTree(['/feedback']);
  }

  return authService.currentUser$.pipe(
    take(1),
    switchMap(user => {
      // Admins always pass
      if (user?.role === 'admin') {
        return of(true);
      }

      // Fetch the feedback and compare developer id
      return feedbackService.getById(feedbackId).pipe(
        map(res => {
          const feedback = res.data.feedback;

          // استخراج الـ ID بتاع المطور سواء كان Object (Populated) أو String ID
          const feedbackDevId = typeof feedback.developer === 'object'
            ? String(feedback.developer._id || feedback.developer.id)
            : String(feedback.developer);

          const currentUserId = String(user?._id || (user as any)?.id);

          const isOwner = feedbackDevId === currentUserId;

          if (isOwner) return true;

          toastr.error('You do not own this feedback.', 'Forbidden');
          return router.createUrlTree(['/feedback']);
        }),
        catchError(() => {
          toastr.error('Could not verify ownership.', 'Error');
          return of(router.createUrlTree(['/feedback']));
        })
      );
    })
  );
};
