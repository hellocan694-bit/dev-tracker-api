import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { OnboardingService } from 'src/app/core/services/onboarding.service';
import { ProjectService } from 'src/app/core/services/project.service';
import { GithubService } from 'src/app/core/services/github.service';
import { Developer } from 'src/app/shared/interfaces/developer';
import { TrialStatus } from 'src/app/shared/interfaces/github';
import { BehaviorSubject, Subscription, switchMap } from 'rxjs';
import { TrialBannerComponent } from 'src/app/shared/components/trial-banner/trial-banner.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, TrialBannerComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  activeRoute = 'dashboard';
  currentUser: Developer | null = null;
  isAdmin = false;
  private authSub?: Subscription;
  private trialSub?: Subscription;

  // Pro widget state
  trialStatus: TrialStatus | null = null;
  get isPro(): boolean { return this.trialStatus?.isPro ?? false; }
  get isPremium(): boolean { return this.trialStatus?.isPremium ?? false; }
  get daysRemaining(): number | null { return this.trialStatus?.daysRemaining ?? null; }

  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  isAriaLoading = false;

  constructor(
    private router: Router,
    public sidebarService: SidebarService,
    private authService: AuthService,
    private onboardingService: OnboardingService,
    private projectService: ProjectService,
    private githubService: GithubService
  ) { }

  toggle() {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  close() {
    this.isOpenSubject.next(false);
  }

  ngOnInit(): void {
    this.authSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
    });

    // Subscribe to trial/Pro status for the sidebar Pro widget
    this.trialSub = this.githubService.getTrialStatus().subscribe({
      next: status => { this.trialStatus = status; },
      error: () => { this.trialStatus = null; }
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.trialSub?.unsubscribe();
  }

  navigate(route: string): void {
    console.log('Sidebar navigate called with route:', route);
    this.activeRoute = route;
    this.sidebarService.close();

    // التوجيهات الحالية + الجديدة
    if (route === 'dashboard') this.router.navigate(['home/masterhome']);
    if (route === 'activeproject') this.router.navigate(['home/activeprojects']);
    if (route === 'completed') this.router.navigate(['home/completedprojects']);
    if (route === 'developersettings') this.router.navigate(['auth/developersettings']);

    // مسارات الـ Teams الجديدة
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