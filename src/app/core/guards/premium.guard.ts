import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from 'src/environment/environment';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PremiumGuard implements CanActivate {
  private baseUrl = environment.apiUrl;

  constructor(private router: Router, private http: HttpClient, private authService: AuthService) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Instead of authService.getProfile, we call the profile API directly here to ensure
    // we have the fresh user state if it's not cached in the auth service.
    // Assuming GET /auth/profile returns { isPremium: boolean, ... }
    return this.http.get<any>(`${this.baseUrl}/auth/profile`).pipe(
      map(profile => {
        if (profile && profile.isPremium) {
          return true;
        }
        return this.router.createUrlTree(['/subscriptions/pricing']);
      }),
      catchError(() => {
        // Fallback to pricing page if profile pull fails or user is unauthenticated
        return of(this.router.createUrlTree(['/subscriptions/pricing']));
      })
    );
  }
}
