import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingService } from 'src/app/core/services/onboarding.service';
import { ProjectService } from 'src/app/core/services/project.service';
import { GithubService } from 'src/app/core/services/github.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { UpsellModalComponent } from 'src/app/shared/components/upsell-modal/upsell-modal.component';
import { Developer } from 'src/app/shared/interfaces/developer';
import { TrialStatus } from 'src/app/shared/interfaces/github';
import { BehaviorSubject, Subject, switchMap, catchError, of } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TrialBannerComponent } from 'src/app/shared/components/trial-banner/trial-banner.component';
import Swal from 'sweetalert2';
import gsap from 'gsap';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, TrialBannerComponent, UpsellModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  activeRoute = 'dashboard';
  currentUser: Developer | null = null;
  isAdmin = false;
  /** Single destroy signal — all takeUntil subscriptions complete automatically. */
  private readonly destroy$ = new Subject<void>();

  // ── [1] Upsell modal state ──────────────────────────────────────────────────
  upsellModalOpen    = false;
  upsellFeatureName  = '';

  // ── [3] Usage bar state ─────────────────────────────────────────────────────
  readonly projectLimit = 3;      // free-tier cap (mirrors backend logic)
  projectUsageCount  = 0;
  get projectUsagePercent(): number {
    return Math.min(100, Math.round((this.projectUsageCount / this.projectLimit) * 100));
  }

  // ── [2/3] ViewChild refs for GSAP ──────────────────────────────────────────
  @ViewChild('promoCard',    { static: false }) promoCardRef!:   ElementRef<HTMLElement>;
  @ViewChild('promoShine',   { static: false }) promoShineRef!:  ElementRef<HTMLElement>;
  @ViewChild('usageBarFill', { static: false }) usageBarFillRef!: ElementRef<HTMLElement>;

  private promoTiltTl?: gsap.core.Timeline;
  private urgencyTween?: gsap.core.Tween;

  // Pro widget state
  trialStatus: TrialStatus | null = null;
  get isPro(): boolean { return this.trialStatus?.isPro ?? false; }
  get isPremium(): boolean { return this.trialStatus?.isPremium ?? false; }
  get daysRemaining(): number | null { return this.trialStatus?.daysRemaining ?? null; }

  // \u2500\u2500 Subscription state: trialStatus (live API) is the authoritative override. \u2500\u2500
  // The local subscription object in currentUser can be stale (loaded from
  // localStorage) \u2014 we only fall back to it if the API hasn't responded yet.
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

  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  isAriaLoading = false;
  isMobileDrawerOpen = false;

  constructor(
    private el: ElementRef,
    private router: Router,
    public sidebarService: SidebarService,
    private authService: AuthService,
    private onboardingService: OnboardingService,
    private projectService: ProjectService,
    private githubService: GithubService,
    private subscriptionService: SubscriptionService,
    public notificationService: NotificationService
  ) { }

  toggle() {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  close() {
    this.isOpenSubject.next(false);
  }

  private ambientTweens: gsap.core.Tween[] = [];

  ngOnInit(): void {
    // ── Auth / user profile stream ─────────────────────────────────────────────
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.isAdmin = user?.role === 'admin';
        this.triggerIdleAnimations();
      });

    // ── Trial/Pro status for the sidebar Pro widget ─────────────────────────────
    this.githubService.getTrialStatus().pipe(
      catchError(() => of(null)),
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.trialStatus = status;
      this.triggerIdleAnimations();
    });

    // ── [3] Project count for usage bar (free users only) ──────────────────────
    this.projectService.getAllProjects(0).pipe(
      takeUntil(this.destroy$),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (!res) return;
      const total = typeof res.total === 'number'
        ? res.total
        : (res.Projects?.totalActiveProjects ?? 0);
      this.projectUsageCount = total;
      this.animateUrgencyBarIfNeeded();
    });

    // ── Synchronize activeRoute on load ────────────────────────────────────────
    this.updateActiveRoute(this.router.url);

    // ── Router events for automatic route synchronization ──────────────────────
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.updateActiveRoute(event.urlAfterRedirects || event.url);
    });
  }

  ngAfterViewInit(): void {
    // Call resize to setup initial styles cleanly
    this.onResize();

    // ── Mobile open/close events ────────────────────────────────────────────────
    this.sidebarService.isOpen$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isOpen => {
      this.isMobileDrawerOpen = isOpen;
      this.animateMobileDrawer(isOpen);
    });

    this.triggerIdleAnimations();
  }

  ngOnDestroy(): void {
    // Signal all takeUntil subscriptions to complete
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up GSAP tweens to avoid memory leaks
    this.ambientTweens.forEach(t => t.kill());
    this.promoTiltTl?.kill();
    this.urgencyTween?.kill();

    const sidebarEl = this.el.nativeElement.querySelector('.sidebar-master');
    const overlayEl = this.el.nativeElement.querySelector('.sidebar-overlay');
    const navLinks = this.el.nativeElement.querySelectorAll('.nav-item-wrapper');
    const animElements = this.el.nativeElement.querySelectorAll(
      '.brand-text, .nav-label, .profile-name, .status-badge__body'
    );

    if (sidebarEl) gsap.killTweensOf(sidebarEl);
    if (overlayEl) gsap.killTweensOf(overlayEl);
    if (navLinks && navLinks.length) gsap.killTweensOf(navLinks);
    if (animElements && animElements.length) gsap.killTweensOf(animElements);
  }

  // ── [1] Upsell modal handlers ─────────────────────────────────────────────
  openUpsellModal(featureName: string): void {
    this.upsellFeatureName = featureName;
    this.upsellModalOpen   = true;
  }

  closeUpsellModal(): void {
    this.upsellModalOpen = false;
  }

  // ── [2] Promo card 3D tilt / shine GSAP ──────────────────────────────────
  onPromoMouseEnter(): void {
    const card  = this.promoCardRef?.nativeElement;
    const shine = this.promoShineRef?.nativeElement;
    if (!card) return;

    this.promoTiltTl?.kill();
    this.promoTiltTl = gsap.timeline();
    this.promoTiltTl
      .to(card, { rotateX: 4, rotateY: -6, scale: 1.03, duration: 0.35, ease: 'power2.out', transformPerspective: 600 })
      .to(card, { boxShadow: '0 10px 36px rgba(99, 102, 241, 0.40)', duration: 0.35, ease: 'power2.out' }, '<');

    if (shine) {
      gsap.fromTo(shine,
        { x: '-120%', opacity: 0.6 },
        { x: '120%',  opacity: 0,   duration: 0.65, ease: 'power2.in' }
      );
    }
  }

  onPromoMouseLeave(): void {
    const card = this.promoCardRef?.nativeElement;
    if (!card) return;
    this.promoTiltTl?.kill();
    gsap.to(card, { rotateX: 0, rotateY: 0, scale: 1, boxShadow: '0 4px 20px rgba(99, 102, 241, 0.18)', duration: 0.4, ease: 'power2.out' });
  }

  // ── [3] Urgency bar GSAP pulse when ≥ 80% ────────────────────────────────
  private animateUrgencyBarIfNeeded(): void {
    setTimeout(() => {
      const fill = this.usageBarFillRef?.nativeElement;
      if (!fill || this.projectUsagePercent < 80) return;
      this.urgencyTween?.kill();
      this.urgencyTween = gsap.to(fill, {
        boxShadow: '0 0 12px rgba(251, 146, 60, 0.75)',
        duration: 1.0,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut'
      });
    }, 300);
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

    const shell = target.querySelector('.status-badge__shell') || target;
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

    const shell = target.querySelector('.status-badge__shell') || target;
    if (type === 'pro') {
      gsap.to(shell, {
        boxShadow: '0 0 18px rgba(139, 92, 246, 0.12), inset 0 0 12px rgba(99, 102, 241, 0.06)',
        borderColor: 'rgba(139, 92, 246, 0.35)',
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    } else {
      gsap.to(shell, {
        boxShadow: '0 0 14px rgba(245, 158, 11, 0.08), inset 0 0 10px rgba(217, 119, 6, 0.05)',
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

      // 1. PRO Badge Ambient Pulse
      const proShell = this.el.nativeElement.querySelector('.status-badge--pro .status-badge__shell');
      if (proShell) {
        const t = gsap.fromTo(proShell, 
          {
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.1), inset 0 0 8px rgba(99, 102, 241, 0.04)',
            borderColor: 'rgba(139, 92, 246, 0.25)'
          },
          {
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.25), inset 0 0 14px rgba(99, 102, 241, 0.1)',
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
      const trialDot = this.el.nativeElement.querySelector('.status-badge--trial .status-badge__dot--trial');
      if (trialDot) {
        const t = gsap.fromTo(trialDot,
          { scale: 0.9, opacity: 0.65 },
          { scale: 1.4, opacity: 1, duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut' }
        );
        this.ambientTweens.push(t);
      }
    }, 150);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (window.innerWidth >= 992) {
      this.expandSidebar();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (window.innerWidth >= 992) {
      this.collapseSidebar();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const isDesktop = window.innerWidth >= 992;
    const sidebarEl = this.el.nativeElement.querySelector('.sidebar-master');
    const overlayEl = this.el.nativeElement.querySelector('.sidebar-overlay');
    const animElements = this.el.nativeElement.querySelectorAll(
      '.brand-text, .nav-label, .profile-name, .status-badge__body'
    );

    if (isDesktop) {
      // Clean mobile style overrides
      if (sidebarEl) {
        gsap.set(sidebarEl, { clearProps: 'transform,x,xPercent' });
      }
      if (overlayEl) {
        gsap.set(overlayEl, { clearProps: 'opacity,pointer-events' });
      }
      
      // Hide labels on desktop collapsed layout initially
      if (animElements.length) {
        gsap.set(animElements, { display: 'none', opacity: 0, x: -12 });
      }
    } else {
      // Clean desktop style overrides
      if (sidebarEl) {
        gsap.set(sidebarEl, { clearProps: 'width' });
      }
      if (animElements.length) {
        gsap.set(animElements, { clearProps: 'opacity,x,display' });
      }
      // Re-trigger mobile drawer styles on resize to prevent visual glitches
      this.animateMobileDrawer(this.isMobileDrawerOpen);
    }
  }

  private animateMobileDrawer(isOpen: boolean): void {
    const isMobile = window.innerWidth < 992;
    if (!isMobile) return;

    const sidebarEl = this.el.nativeElement.querySelector('.sidebar-master');
    const overlayEl = this.el.nativeElement.querySelector('.sidebar-overlay');

    if (isOpen) {
      // Open Mobile Drawer
      if (overlayEl) {
        gsap.to(overlayEl, { 
          opacity: 1, 
          pointerEvents: 'auto', 
          duration: 0.35, 
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }

      if (sidebarEl) {
        gsap.to(sidebarEl, { 
          x: '0%', 
          duration: 0.4, 
          ease: 'power3.out', 
          overwrite: 'auto' 
        });
        
        // Stagger animate navigation links
        const navLinks = this.el.nativeElement.querySelectorAll('.nav-item-wrapper');
        if (navLinks.length) {
          gsap.fromTo(navLinks,
            { x: -20, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.3, stagger: 0.03, ease: 'power2.out', delay: 0.1 }
          );
        }
      }
    } else {
      // Close Mobile Drawer
      if (sidebarEl) {
        gsap.to(sidebarEl, {
          x: '-100%',
          duration: 0.3,
          ease: 'power3.in',
          overwrite: 'auto'
        });
      }
      
      if (overlayEl) {
        gsap.to(overlayEl, {
          opacity: 0,
          pointerEvents: 'none',
          duration: 0.25,
          ease: 'power2.in',
          overwrite: 'auto'
        });
      }
    }
  }

  private expandSidebar(): void {
    const sidebarEl = this.el.nativeElement.querySelector('.sidebar-master');
    const animElements = this.el.nativeElement.querySelectorAll(
      '.brand-text, .nav-label, .profile-name, .status-badge__body'
    );

    if (sidebarEl) {
      gsap.to(sidebarEl, {
        width: 260,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }

    if (animElements.length) {
      gsap.set(animElements, { display: (i: number, el: Element) => {
        if (el.classList.contains('brand-text') || el.classList.contains('profile-name')) {
          return 'inline';
        }
        if (el.classList.contains('status-badge__body')) {
          return 'flex';
        }
        return 'inline-block';
      }});

      gsap.to(animElements, {
        opacity: 1,
        x: 0,
        duration: 0.3,
        stagger: 0.02,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  private collapseSidebar(): void {
    const sidebarEl = this.el.nativeElement.querySelector('.sidebar-master');
    const animElements = this.el.nativeElement.querySelectorAll(
      '.brand-text, .nav-label, .profile-name, .status-badge__body'
    );

    if (sidebarEl) {
      gsap.to(sidebarEl, {
        width: 80,
        duration: 0.3,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
    }

    if (animElements.length) {
      gsap.to(animElements, {
        opacity: 0,
        x: -12,
        duration: 0.2,
        ease: 'power2.in',
        overwrite: 'auto',
        onComplete: () => {
          gsap.set(animElements, { display: 'none' });
        }
      });
    }
  }

  private updateActiveRoute(url: string): void {
    if (url.includes('home/masterhome')) {
      this.activeRoute = 'dashboard';
    } else if (url.includes('home/activeprojects')) {
      this.activeRoute = 'activeproject';
    } else if (url.includes('home/completedprojects')) {
      this.activeRoute = 'completed';
    } else if (url.includes('home/notifications')) {
      this.activeRoute = 'notifications';
    } else if (url.includes('auth/developersettings')) {
      this.activeRoute = 'developersettings';
    } else if (url.includes('teams/my-teams')) {
      this.activeRoute = 'my-teams';
    } else if (url.includes('teams/teamleaderboard')) {
      this.activeRoute = 'teams';
    } else if (url.includes('teams/invitations')) {
      this.activeRoute = 'invitations';
    } else if (url.includes('feedback/wall') || url.includes('/feedback')) {
      if (url.includes('feedback/admin')) {
        this.activeRoute = 'feedback-admin';
      } else {
        this.activeRoute = 'feedbacks';
      }
    } else if (url.includes('github/dashboard')) {
      this.activeRoute = 'github';
    }
  }

  navigate(route: string): void {
    console.log('Sidebar navigate called with route:', route);
    this.activeRoute = route;
    this.sidebarService.close();

    // التوجيهات الحالية + الجديدة
    if (route === 'dashboard') this.router.navigate(['home/masterhome']);
    if (route === 'activeproject') this.router.navigate(['home/activeprojects']);
    if (route === 'completed') this.router.navigate(['home/completedprojects']);
    if (route === 'notifications') this.router.navigate(['home/notifications']);
    if (route === 'developersettings') this.router.navigate(['auth/developersettings']);

    // مسارات الـ Teams الجديدة
    if (route === 'my-teams') this.router.navigate(['teams/my-teams']);
    if (route === 'teams') this.router.navigate(['teams/teamleaderboard']);
    if (route === 'invitations') this.router.navigate(['teams/invitations']);

    // مسارات الـ Feedbacks
    if (route === 'feedbacks') {
      console.log('Handling feedbacks route. CurrentUser is:', this.currentUser);
      if (this.currentUser && this.currentUser._id) {
        console.log('Navigating to wall:', ['/feedback/wall', this.currentUser._id]);
        this.router.navigate(['/feedback/wall', this.currentUser._id]).then(success => {
          console.log('Navigation to wall success:', success);
        }).catch(err => console.error('Navigation error:', err));
      } else {
        console.warn('currentUser or _id is missing, falling back to /feedback (My Feedbacks).');
        this.router.navigate(['/feedback']).then(success => {
          console.log('Navigation to /feedback success:', success);
        }).catch(err => console.error('Navigation error:', err));
      }
    }
    if (route === 'feedback-admin') {
      this.router.navigate(['/feedback/admin/stats']);
    }
    if (route === 'github') {
      this.router.navigate(['/github/dashboard']);
    }
  }

  gotodashboard() { this.navigate('dashboard'); }
  gotoallactiveprojects() { this.navigate('activeproject'); }
  gotocompletedProjects() { this.navigate('completed'); }
  gotoDeveloperSettings() { this.navigate('developersettings'); }

  /**
   * Triggers the real ARIA 3-Agent onboarding pipeline.
   *
   * Identity resolution order (most reliable → fallback):
   *   1. this.currentUser._id  (live BehaviorSubject)
   *   2. sessionStorage 'developerProfile'._id  (persisted across refreshes)
   *
   * Permission model:
   *   - Self-onboarding : any authenticated developer
   *   - Admin trigger   : admin/lead triggering for a team memberId passed via input
   *     (extend via @Input() targetMemberId for team-trigger flow)
   */
  triggerAriaDemo(targetMemberId?: string): void {
    if (this.isAriaLoading) return;

    // ── 1. Identity resolution ──────────────────────────────────────────────
    let memberId: string | undefined =
      targetMemberId               // Admin triggering for a team member
      ?? this.currentUser?._id     // Self: live observable value
      ?? (this.currentUser as any)?.id; // In case backend returns 'id' instead of '_id'

    // Fallback: read directly from storage (handles page-refresh edge case)
    if (!memberId) {
      try {
        let raw = sessionStorage.getItem('developerProfile');
        if (!raw) raw = localStorage.getItem('user'); // Fallback to localStorage since login.component stores it there

        if (raw) {
          const parsed = JSON.parse(raw);
          memberId = parsed._id || parsed.id;
        }
      } catch {
        // Corrupted storage — will be caught by the guard below
      }
    }

    // ── 2. Null-safety guard ────────────────────────────────────────────────
    if (!memberId) {
      this.showToast('error', 'Session Error',
        'Could not identify the current developer. Please log in again.');
      return;
    }

    // ── 3. Permission check (self vs. admin trigger) ────────────────────────
    const isSelfTrigger = !targetMemberId;
    const isAdmin = this.currentUser?.role === 'admin';

    if (!isSelfTrigger && !isAdmin) {
      this.showToast('warning', 'Access Denied',
        'Only admins can trigger ARIA onboarding for a team member.');
      return;
    }

    // ── 4. Fetch project → call sync pipeline ──────────────────────────────
    this.isAriaLoading = true;

    this.projectService.getAllProjects(0).pipe(
      switchMap(res => {
        const projectsList = Array.isArray(res.Projects)
          ? res.Projects
          : (res.Projects && Array.isArray((res.Projects as any).projects) ? (res.Projects as any).projects : []);
        const project =
          projectsList.find((p: any) => p.status === 'active' && !p.isArchived)
          ?? projectsList[0];

        if (!project?._id) throw Object.assign(new Error('NO_PROJECTS'), { internal: true });

        console.log(`[ARIA] Triggering sync → project: ${project.name} | member: ${memberId}`);
        // NOTE: backend expects { projectId, memberId } — NOT developerId
        return this.onboardingService.triggerSync(project._id, memberId!);
      })
    ).subscribe({
      next: (res: any) => {
        this.isAriaLoading = false;
        console.log('[ARIA] Backend Response:', res); // Log for debugging

        // Aggressive payload extraction (handles various backend response structures)
        let payload: any = null;
        if (res?.data && res.data.subject) payload = res.data;
        else if (res?.onboardingMessage && res.onboardingMessage.subject) payload = res.onboardingMessage;
        else if (res?.messageData && res.messageData.subject) payload = res.messageData;
        else if (res?.data?.onboardingMessage) payload = res.data.onboardingMessage;
        else if (res?.subject && res?.greeting) payload = res; // If flat
        else if (res?.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) payload = res.data;

        if (payload) {
          // Sync pipeline: Data arrived instantly
          this.onboardingService.pushMessage(payload);
        } else if (res?.success || res?.message?.toLowerCase().includes('successfully')) {
          // Async pipeline: Backend started it successfully but data will arrive via Socket
          this.showToast('info', 'ARIA Processing', res?.message || 'Analyzing project... The modal will appear shortly via Socket.');
        } else {
          // True failure
          this.showToast('warning', 'ARIA Warning', res?.message ?? 'Pipeline ran but returned no data.');
        }
      },
      error: (err) => {
        this.isAriaLoading = false;
        const msg = err?.internal
          ? 'No active project found. Create a project first.'
          : (err?.error?.message ?? err?.message ?? 'The ARIA pipeline encountered an error.');
        this.showToast('error', 'ARIA Error', msg);
      }
    });
  }

  // ── Shared Swal toast helper ──────────────────────────────────────────────
  private showToast(icon: 'success' | 'error' | 'warning' | 'info', title: string, text: string): void {
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 4500,
      timerProgressBar: true,
      icon,
      title,
      text,
      background: 'rgba(10, 14, 26, 0.92)',
      color: '#f1f5f9',
      didOpen: (el) => {
        el.style.backdropFilter = 'blur(12px)';
        el.style.borderRadius = '12px';
        el.style.border = '1px solid rgba(255,255,255,0.1)';
        el.style.marginBottom = '20px';
      }
    });
  }
}