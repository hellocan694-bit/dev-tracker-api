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
  /**
   * Active = isPremium is true AND the subscription has not expired yet.
   * When subscriptionExpiresAt is absent we trust the isPremium flag from the
   * backend — absence of an end-date means the plan has no recorded cutoff yet
   * (e.g. first billing cycle still open, or lifetime plan stored as monthly).
   */
  isSubscriptionActive(sub: DeveloperSubscription | undefined): boolean {
    if (!sub?.isPremium) return false;
    if (sub.planType === 'lifetime') return true;
    if (!sub.subscriptionExpiresAt) return true;          // trust isPremium when no expiry date
    return Date.now() <= new Date(sub.subscriptionExpiresAt).getTime();
  }

  /**
   * Expired = isPremium was true but the recorded end-date has passed.
   * If no end-date exists we cannot conclude expiry — return false.
   */
  isExpired(sub: DeveloperSubscription | undefined): boolean {
    if (!sub?.isPremium) return false;
    if (sub.planType === 'lifetime') return false;
    if (!sub.subscriptionExpiresAt) return false;          // no cutoff stored → not expired
    return Date.now() > new Date(sub.subscriptionExpiresAt).getTime();
  }
}
