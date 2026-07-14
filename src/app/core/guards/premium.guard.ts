import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from 'src/environment/environment';
import { SubscriptionService } from '../services/subscription.service';

@Injectable({ providedIn: 'root' })
export class PremiumGuard implements CanActivate {
  private baseUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient,
    private subscriptionService: SubscriptionService
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.http.get<any>(`${this.baseUrl}/auth/profile`).pipe(
      map(profile => {
        const sub = profile?.subscription;
        // Use shared helper — mirrors backend expiry logic exactly
        if (this.subscriptionService.isSubscriptionActive(sub)) {
          return true;
        }
        return this.router.createUrlTree(['/subscriptions/pricing']);
      }),
      catchError(() => of(this.router.createUrlTree(['/subscriptions/pricing'])))
    );
  }
}
