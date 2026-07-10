import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { gsap } from 'gsap';
import { FeedbackService } from '../../services/feedback.service';
import { ToastService } from 'src/app/core/services/toast.service';
import { FeedbackType, FeedbackStatus, FeedbackRating } from 'src/app/shared/interfaces/feedback';

@Component({
  selector: 'app-admin-stats',
  templateUrl: './admin-stats.component.html',
  styleUrls: ['./admin-stats.component.scss'],
})
export class AdminStatsComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  totalCount: number | null = null;

  typeCounts: Record<FeedbackType, number | null> = {
    bug: null, feature_request: null, general: null, improvement: null,
  };
  statusCounts: Record<FeedbackStatus, number | null> = {
    pending: null, under_review: null, resolved: null, closed: null,
  };
  ratingCounts: Record<string, number | null> = {
    '1': null, '2': null, '3': null, '4': null, '5': null
  };

  readonly types: FeedbackType[]   = ['bug', 'feature_request', 'general', 'improvement'];
  readonly statuses: FeedbackStatus[] = ['pending', 'under_review', 'resolved', 'closed'];
  readonly ratings: FeedbackRating[]  = [1, 2, 3, 4, 5];

  readonly typeLabels: Record<FeedbackType, string> = {
    bug: '🐛 Bug', feature_request: '✨ Feature', general: '💬 General', improvement: '🔧 Improvement',
  };
  readonly statusLabels: Record<FeedbackStatus, string> = {
    pending: 'Pending', under_review: 'Under Review', resolved: 'Resolved', closed: 'Closed',
  };
  readonly statusColors: Record<FeedbackStatus, string> = {
    pending: '#f59e0b', under_review: '#3b82f6', resolved: '#10b981', closed: '#6b7280',
  };

  constructor(
    private feedbackService: FeedbackService,
    private toast: ToastService
  ) {}

  ngOnInit(): void { this.loadAllStats(); }

  ngAfterViewInit(): void {
    // Agent 3 — Stagger stat cards on load
    setTimeout(() => {
      gsap.fromTo(
        '.stat-card',
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(1.3)' }
      );
      gsap.from('.hero-count', { y: 20, opacity: 0, duration: 0.6, ease: 'back.out(1.4)' });
    }, 150);
  }

  loadAllStats(): void {
    this.isLoading = true;

    this.feedbackService.adminCount().pipe(takeUntil(this.destroy$)).subscribe({
      next: res => { this.totalCount = res.data.count; },
      error: () => this.toast.error('Failed to load total count'),
    });

    this.types.forEach(type => {
      this.feedbackService.adminCountByType(type).pipe(takeUntil(this.destroy$)).subscribe({
        next: res => { this.typeCounts[type] = res.data.count; },
      });
    });

    this.statuses.forEach(status => {
      this.feedbackService.adminCountByStatus(status).pipe(takeUntil(this.destroy$)).subscribe({
        next: res => { this.statusCounts[status] = res.data.count; },
      });
    });

    this.ratings.forEach(rating => {
      this.feedbackService.adminCountByRating(rating).pipe(takeUntil(this.destroy$)).subscribe({
        next: res => { this.ratingCounts[String(rating)] = res.data.count; },
      });
    });

    this.isLoading = false;
  }

  getStatusColor(status: FeedbackStatus): string { return this.statusColors[status]; }

  getRatingBar(rating: FeedbackRating): number {
    const val = this.ratingCounts[String(rating)] ?? 0;
    const max = Math.max(...this.ratings.map(r => this.ratingCounts[String(r)] ?? 0));
    return max > 0 ? (val / max) * 100 : 0;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
