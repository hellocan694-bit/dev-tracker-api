import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { GithubService } from 'src/app/core/services/github.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { Developer } from 'src/app/shared/interfaces/developer';
import { TrialStatus } from 'src/app/shared/interfaces/github';
import { Subscription } from 'rxjs';
import { environment } from 'src/environment/environment';
import gsap from 'gsap';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy, AfterViewInit {
  isLoggedIn: boolean = false;
  currentUser: Developer | null = null;
  isDropdownOpen: boolean = false;

  // Pro/Premium status
  trialStatus: TrialStatus | null = null;
  get isPro(): boolean { return this.trialStatus?.isPro ?? false; }
  get isPremium(): boolean { return this.trialStatus?.isPremium ?? false; }
  get daysRemaining(): number | null { return this.trialStatus?.daysRemaining ?? null; }

  // Subscription expiry-aware getters (mirrors checkSubscription middleware)
  get subscriptionActive(): boolean {
    return this.subscriptionService.isSubscriptionActive(this.currentUser?.subscription);
  }
  get subscriptionExpired(): boolean {
    return this.subscriptionService.isExpired(this.currentUser?.subscription);
  }
  get planLabel(): string {
    const sub = this.currentUser?.subscription;
    if (!sub?.isPremium) return '';
    const t = sub.planType || sub.interval || 'monthly';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  private authSub?: Subscription;
  private userSub?: Subscription;
  private trialSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    public sidebarService: SidebarService,
    private githubService: GithubService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    this.authSub = this.authService.isLoggedIn$.subscribe(status => {
      this.isLoggedIn = status;

      // Fetch trial status only when logged in
      if (status && !this.trialSub) {
        this.trialSub = this.githubService.getTrialStatus().subscribe({
          next: s => { this.trialStatus = s; },
          error: () => { this.trialStatus = null; }
        });
      }
    });

    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngAfterViewInit(): void {
    // Initial entry animation for navbar element
    gsap.fromTo('.glass-nav',
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    );

    // Staggered slide in for navbar items (brand logo, links, actions)
    gsap.fromTo('.brand-section, .center-link, .nav-actions > *',
      { y: -15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out', delay: 0.25 }
    );
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.trialSub?.unsubscribe();

    // Kill GSAP animations to prevent memory leaks
    gsap.killTweensOf('.glass-nav');
    gsap.killTweensOf('.brand-section, .center-link, .nav-actions > *');
    const menuEl = document.querySelector('.profile-dropdown-menu');
    if (menuEl) {
      gsap.killTweensOf(menuEl);
    }
  }

  toggleMenu() {
    this.sidebarService.toggle();
  }

  gotopremium() {
    this.router.navigate(['subscriptions/pricing']);
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    this.animateDropdown(this.isDropdownOpen);
  }

  private animateDropdown(open: boolean) {
    const menuEl = document.querySelector('.profile-dropdown-menu');
    if (!menuEl) return;

    if (open) {
      gsap.fromTo(menuEl,
        { opacity: 0, y: -15, display: 'none' },
        { opacity: 1, y: 0, display: 'block', duration: 0.3, ease: 'power3.out', overwrite: 'auto' }
      );
    } else {
      gsap.to(menuEl, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(menuEl, { display: 'none' });
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.isDropdownOpen) {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown-wrapper')) {
        this.isDropdownOpen = false;
        this.animateDropdown(false);
      }
    }
  }

  navigateAndClose(route: string) {
    this.isDropdownOpen = false;
    this.animateDropdown(false);
    this.router.navigate([route]);
  }

  /**
   * FIX #1 — Auth Bypass resolved.
   * Calls the backend /auth/logout endpoint first to invalidate the
   * HttpOnly JWT cookie server-side, then clears all local state.
   * Falls back to local-only cleanup if the network call fails so the
   * user is never stuck on a broken auth state.
   */
  logout() {
    this.isDropdownOpen = false;
    this.animateDropdown(false);
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        // Fallback: clear local state even if the API call fails
        this.authService.clearLocalState();
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
