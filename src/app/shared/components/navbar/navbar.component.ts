import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, HostListener, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { GithubService } from 'src/app/core/services/github.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { DeveloperService } from 'src/app/core/services/developer.service';
import { Developer } from 'src/app/shared/interfaces/developer';
import { TrialStatus } from 'src/app/shared/interfaces/github';
import { Subject } from 'rxjs';
import { takeUntil, filter, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
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
  private ambientTweens: gsap.core.Tween[] = [];

  // Pro/Premium status
  trialStatus: TrialStatus | null = null;
  get isPro(): boolean { return this.trialStatus?.isPro ?? false; }
  get isPremium(): boolean { return this.trialStatus?.isPremium ?? false; }
  get daysRemaining(): number | null { return this.trialStatus?.daysRemaining ?? null; }

  // ── Subscription state: trialStatus (live API) is the authoritative override. ──
  // The local subscription object in currentUser can be stale (loaded from
  // localStorage) — we only fall back to it if the API hasn't responded yet.
  get subscriptionActive(): boolean {
    if (this.trialStatus !== null) {
      return this.trialStatus.isPremium === true && this.trialStatus.active === true;
    }
    return this.subscriptionService.isSubscriptionActive(this.currentUser?.subscription);
  }
  get subscriptionExpired(): boolean {
    // If the live API confirmed premium, never show as expired.
    if (this.trialStatus !== null && this.trialStatus.isPremium) return false;
    return this.subscriptionService.isExpired(this.currentUser?.subscription);
  }
  get planLabel(): string {
    const sub = this.currentUser?.subscription;
    if (!sub?.isPremium) return '';
    const t = sub.planType || sub.interval || 'monthly';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /** Single destroy signal — all takeUntil subscriptions complete automatically. */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private el: ElementRef,
    private authService: AuthService,
    private router: Router,
    public sidebarService: SidebarService,
    private githubService: GithubService,
    private subscriptionService: SubscriptionService,
    private developerService: DeveloperService
  ) {}

  ngOnInit(): void {
    // ── Auth state stream ──────────────────────────────────────────────────────
    this.authService.isLoggedIn$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isLoggedIn = status;
        this.triggerIdleAnimations();
      });

    // ── User profile stream ────────────────────────────────────────────────────
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.triggerIdleAnimations();
      });

    // ── Trial status: only fetch once logged in ────────────────────────────────
    // switchMap cancels any in-flight request when the login status changes.
    this.authService.isLoggedIn$.pipe(
      filter(loggedIn => loggedIn),
      switchMap(() => this.githubService.getTrialStatus().pipe(
        catchError(() => of(null))
      )),
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.trialStatus = status;
      this.triggerIdleAnimations();
    });

    // ── Background profile refresh (best-effort) ───────────────────────────────
    this.authService.isLoggedIn$.pipe(
      filter(loggedIn => loggedIn),
      switchMap(() => this.developerService.refreshProfile().pipe(
        catchError(err => {
          console.error('Failed to refresh developer profile on load:', err);
          return of(null);
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.triggerIdleAnimations();
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

    this.triggerIdleAnimations();
  }

  ngOnDestroy(): void {
    // Signal all takeUntil subscriptions to complete
    this.destroy$.next();
    this.destroy$.complete();

    // Kill GSAP animations to prevent memory leaks
    this.ambientTweens.forEach(t => t.kill());
    gsap.killTweensOf('.glass-nav');
    gsap.killTweensOf('.brand-section, .center-link, .nav-actions > *');
    const menuEl = document.querySelector('.profile-dropdown-menu');
    if (menuEl) {
      gsap.killTweensOf(menuEl);
    }
  }

  // ── GSAP Badge Animations ────────────────────────────────────────────────
  onBadgeMouseEnter(event: MouseEvent, type: 'pro' | 'trial') {
    const target = event.currentTarget as HTMLElement;
    gsap.to(target, {
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    const shell = target.querySelector('.status-badge-nav__shell') || target;
    if (type === 'pro') {
      gsap.to(shell, {
        boxShadow: '0 0 25px rgba(139, 92, 246, 0.45), inset 0 0 15px rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(167, 139, 250, 0.6)',
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    } else {
      gsap.to(shell, {
        boxShadow: '0 0 20px rgba(245, 158, 11, 0.35), inset 0 0 12px rgba(217, 119, 6, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  onBadgeMouseLeave(event: MouseEvent, type: 'pro' | 'trial') {
    const target = event.currentTarget as HTMLElement;
    gsap.to(target, {
      scale: 1.0,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    const shell = target.querySelector('.status-badge-nav__shell') || target;
    if (type === 'pro') {
      gsap.to(shell, {
        boxShadow: '0 0 12px rgba(139, 92, 246, 0.12), inset 0 0 12px rgba(99, 102, 241, 0.06)',
        borderColor: 'rgba(139, 92, 246, 0.35)',
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    } else {
      gsap.to(shell, {
        boxShadow: '0 0 12px rgba(245, 158, 11, 0.08), inset 0 0 10px rgba(217, 119, 6, 0.05)',
        borderColor: 'rgba(245, 158, 11, 0.22)',
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  private triggerIdleAnimations() {
    setTimeout(() => {
      this.ambientTweens.forEach(t => t.kill());
      this.ambientTweens = [];

      // 1. PRO Badge Ambient Pulse (shadow & border)
      const proShell = this.el.nativeElement.querySelector('.status-badge-nav--pro .status-badge-nav__shell');
      if (proShell) {
        const t = gsap.fromTo(proShell,
          {
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.1), inset 0 0 8px rgba(99, 102, 241, 0.04)',
            borderColor: 'rgba(139, 92, 246, 0.25)'
          },
          {
            boxShadow: '0 0 18px rgba(139, 92, 246, 0.22), inset 0 0 12px rgba(99, 102, 241, 0.08)',
            borderColor: 'rgba(139, 92, 246, 0.45)',
            duration: 2.5,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut'
          }
        );
        this.ambientTweens.push(t);
      }

      // 2. Trial Dot Pulsing (breathing warning indicator dot)
      const trialDot = this.el.nativeElement.querySelector('.status-badge-nav--trial .status-badge-nav__dot--trial');
      if (trialDot) {
        const t = gsap.fromTo(trialDot,
          { scale: 0.85, opacity: 0.65 },
          { scale: 1.35, opacity: 1, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut' }
        );
        this.ambientTweens.push(t);
      }
    }, 150);
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
