import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FeedbackService } from '../../services/feedback.service';
import { FeedbackStateService } from '../../services/feedback-state.service';
import { ToastService } from 'src/app/core/services/toast.service';
import {
  Feedback, PublicFeedback, FeedbackStatus, FeedbackType, FeedbackRating
} from 'src/app/shared/interfaces/feedback';
import { Developer } from 'src/app/shared/interfaces/developer';
import Swal from 'sweetalert2';
import { gsap } from 'gsap';

type ViewMode = 'my' | 'wall';

@Component({
  selector: 'app-feedback-list',
  templateUrl: './feedback-list.component.html',
  styleUrls: ['./feedback-list.component.scss'],
})
export class FeedbackListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fbGrid', { static: false }) fbGridRef?: ElementRef;

  private destroy$ = new Subject<void>();

  currentUser: Developer | null = null;
  feedbacks: Feedback[] = [];
  publicFeedbacks: PublicFeedback[] = [];
  isLoading = true;
  error: string | null = null;

  viewMode: ViewMode = 'my';
  wallDeveloperId: string | null = null;
  isPublicView = false;

  // Filter state
  activeStatus: FeedbackStatus | null = null;
  activeType: FeedbackType | null = null;
  activeRating: FeedbackRating | null = null;

  readonly statuses: FeedbackStatus[] = ['pending', 'under_review', 'resolved', 'closed'];
  readonly types: FeedbackType[] = ['bug', 'feature_request', 'general', 'improvement'];
  readonly ratings: FeedbackRating[] = [1, 2, 3, 4, 5];

  readonly statusLabels: Record<FeedbackStatus, string> = {
    pending: 'Pending',
    under_review: 'Under Review',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  readonly typeLabels: Record<FeedbackType, string> = {
    bug: '🐛 Bug',
    feature_request: '✨ Feature',
    general: '💬 General',
    improvement: '🔧 Improvement',
  };

  constructor(
    private feedbackService: FeedbackService,
    private stateService: FeedbackStateService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.stateService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('developerId');
      this.wallDeveloperId = id;
      this.viewMode = id ? 'wall' : 'my';
      this.loadFeedbacks();
    });
  }

  ngAfterViewInit(): void {
    // Agent 3 — Animate background blobs with GSAP (position:fixed keeps them visible on scroll)
    gsap.to('.blob-1', {
      y: 50, x: -25, duration: 7, yoyo: true, repeat: -1,
      ease: 'sine.inOut', force3D: true
    });
    gsap.to('.blob-2', {
      y: -50, x: 35, duration: 9, yoyo: true, repeat: -1,
      ease: 'sine.inOut', force3D: true
    });

    // Agent 3 — Pulse animation on the "New Feedback" button using GSAP (CSS handles the main pulse,
    // GSAP adds the entry scale on first render)
    gsap.from('.btn-primary', {
      scale: 0.85, opacity: 0, duration: 0.6, ease: 'back.out(2)', delay: 0.2
    });
  }

  // ── Data Loading ──────────────────────────────────────────────────────────
  loadFeedbacks(): void {
    this.isLoading = true;
    this.error = null;
    this.feedbacks = [];
    this.publicFeedbacks = [];

    let req$;

    if (this.viewMode === 'my') {
      if (this.activeStatus) {
        req$ = this.feedbackService.filterByStatus(this.activeStatus);
      } else if (this.activeType) {
        req$ = this.feedbackService.filterByType(this.activeType);
      } else if (this.activeRating) {
        req$ = this.feedbackService.filterByRating(this.activeRating);
      } else {
        req$ = this.feedbackService.getMyFeedbacks();
      }

      req$.pipe(takeUntil(this.destroy$)).subscribe({
        next: res => {
          this.feedbacks = res.data.feedbacks as Feedback[];
          this.isLoading = false;
          this.animateCards();
        },
        error: err => this.handleError(err),
      });
    } else if (this.wallDeveloperId) {
      this.feedbackService.getDeveloperWall(this.wallDeveloperId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            const items = res.data.feedbacks;
            if (items.length > 0 && !('_id' in items[0])) {
              this.isPublicView = true;
              this.publicFeedbacks = items as PublicFeedback[];
            } else {
              this.isPublicView = false;
              this.feedbacks = items as Feedback[];
            }
            this.isLoading = false;
            this.animateCards();
          },
          error: err => this.handleError(err),
        });
    }
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  applyFilter(type: 'status' | 'type' | 'rating', value: any): void {
    this.activeStatus = type === 'status' ? value : null;
    this.activeType   = type === 'type'   ? value : null;
    this.activeRating = type === 'rating' ? value : null;
    gsap.to('.fb-grid', {
      opacity: 0, scale: 0.98, duration: 0.18,
      onComplete: () => { this.loadFeedbacks(); }
    });
  }

  clearFilters(): void {
    this.activeStatus = null;
    this.activeType   = null;
    this.activeRating = null;
    gsap.to('.fb-grid', {
      opacity: 0, scale: 0.98, duration: 0.18,
      onComplete: () => { this.loadFeedbacks(); }
    });
  }

  // ── Card Actions ──────────────────────────────────────────────────────────
  navigateToEdit(id: string): void {
    this.router.navigate(['/feedback/edit', id]);
  }

  deleteFeedback(id: string): void {
    Swal.fire({
      title: 'Delete this feedback?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1c2130',
      confirmButtonText: 'Yes, delete',
      background: '#141720',
      color: '#e2e8f0',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.feedbackService.remove(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          gsap.to(`#fb-card-${id}`, {
            scale: 0.9, opacity: 0, y: -10, duration: 0.35, ease: 'back.in(1.2)',
            onComplete: () => {
              this.toast.success('Feedback deleted successfully.');
              this.loadFeedbacks();
            }
          });
        },
        error: err => this.handleError(err),
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  canManageFeedback(feedback: any): boolean {
    if (!this.currentUser) return false;
    const userId = String(this.currentUser._id || (this.currentUser as any).id);
    const devId = typeof feedback.developer === 'object'
      ? String(feedback.developer._id || feedback.developer.id)
      : String(feedback.developer);
    return this.currentUser.role === 'admin' || devId === userId;
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  // ── GSAP: Staggered Card Entrance (Agent 3) ────────────────────────────
  private animateCards(): void {
    setTimeout(() => {
      gsap.set('.fb-grid', { opacity: 1, scale: 1 });
      gsap.fromTo(
        '.fb-card',
        { y: 35, opacity: 0, scale: 0.94 },
        {
          y: 0, opacity: 1, scale: 1,
          duration: 0.5, stagger: 0.07,
          ease: 'back.out(1.3)', force3D: true,
          clearProps: 'all'
        }
      );
    }, 20);
  }

  // ── GSAP: Card hover micro-interactions (Agent 3) ─────────────────────
  onCardEnter(event: MouseEvent): void {
    gsap.to(event.currentTarget, {
      y: -6, scale: 1.02,
      boxShadow: '0 20px 50px rgba(99,102,241,0.22)',
      duration: 0.3, ease: 'power2.out', force3D: true
    });
  }

  onCardLeave(event: MouseEvent): void {
    gsap.to(event.currentTarget, {
      y: 0, scale: 1,
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      duration: 0.3, ease: 'power2.out', clearProps: 'all'
    });
  }

  onIconEnter(event: MouseEvent): void {
    gsap.to(event.currentTarget, { scale: 1.18, rotation: -8, duration: 0.25, ease: 'back.out(2)' });
  }
  onIconLeave(event: MouseEvent): void {
    gsap.to(event.currentTarget, { scale: 1, rotation: 0, duration: 0.25, ease: 'power2.out', clearProps: 'all' });
  }

  // ── Error handling — Agent 1: maps 403/400 to semantic toasts ─────────
  private handleError(err: any): void {
    this.isLoading = false;
    const status  = err?.status;
    const message = err?.error?.message || 'Something went wrong.';

    if (status === 403) {
      this.toast.error(`🔒 Unauthorized: ${message}`);
    } else if (status === 400) {
      this.toast.warning(`⚠️ Bad request: ${message}`);
    } else if (status === 401) {
      this.toast.error('Session expired. Please log in again.');
      this.router.navigate(['/auth']);
    } else {
      this.toast.error(message);
    }
    this.error = message;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
