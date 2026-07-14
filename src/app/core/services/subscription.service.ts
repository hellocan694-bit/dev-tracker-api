import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { DeveloperSubscription } from 'src/app/shared/interfaces/developer';

export interface CheckoutResponse {
  checkoutUrl?: string; // Stripe
  iframeUrl?: string;   // Paymob
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  checkout(planId: string, currency: 'USD' | 'EGP'): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.baseUrl}/subscribe/checkout`, { planId, currency });
  }

  getplans() {
    return this.http.get(`${this.baseUrl}/subscribe/plans`);
  }

  /**
   * Pure client-side check — mirrors the backend checkSubscription logic.
   * Use this to sync UI state without an extra API round-trip.
   */
  isSubscriptionActive(sub: DeveloperSubscription | undefined): boolean {
    if (!sub?.isPremium) return false;
    if (sub.planType === 'lifetime') return true;
    if (!sub.subscriptionExpiresAt) return false;
    return Date.now() <= new Date(sub.subscriptionExpiresAt).getTime();
  }

  isExpired(sub: DeveloperSubscription | undefined): boolean {
    if (!sub?.isPremium) return false;
    if (sub.planType === 'lifetime') return false;
    if (!sub.subscriptionExpiresAt) return false;
    return Date.now() > new Date(sub.subscriptionExpiresAt).getTime();
  }
}
