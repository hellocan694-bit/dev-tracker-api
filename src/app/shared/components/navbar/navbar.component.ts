import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';
import { GithubService } from 'src/app/core/services/github.service';
import { TrialStatus } from 'src/app/shared/interfaces/github';
import { Subscription } from 'rxjs';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;

  // Pro/Premium status
  trialStatus: TrialStatus | null = null;
  get isPro(): boolean { return this.trialStatus?.isPro ?? false; }
  get isPremium(): boolean { return this.trialStatus?.isPremium ?? false; }
  get daysRemaining(): number | null { return this.trialStatus?.daysRemaining ?? null; }

  private authSub?: Subscription;
  private trialSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    public sidebarService: SidebarService,
    private githubService: GithubService
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
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.trialSub?.unsubscribe();
  }

  toggleMenu() {
    this.sidebarService.toggle();
  }

  gotopremium() {
    this.router.navigate(['subscriptions/pricing']);
  }

  /**
   * FIX #1 — Auth Bypass resolved.
   * Calls the backend /auth/logout endpoint first to invalidate the
   * HttpOnly JWT cookie server-side, then clears all local state.
   * Falls back to local-only cleanup if the network call fails so the
   * user is never stuck on a broken auth state.
   */
  logout() {
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
