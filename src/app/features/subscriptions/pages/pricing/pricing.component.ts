import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss']
})
export class PricingComponent implements OnInit, OnDestroy {
  currency: 'USD' | 'EGP' = 'USD';
  isLoading = false;
  plans: any[] = [];
  error: string | null = null;
  /** Single destroy signal — all takeUntil subscriptions complete automatically. */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.subscriptionService.getplans().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        this.plans = res.data.plans;
      },
      error: (err) => {
        console.error('Failed to load plans:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleCurrency(cur: 'USD' | 'EGP') {
    this.currency = cur;
  }

  get proPrice() {
    return this.currency === 'USD' ? '$29.99' : '1500 EGP';
  }

  subscribe(planId: string) {
    if (planId === 'free') {
      // You can add logic for the free plan here, like routing back to dashboard
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.subscriptionService.checkout(planId, this.currency).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.checkoutUrl) {
          // Stripe (USD) implementation
          window.location.href = res.checkoutUrl;
        } else if (res.iframeUrl) {
          // Paymob (EGP) implementation - redirect to iframe component
          // Optionally pass the iframe URL using queryParams or state
          this.router.navigate(['/subscriptions/paymob-checkout'], { 
            state: { iframeUrl: res.iframeUrl } 
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Payment initialization failed. Please try again.';
        console.error('Checkout error:', err);
      }
    });
  }
}
