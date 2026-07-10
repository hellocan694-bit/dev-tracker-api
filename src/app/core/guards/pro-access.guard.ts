import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { GithubService } from '../services/github.service';

@Injectable({ providedIn: 'root' })
export class ProAccessGuard implements CanActivate {
  constructor(private githubService: GithubService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.githubService.getTrialStatus().pipe(
      map(status => {
        // Allow if user is a paid Pro subscriber, OR trial is active,
        // OR if they haven't linked GitHub yet (so they can access the page to start the trial).
        if (status.isPro || status.active || !status.githubLinked) {
          return true;
        }
        // Trial expired and not Pro — send to pricing page
        return this.router.createUrlTree(['/subscriptions/pricing']);
      }),
      catchError(() => {
        // Network error or missing token → also redirect to pricing
        return of(this.router.createUrlTree(['/subscriptions/pricing']));
      })
    );
  }
}
