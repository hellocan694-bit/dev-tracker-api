import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GithubService } from 'src/app/core/services/github.service';
import { TrialStatus } from 'src/app/shared/interfaces/github';
import gsap from 'gsap';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trial-banner.component.html',
  styleUrls: ['./trial-banner.component.scss']
})
export class TrialBannerComponent implements OnInit, OnDestroy {
  @ViewChild('bannerEl', { static: false }) bannerEl!: ElementRef;

  trialStatus: TrialStatus | null = null;
  isVisible = false;
  progressPercent = 0;

  private sub?: Subscription;

  constructor(private githubService: GithubService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.githubService.getTrialStatus().subscribe({
      next: (status) => {
        this.trialStatus = status;
        // Show banner only during an active trial (not for paid Pro subscribers)
        this.isVisible = status.active && !status.isPro;
        this.progressPercent = status.daysRemaining != null
          ? Math.round((status.daysRemaining / 30) * 100)
          : 100; // premium/unlimited — treat as full

        if (this.isVisible) {
          // Allow one tick for the DOM to render before animating
          setTimeout(() => this.animateIn(), 50);
        }
      },
      error: () => {
        // Silently hide if trial status can't be fetched (unauthenticated routes)
        this.isVisible = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private animateIn(): void {
    if (!this.bannerEl?.nativeElement) return;
    gsap.fromTo(
      this.bannerEl.nativeElement,
      { y: -60, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.7)' }
    );
  }

  goToPricing(): void {
    this.router.navigate(['/subscriptions/pricing']);
  }

  get urgencyClass(): string {
    if (!this.trialStatus) return '';
    const d = this.trialStatus.daysRemaining;
    if (d == null) return '';  // premium/unlimited — no urgency
    if (d <= 3) return 'urgent';
    if (d <= 7) return 'warning';
    return '';
  }
}
