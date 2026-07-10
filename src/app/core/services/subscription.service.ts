import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

export interface CheckoutResponse {
  checkoutUrl?: string; // Stripe
  iframeUrl?: string; // Paymob
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
}
